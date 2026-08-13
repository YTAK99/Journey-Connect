package com.jc.backend.intelligence.contentanalysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class PostContentAnalysisPersistenceIntegrationTest {

    private static final Instant BASE_TIME = Instant.parse("2026-08-07T08:00:00Z");

    @Autowired private PostContentAnalysisJobStore jobs;
    @Autowired private PostContentAnalysisInputSnapshotStore inputs;
    @Autowired private PostContentAnalysisResultStore results;
    @Autowired private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanContentAnalysisTables() {
        jdbcTemplate.execute("""
                truncate table
                    public.post_content_analysis_result,
                    public.post_content_analysis_attempt,
                    public.post_content_analysis_job,
                    public.post_content_analysis_input_snapshot
                cascade
                """);
    }

    @Test
    void concurrentEnqueueConvergesToOneDedupeJob() throws Exception {
        long postId = randomPostId();
        String version = "content-" + UUID.randomUUID();
        PostContentAnalysisInputV1 input = input(postId, version, "Concurrent input");
        int workers = 8;

        ExecutorService executor = Executors.newFixedThreadPool(workers);
        CountDownLatch ready = new CountDownLatch(workers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<PostContentAnalysisJob>> futures = new ArrayList<>();

        try {
            for (int index = 0; index < workers; index++) {
                String runId = "analysis:" + UUID.randomUUID();
                PostContentAnalysisJobService service = new PostContentAnalysisJobService(
                        new PostContentAnalysisValidator(),
                        jobs,
                        inputs,
                        Clock.fixed(BASE_TIME, ZoneOffset.UTC),
                        () -> runId);
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    return service.enqueue(input);
                }));
            }

            ready.await();
            start.countDown();

            Set<String> runIds = futures.stream()
                    .map(PostContentAnalysisPersistenceIntegrationTest::get)
                    .map(PostContentAnalysisJob::analysisRunId)
                    .collect(Collectors.toSet());

            assertThat(runIds).hasSize(1);
            Integer jobCount = jdbcTemplate.queryForObject(
                    """
                    select count(*)
                    from public.post_content_analysis_job
                    where post_id = ? and source_content_version = ?
                    """,
                    Integer.class,
                    postId,
                    version);
            assertThat(jobCount).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void snapshotVersionCollisionIsRejected() {
        long postId = randomPostId();
        String version = "content-" + UUID.randomUUID();

        inputs.saveIfAbsent(input(postId, version, "Original title"));

        assertThatThrownBy(() -> inputs.saveIfAbsent(input(postId, version, "Different title")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("sourceContentVersion collision");
    }

    @Test
    void claimAttemptAndResultRoundTripArePersisted() {
        long postId = randomPostId();
        String version = "content-" + UUID.randomUUID();
        String runId = "analysis:" + UUID.randomUUID();
        PostContentAnalysisInputV1 input = input(postId, version, "Persistence test");
        PostContentAnalysisJobService service = new PostContentAnalysisJobService(
                new PostContentAnalysisValidator(),
                jobs,
                inputs,
                Clock.fixed(BASE_TIME, ZoneOffset.UTC),
                () -> runId);

        PostContentAnalysisJob queued = service.enqueue(input);
        PostContentAnalysisJob running = jobs.claimNextReady(BASE_TIME).orElseThrow();

        assertThat(running.analysisRunId()).isEqualTo(queued.analysisRunId());
        assertThat(running.status()).isEqualTo(AnalysisStatus.RUNNING);
        assertThat(running.attemptCount()).isEqualTo(1);
        assertThat(jobs.claimNextReady(BASE_TIME)).isEmpty();

        PostContentAnalysisResultV1 result = new PostContentAnalysisResultV1(
                runId,
                PostContentAnalysisResultV1.SCHEMA_VERSION,
                version,
                "en",
                "gemini-3.6-flash",
                PostContentAnalysisJobService.PROMPT_VERSION,
                AnalysisStatus.SUCCEEDED,
                "A travel post about walking through Seoul Forest and visiting a nearby cafe.",
                List.of(ContentTheme.CAFE, ContentTheme.LOCAL_EXPERIENCE),
                List.of(TravelStyle.WALKING, TravelStyle.SHORT_TRIP),
                List.of("seoul-forest", "cafe"),
                List.of(new PlaceMentionCandidate("Seoul Forest", "Seoul Forest", 0.98)),
                0.94,
                BASE_TIME.plusSeconds(1));

        new PostContentAnalysisValidator().validateResult(result, input);
        results.append(result);
        results.append(result);
        jobs.save(running.markSucceeded(BASE_TIME.plusSeconds(1)));

        PostContentAnalysisResultV1 persisted = results.findByAnalysisRunId(runId).orElseThrow();
        assertThat(persisted.summary()).isEqualTo(result.summary());
        assertThat(persisted.themes()).containsExactlyElementsOf(result.themes());
        assertThat(persisted.travelStyles()).containsExactlyElementsOf(result.travelStyles());
        assertThat(persisted.placeMentions()).containsExactlyElementsOf(result.placeMentions());

        Integer attemptCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from public.post_content_analysis_attempt
                where analysis_run_id = ? and attempt_number = 1 and outcome = 'succeeded'
                """,
                Integer.class,
                runId);
        assertThat(attemptCount).isEqualTo(1);
    }

    private static PostContentAnalysisInputV1 input(
            long postId,
            String version,
            String title) {
        return new PostContentAnalysisInputV1(
                postId,
                title,
                "I walked through Seoul Forest and stopped at a cafe nearby.",
                "Seoul",
                List.of("seoul-forest", "cafe"),
                version);
    }

    private static long randomPostId() {
        return ThreadLocalRandom.current().nextLong(1L, Long.MAX_VALUE);
    }

    private static PostContentAnalysisJob get(Future<PostContentAnalysisJob> future) {
        try {
            return future.get();
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }
}
