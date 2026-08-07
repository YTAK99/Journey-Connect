package com.jc.backend.intelligence.contentanalysis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class PostContentAnalysisJobWorkerTest {

    private static final String RUN_ID_1 = "analysis:00000000-0000-0000-0000-000000000001";
    private static final String RUN_ID_2 = "analysis:00000000-0000-0000-0000-000000000002";
    private static final Instant BASE_TIME = Instant.parse("2026-08-07T02:00:00Z");

    @Test
    void enqueueIsIdempotentForSameDedupeKey() {
        MutableClock clock = new MutableClock(BASE_TIME);
        InMemoryJobStore jobs = new InMemoryJobStore();
        InMemoryInputStore inputs = new InMemoryInputStore();
        AtomicInteger ids = new AtomicInteger();
        PostContentAnalysisJobService service = new PostContentAnalysisJobService(
                new PostContentAnalysisValidator(),
                jobs,
                inputs,
                clock,
                () -> ids.getAndIncrement() == 0 ? RUN_ID_1 : RUN_ID_2);

        PostContentAnalysisInputV1 input = input("post-content-v1");
        PostContentAnalysisJob first = service.enqueue(input);
        PostContentAnalysisJob second = service.enqueue(input);

        assertEquals(RUN_ID_1, first.analysisRunId());
        assertEquals(first.analysisRunId(), second.analysisRunId());
        assertEquals(1, jobs.size());
        assertEquals(1, inputs.size());
    }

    @Test
    void changedSourceContentVersionCreatesNewJob() {
        MutableClock clock = new MutableClock(BASE_TIME);
        InMemoryJobStore jobs = new InMemoryJobStore();
        InMemoryInputStore inputs = new InMemoryInputStore();
        AtomicInteger ids = new AtomicInteger();
        PostContentAnalysisJobService service = new PostContentAnalysisJobService(
                new PostContentAnalysisValidator(),
                jobs,
                inputs,
                clock,
                () -> ids.getAndIncrement() == 0 ? RUN_ID_1 : RUN_ID_2);

        PostContentAnalysisJob first = service.enqueue(input("post-content-v1"));
        PostContentAnalysisJob second = service.enqueue(input("post-content-v2"));

        assertNotEquals(first.analysisRunId(), second.analysisRunId());
        assertEquals(2, jobs.size());
        assertEquals(2, inputs.size());
    }

    @Test
    void successfulRunAppendsResultAndMarksJobSucceeded() {
        MutableClock clock = new MutableClock(BASE_TIME);
        InMemoryJobStore jobs = new InMemoryJobStore();
        InMemoryInputStore inputs = new InMemoryInputStore();
        InMemoryResultStore results = new InMemoryResultStore();
        PostContentAnalysisJobService service = service(jobs, inputs, clock, RUN_ID_1);
        PostContentAnalysisJob job = service.enqueue(input("post-content-v1"));

        ContentAnalysisProvider provider = new FakeContentAnalysisProvider(
                source -> validResult(job.analysisRunId(), source.sourceContentVersion(), clock.instant()),
                new PostContentAnalysisValidator());
        PostContentAnalysisWorker worker = worker(jobs, inputs, results, provider, clock);

        assertTrue(worker.runOnce());
        PostContentAnalysisJob saved = jobs.findByRunId(job.analysisRunId()).orElseThrow();
        assertEquals(AnalysisStatus.SUCCEEDED, saved.status());
        assertEquals(1, saved.attemptCount());
        assertTrue(results.findByAnalysisRunId(job.analysisRunId()).isPresent());
        assertFalse(worker.runOnce());
    }

    @Test
    void validationFailureRetriesOnceThenQuarantines() {
        MutableClock clock = new MutableClock(BASE_TIME);
        InMemoryJobStore jobs = new InMemoryJobStore();
        InMemoryInputStore inputs = new InMemoryInputStore();
        InMemoryResultStore results = new InMemoryResultStore();
        PostContentAnalysisJobService service = service(jobs, inputs, clock, RUN_ID_1);
        PostContentAnalysisJob job = service.enqueue(input("post-content-v1"));

        ContentAnalysisProvider invalidProvider = new ContentAnalysisProvider() {
            @Override
            public String providerId() {
                return "invalid-test-provider";
            }

            @Override
            public PostContentAnalysisResultV1 analyze(PostContentAnalysisInputV1 source) {
                return invalidResult(job.analysisRunId(), source.sourceContentVersion(), clock.instant());
            }
        };
        PostContentAnalysisWorker worker = worker(jobs, inputs, results, invalidProvider, clock);

        assertTrue(worker.runOnce());
        PostContentAnalysisJob retry = jobs.findByRunId(job.analysisRunId()).orElseThrow();
        assertEquals(AnalysisStatus.QUEUED, retry.status());
        assertEquals(1, retry.attemptCount());
        assertEquals(BASE_TIME.plusSeconds(30), retry.nextAttemptAt());
        assertFalse(worker.runOnce());

        clock.advance(Duration.ofSeconds(30));
        assertTrue(worker.runOnce());
        PostContentAnalysisJob quarantined = jobs.findByRunId(job.analysisRunId()).orElseThrow();
        assertEquals(AnalysisStatus.QUARANTINED, quarantined.status());
        assertEquals(2, quarantined.attemptCount());
        assertEquals("output_validation_failed", quarantined.lastErrorCode());
        assertEquals(0, results.size());
    }

    @Test
    void providerFailureUsesBackoffAndFailsAfterThirdAttempt() {
        MutableClock clock = new MutableClock(BASE_TIME);
        InMemoryJobStore jobs = new InMemoryJobStore();
        InMemoryInputStore inputs = new InMemoryInputStore();
        InMemoryResultStore results = new InMemoryResultStore();
        PostContentAnalysisJobService service = service(jobs, inputs, clock, RUN_ID_1);
        PostContentAnalysisJob job = service.enqueue(input("post-content-v1"));

        ContentAnalysisProvider failingProvider = new ContentAnalysisProvider() {
            @Override
            public String providerId() {
                return "failing-test-provider";
            }

            @Override
            public PostContentAnalysisResultV1 analyze(PostContentAnalysisInputV1 source) {
                throw new IllegalStateException("provider unavailable");
            }
        };
        PostContentAnalysisWorker worker = worker(jobs, inputs, results, failingProvider, clock);

        assertTrue(worker.runOnce());
        PostContentAnalysisJob firstRetry = jobs.findByRunId(job.analysisRunId()).orElseThrow();
        assertEquals(BASE_TIME.plusSeconds(30), firstRetry.nextAttemptAt());

        clock.advance(Duration.ofSeconds(30));
        assertTrue(worker.runOnce());
        PostContentAnalysisJob secondRetry = jobs.findByRunId(job.analysisRunId()).orElseThrow();
        assertEquals(BASE_TIME.plusSeconds(90), secondRetry.nextAttemptAt());

        clock.advance(Duration.ofSeconds(60));
        assertTrue(worker.runOnce());
        PostContentAnalysisJob failed = jobs.findByRunId(job.analysisRunId()).orElseThrow();
        assertEquals(AnalysisStatus.FAILED, failed.status());
        assertEquals(3, failed.attemptCount());
        assertEquals("provider_failure", failed.lastErrorCode());
        assertEquals(0, results.size());
    }

    @Test
    void missingInputSnapshotQuarantinesClaimedJob() {
        MutableClock clock = new MutableClock(BASE_TIME);
        InMemoryJobStore jobs = new InMemoryJobStore();
        InMemoryInputStore inputs = new InMemoryInputStore();
        InMemoryResultStore results = new InMemoryResultStore();
        PostContentAnalysisJobService service = service(jobs, inputs, clock, RUN_ID_1);
        PostContentAnalysisJob job = service.enqueue(input("post-content-v1"));
        inputs.clear();

        ContentAnalysisProvider provider = new FakeContentAnalysisProvider(
                source -> validResult(job.analysisRunId(), source.sourceContentVersion(), clock.instant()),
                new PostContentAnalysisValidator());
        PostContentAnalysisWorker worker = worker(jobs, inputs, results, provider, clock);

        assertTrue(worker.runOnce());
        PostContentAnalysisJob quarantined = jobs.findByRunId(job.analysisRunId()).orElseThrow();
        assertEquals(AnalysisStatus.QUARANTINED, quarantined.status());
        assertEquals("input_snapshot_missing", quarantined.lastErrorCode());
        assertEquals(1, quarantined.attemptCount());
        assertEquals(0, results.size());
    }

    private static PostContentAnalysisJobService service(
            InMemoryJobStore jobs,
            InMemoryInputStore inputs,
            Clock clock,
            String runId) {
        return new PostContentAnalysisJobService(
                new PostContentAnalysisValidator(), jobs, inputs, clock, () -> runId);
    }

    private static PostContentAnalysisWorker worker(
            InMemoryJobStore jobs,
            InMemoryInputStore inputs,
            InMemoryResultStore results,
            ContentAnalysisProvider provider,
            Clock clock) {
        return new PostContentAnalysisWorker(
                jobs,
                inputs,
                results,
                provider,
                new PostContentAnalysisValidator(),
                clock);
    }

    private static PostContentAnalysisInputV1 input(String version) {
        return new PostContentAnalysisInputV1(
                42L,
                "성수동 빈티지숍과 카페 하루 코스",
                "성수연방을 둘러본 뒤 서울숲까지 걸어갔습니다.",
                "Seoul",
                List.of("성수동", "빈티지", "카페"),
                version);
    }

    private static PostContentAnalysisResultV1 validResult(
            String runId,
            String sourceVersion,
            Instant createdAt) {
        return new PostContentAnalysisResultV1(
                runId,
                PostContentAnalysisResultV1.SCHEMA_VERSION,
                sourceVersion,
                "ko",
                "fake-model-v1",
                PostContentAnalysisJobService.PROMPT_VERSION,
                AnalysisStatus.SUCCEEDED,
                "성수연방과 서울숲을 도보로 둘러본 여행 후기입니다.",
                List.of(ContentTheme.SHOPPING, ContentTheme.LOCAL_EXPERIENCE),
                List.of(TravelStyle.WALKING, TravelStyle.SHORT_TRIP),
                List.of("성수연방", "서울숲"),
                List.of(
                        new PlaceMentionCandidate("성수연방", "성수연방", 0.96),
                        new PlaceMentionCandidate("서울숲", "서울숲", 0.98)),
                0.94,
                createdAt);
    }

    private static PostContentAnalysisResultV1 invalidResult(
            String runId,
            String sourceVersion,
            Instant createdAt) {
        return new PostContentAnalysisResultV1(
                runId,
                PostContentAnalysisResultV1.SCHEMA_VERSION,
                sourceVersion,
                "ko",
                "fake-model-v1",
                PostContentAnalysisJobService.PROMPT_VERSION,
                AnalysisStatus.SUCCEEDED,
                "",
                List.of(ContentTheme.SHOPPING),
                List.of(TravelStyle.WALKING),
                List.of(),
                List.of(),
                0.9,
                createdAt);
    }

    private static final class InMemoryJobStore implements PostContentAnalysisJobStore {
        private final Map<String, PostContentAnalysisJob> jobs = new LinkedHashMap<>();

        @Override
        public Optional<PostContentAnalysisJob> findByDedupeKey(
                long postId,
                String sourceContentVersion,
                String schemaVersion,
                String promptVersion) {
            return jobs.values().stream()
                    .filter(job -> job.postId() == postId)
                    .filter(job -> job.sourceContentVersion().equals(sourceContentVersion))
                    .filter(job -> job.schemaVersion().equals(schemaVersion))
                    .filter(job -> job.promptVersion().equals(promptVersion))
                    .findFirst();
        }

        @Override
        public PostContentAnalysisJob save(PostContentAnalysisJob job) {
            jobs.put(job.analysisRunId(), job);
            return job;
        }

        @Override
        public Optional<PostContentAnalysisJob> claimNextReady(Instant now) {
            Optional<PostContentAnalysisJob> ready = jobs.values().stream()
                    .filter(job -> job.status() == AnalysisStatus.QUEUED)
                    .filter(job -> job.nextAttemptAt() != null && !job.nextAttemptAt().isAfter(now))
                    .findFirst();
            if (ready.isEmpty()) return Optional.empty();

            PostContentAnalysisJob running = ready.get().markRunning(now);
            save(running);
            return Optional.of(running);
        }

        Optional<PostContentAnalysisJob> findByRunId(String runId) {
            return Optional.ofNullable(jobs.get(runId));
        }

        int size() {
            return jobs.size();
        }
    }

    private static final class InMemoryInputStore implements PostContentAnalysisInputSnapshotStore {
        private final Map<String, PostContentAnalysisInputV1> inputs = new LinkedHashMap<>();

        @Override
        public void saveIfAbsent(PostContentAnalysisInputV1 input) {
            inputs.putIfAbsent(key(input.postId(), input.sourceContentVersion()), input);
        }

        @Override
        public Optional<PostContentAnalysisInputV1> find(long postId, String sourceContentVersion) {
            return Optional.ofNullable(inputs.get(key(postId, sourceContentVersion)));
        }

        void clear() {
            inputs.clear();
        }

        int size() {
            return inputs.size();
        }

        private static String key(long postId, String sourceContentVersion) {
            return postId + "|" + sourceContentVersion;
        }
    }

    private static final class InMemoryResultStore implements PostContentAnalysisResultStore {
        private final List<PostContentAnalysisResultV1> results = new ArrayList<>();

        @Override
        public void append(PostContentAnalysisResultV1 result) {
            results.add(result);
        }

        @Override
        public Optional<PostContentAnalysisResultV1> findByAnalysisRunId(String analysisRunId) {
            return results.stream()
                    .filter(result -> result.analysisRunId().equals(analysisRunId))
                    .findFirst();
        }

        int size() {
            return results.size();
        }
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
