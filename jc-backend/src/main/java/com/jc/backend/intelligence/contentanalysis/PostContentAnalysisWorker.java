package com.jc.backend.intelligence.contentanalysis;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

public final class PostContentAnalysisWorker {

    private static final int MAX_PROVIDER_ATTEMPTS = 3;
    private static final int MAX_VALIDATION_ATTEMPTS = 2;
    private static final Duration BASE_BACKOFF = Duration.ofSeconds(30);

    private final PostContentAnalysisJobStore jobStore;
    private final PostContentAnalysisInputSnapshotStore inputStore;
    private final PostContentAnalysisResultStore resultStore;
    private final ContentAnalysisProvider provider;
    private final PostContentAnalysisValidator validator;
    private final Clock clock;

    public PostContentAnalysisWorker(
            PostContentAnalysisJobStore jobStore,
            PostContentAnalysisInputSnapshotStore inputStore,
            PostContentAnalysisResultStore resultStore,
            ContentAnalysisProvider provider,
            PostContentAnalysisValidator validator,
            Clock clock) {
        this.jobStore = Objects.requireNonNull(jobStore, "jobStore");
        this.inputStore = Objects.requireNonNull(inputStore, "inputStore");
        this.resultStore = Objects.requireNonNull(resultStore, "resultStore");
        this.provider = Objects.requireNonNull(provider, "provider");
        this.validator = Objects.requireNonNull(validator, "validator");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    public boolean runOnce() {
        Instant now = clock.instant();
        Optional<PostContentAnalysisJob> claimed = jobStore.claimNextReady(now);
        if (claimed.isEmpty()) return false;

        PostContentAnalysisJob running = claimed.get();
        if (running.status() != AnalysisStatus.RUNNING) {
            throw new IllegalStateException("claimed job must be running");
        }

        PostContentAnalysisInputV1 input = inputStore
                .find(running.postId(), running.sourceContentVersion())
                .orElse(null);
        if (input == null) {
            jobStore.save(running.quarantine("input_snapshot_missing", now));
            return true;
        }

        try {
            ProviderAnalysisOutputV1 output = provider.analyze(input);
            validator.validateProviderOutput(output, input);

            PostContentAnalysisResultV1 result = new PostContentAnalysisResultV1(
                    running.analysisRunId(),
                    PostContentAnalysisResultV1.SCHEMA_VERSION,
                    running.sourceContentVersion(),
                    output.sourceLanguage(),
                    provider.modelVersion(),
                    running.promptVersion(),
                    AnalysisStatus.SUCCEEDED,
                    output.summary(),
                    output.themes(),
                    output.travelStyles(),
                    output.suggestedTags(),
                    output.placeMentions(),
                    output.confidence(),
                    clock.instant());

            validator.validateResult(result, input);
            resultStore.append(result);
            jobStore.save(running.markSucceeded(clock.instant()));
        } catch (PostContentAnalysisValidationException exception) {
            handleValidationFailure(running, exception);
        } catch (RuntimeException exception) {
            handleProviderFailure(running, exception);
        }
        return true;
    }

    private void handleValidationFailure(
            PostContentAnalysisJob running,
            PostContentAnalysisValidationException exception) {
        Instant now = clock.instant();
        if (running.attemptCount() >= MAX_VALIDATION_ATTEMPTS) {
            jobStore.save(running.quarantine("output_validation_failed", now));
            return;
        }
        jobStore.save(running.scheduleRetry(nextAttemptAt(running.attemptCount(), now),
                "output_validation_failed", now));
    }

    private void handleProviderFailure(PostContentAnalysisJob running, RuntimeException exception) {
        Instant now = clock.instant();
        if (running.attemptCount() >= MAX_PROVIDER_ATTEMPTS) {
            jobStore.save(running.markFailed("provider_failure", now));
            return;
        }
        jobStore.save(running.scheduleRetry(
                nextAttemptAt(running.attemptCount(), now),
                "provider_failure",
                now));
    }

    private static Instant nextAttemptAt(int attemptCount, Instant now) {
        long multiplier = 1L << Math.max(0, attemptCount - 1);
        return now.plus(BASE_BACKOFF.multipliedBy(multiplier));
    }
}
