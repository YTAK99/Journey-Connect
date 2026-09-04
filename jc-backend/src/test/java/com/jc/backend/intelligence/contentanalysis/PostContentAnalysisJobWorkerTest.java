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
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
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
                source -> validOutput(),
                new PostContentAnalysisValidator());
        PostContentAnalysisWorker worker = worker(jobs, inputs, results, provider, clock);

        assertTrue(worker.runOnce());
        PostContentAnalysisJob saved = jobs.findByRunId(job.analysisRunId()).orElseThrow();
        assertEquals(AnalysisStatus.SUCCEEDED, saved.status());
        assertEquals(1, saved.attemptCount());
        PostContentAnalysisResultV1 stored =
                results.findByAnalysisRunId(job.analysisRunId()).orElseThrow();
        assertEquals(job.analysisRunId(), stored.analysisRunId());
        assertEquals(job.sourceContentVersion(), stored.sourceContentVersion());
        assertEquals(job.promptVersion(), stored.promptVersion());
        assertEquals("fake-model-v1", stored.modelVersion());
        assertEquals(AnalysisStatus.SUCCEEDED, stored.status());
        assertEquals(BASE_TIME, stored.createdAt());
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
            public String modelVersion() {
                return "invalid-model-v1";
            }

            @Override
            public ProviderAnalysisOutputV1 analyze(PostContentAnalysisInputV1 source) {
                return invalidOutput();
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
            public String modelVersion() {
                return "failing-model-v1";
            }

            @Override
            public ProviderAnalysisOutputV1 analyze(PostContentAnalysisInputV1 source) {
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
    void providerTimeoutRetriesJobAndNextQueuedJobCanSucceed() {
        MutableClock clock = new MutableClock(BASE_TIME);
        InMemoryJobStore jobs = new InMemoryJobStore();
        InMemoryInputStore inputs = new InMemoryInputStore();
        InMemoryResultStore results = new InMemoryResultStore();
        PostContentAnalysisJobService firstService = service(jobs, inputs, clock, RUN_ID_1);
        PostContentAnalysisJobService secondService = service(jobs, inputs, clock, RUN_ID_2);
        PostContentAnalysisJob first = firstService.enqueue(input("post-content-v1"));
        PostContentAnalysisJob second = secondService.enqueue(input("post-content-v2"));
        CountDownLatch providerStarted = new CountDownLatch(1);
        AtomicInteger calls = new AtomicInteger();

        ContentAnalysisProvider provider = new FakeContentAnalysisProvider(source -> {
            if (calls.getAndIncrement() == 0) {
                providerStarted.countDown();
                try {
                    Thread.sleep(Duration.ofSeconds(10));
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("provider interrupted", exception);
                }
            }
            return validOutput();
        }, new PostContentAnalysisValidator());

        try (ExecutorService providerExecutor = Executors.newSingleThreadExecutor()) {
            PostContentAnalysisWorker worker = new PostContentAnalysisWorker(
                    jobs,
                    inputs,
                    results,
                    provider,
                    new PostContentAnalysisValidator(),
                    clock,
                    providerExecutor,
                    Duration.ofMillis(50),
                    Duration.ofSeconds(1),
                    Duration.ofSeconds(1));

            assertTrue(worker.runOnce());
            assertEquals(0L, providerStarted.getCount());
            PostContentAnalysisJob retry = jobs.findByRunId(first.analysisRunId()).orElseThrow();
            assertEquals(AnalysisStatus.QUEUED, retry.status());
            assertEquals("provider_timeout", retry.lastErrorCode());
            assertEquals(BASE_TIME.plusSeconds(30), retry.nextAttemptAt());

            assertTrue(worker.runOnce());
            PostContentAnalysisJob succeeded = jobs.findByRunId(second.analysisRunId()).orElseThrow();
            assertEquals(AnalysisStatus.SUCCEEDED, succeeded.status());
            assertEquals(1, results.size());
        }
    }

    @Test
    void rateLimitPausesNewClaimsThenAllowsNextQueuedJob() {
        MutableClock clock = new MutableClock(BASE_TIME);
        InMemoryJobStore jobs = new InMemoryJobStore();
        InMemoryInputStore inputs = new InMemoryInputStore();
        InMemoryResultStore results = new InMemoryResultStore();
        PostContentAnalysisJob first = service(jobs, inputs, clock, RUN_ID_1)
                .enqueue(input("post-content-v1"));
        PostContentAnalysisJob second = service(jobs, inputs, clock, RUN_ID_2)
                .enqueue(input("post-content-v2"));
        AtomicInteger calls = new AtomicInteger();
        ContentAnalysisProvider provider = new FakeContentAnalysisProvider(source -> {
            if (calls.getAndIncrement() == 0) {
                throw new IllegalStateException("429 quota exceeded; rate limit reached");
            }
            return validOutput();
        }, new PostContentAnalysisValidator());
        PostContentAnalysisWorker worker = new PostContentAnalysisWorker(
                jobs,
                inputs,
                results,
                provider,
                new PostContentAnalysisValidator(),
                clock,
                new DirectExecutorService(),
                Duration.ofSeconds(1),
                Duration.ofSeconds(60),
                Duration.ofSeconds(2));

        assertTrue(worker.runOnce());
        PostContentAnalysisJob limited = jobs.findByRunId(first.analysisRunId()).orElseThrow();
        assertEquals(AnalysisStatus.QUEUED, limited.status());
        assertEquals("provider_rate_limited", limited.lastErrorCode());

        assertFalse(worker.runOnce());
        assertEquals(0, jobs.findByRunId(second.analysisRunId()).orElseThrow().attemptCount());
        clock.advance(Duration.ofSeconds(60));

        assertTrue(worker.runOnce());
        assertEquals(
                AnalysisStatus.SUCCEEDED,
                jobs.findByRunId(second.analysisRunId()).orElseThrow().status());
        assertEquals(1, results.size());
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
                source -> validOutput(),
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
                clock,
                new DirectExecutorService(),
                Duration.ofSeconds(1),
                Duration.ofSeconds(1),
                Duration.ofSeconds(2));
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

    private static ProviderAnalysisOutputV1 validOutput() {
        return new ProviderAnalysisOutputV1(
                "ko",
                "성수연방과 서울숲을 도보로 둘러본 여행 후기입니다.",
                List.of(ContentTheme.SHOPPING, ContentTheme.LOCAL_EXPERIENCE),
                List.of(TravelStyle.WALKING, TravelStyle.SHORT_TRIP),
                List.of("성수연방", "서울숲"),
                List.of(
                        new PlaceMentionCandidate("성수연방", "성수연방", 0.96),
                        new PlaceMentionCandidate("서울숲", "서울숲", 0.98)),
                0.94);
    }

    private static ProviderAnalysisOutputV1 invalidOutput() {
        return new ProviderAnalysisOutputV1(
                "ko",
                "",
                List.of(ContentTheme.SHOPPING),
                List.of(TravelStyle.WALKING),
                List.of(),
                List.of(),
                0.9);
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
        public synchronized PostContentAnalysisJob saveIfAbsent(PostContentAnalysisJob job) {
            Optional<PostContentAnalysisJob> existing = findByDedupeKey(
                    job.postId(),
                    job.sourceContentVersion(),
                    job.schemaVersion(),
                    job.promptVersion());
            if (existing.isPresent()) {
                return existing.get();
            }
            jobs.put(job.analysisRunId(), job);
            return job;
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
                    .min(java.util.Comparator
                            .comparing(PostContentAnalysisJob::nextAttemptAt)
                            .thenComparing(PostContentAnalysisJob::createdAt)
                            .thenComparing(PostContentAnalysisJob::analysisRunId));
            if (ready.isEmpty()) return Optional.empty();

            PostContentAnalysisJob running = ready.get().markRunning(now);
            save(running);
            return Optional.of(running);
        }

        @Override
        public int recoverStaleRunning(Instant staleBefore, Instant retryAt, int maxAttempts) {
            List<PostContentAnalysisJob> stale = jobs.values().stream()
                    .filter(job -> job.status() == AnalysisStatus.RUNNING)
                    .filter(job -> !job.updatedAt().isAfter(staleBefore))
                    .toList();
            stale.forEach(job -> save(job.attemptCount() >= maxAttempts
                    ? job.markFailed("worker_lease_expired", retryAt)
                    : job.scheduleRetry(retryAt, "worker_lease_expired", retryAt)));
            return stale.size();
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

    private static final class DirectExecutorService extends AbstractExecutorService {
        @Override
        public void shutdown() {}

        @Override
        public List<Runnable> shutdownNow() {
            return List.of();
        }

        @Override
        public boolean isShutdown() {
            return false;
        }

        @Override
        public boolean isTerminated() {
            return false;
        }

        @Override
        public boolean awaitTermination(long timeout, TimeUnit unit) {
            return true;
        }

        @Override
        public void execute(Runnable command) {
            command.run();
        }
    }
}
