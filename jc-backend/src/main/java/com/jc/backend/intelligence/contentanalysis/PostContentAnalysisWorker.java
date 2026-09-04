package com.jc.backend.intelligence.contentanalysis;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class PostContentAnalysisWorker {

    private static final Logger log = LoggerFactory.getLogger(PostContentAnalysisWorker.class);
    private static final int MAX_PROVIDER_ATTEMPTS = 3;
    private static final int MAX_VALIDATION_ATTEMPTS = 2;
    private static final Duration BASE_BACKOFF = Duration.ofSeconds(30);

    private final PostContentAnalysisJobStore jobStore;
    private final PostContentAnalysisInputSnapshotStore inputStore;
    private final PostContentAnalysisResultStore resultStore;
    private final ContentAnalysisProvider provider;
    private final PostContentAnalysisValidator validator;
    private final Clock clock;
    private final ExecutorService providerExecutor;
    private final Duration providerTimeout;
    private final Duration rateLimitCooldown;
    private final Duration runningLeaseTimeout;
    private volatile Instant providerBlockedUntil = Instant.MIN;

    public PostContentAnalysisWorker(
            PostContentAnalysisJobStore jobStore,
            PostContentAnalysisInputSnapshotStore inputStore,
            PostContentAnalysisResultStore resultStore,
            ContentAnalysisProvider provider,
            PostContentAnalysisValidator validator,
            Clock clock,
            ExecutorService providerExecutor,
            Duration providerTimeout,
            Duration rateLimitCooldown,
            Duration runningLeaseTimeout) {
        this.jobStore = Objects.requireNonNull(jobStore, "jobStore");
        this.inputStore = Objects.requireNonNull(inputStore, "inputStore");
        this.resultStore = Objects.requireNonNull(resultStore, "resultStore");
        this.provider = Objects.requireNonNull(provider, "provider");
        this.validator = Objects.requireNonNull(validator, "validator");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.providerExecutor = Objects.requireNonNull(providerExecutor, "providerExecutor");
        this.providerTimeout = requirePositive(providerTimeout, "providerTimeout");
        this.rateLimitCooldown = requirePositive(rateLimitCooldown, "rateLimitCooldown");
        this.runningLeaseTimeout = requirePositive(runningLeaseTimeout, "runningLeaseTimeout");
        if (this.runningLeaseTimeout.compareTo(this.providerTimeout) <= 0) {
            throw new IllegalArgumentException("runningLeaseTimeout must be greater than providerTimeout");
        }
    }

    public boolean runOnce() {
        Instant now = clock.instant();
        int recovered = jobStore.recoverStaleRunning(
                now.minus(runningLeaseTimeout),
                now,
                MAX_PROVIDER_ATTEMPTS);
        if (recovered > 0) {
            log.warn("Recovered {} stale Content Analysis RUNNING job(s)", recovered);
        }
        if (now.isBefore(providerBlockedUntil)) {
            return false;
        }
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
            Optional<PostContentAnalysisResultV1> existing =
                    resultStore.findByAnalysisRunId(running.analysisRunId());
            if (existing.isPresent()) {
                validator.validateResult(existing.get(), input);
                jobStore.save(running.markSucceeded(clock.instant()));
                return true;
            }

            ProviderAnalysisOutputV1 output = analyzeWithTimeout(input);
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
        } catch (ProviderTimeoutException exception) {
            handleProviderFailure(running, "provider_timeout");
        } catch (RuntimeException exception) {
            if (isRateLimited(exception)) {
                providerBlockedUntil = clock.instant().plus(rateLimitCooldown);
                log.warn("Content Analysis provider rate limited; pausing new calls for {}", rateLimitCooldown);
                handleProviderFailure(running, "provider_rate_limited");
            } else {
                handleProviderFailure(running, "provider_failure");
            }
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

    private void handleProviderFailure(PostContentAnalysisJob running, String errorCode) {
        Instant now = clock.instant();
        if (running.attemptCount() >= MAX_PROVIDER_ATTEMPTS) {
            jobStore.save(running.markFailed(errorCode, now));
            return;
        }
        jobStore.save(running.scheduleRetry(
                nextAttemptAt(running.attemptCount(), now),
                errorCode,
                now));
    }

    private ProviderAnalysisOutputV1 analyzeWithTimeout(PostContentAnalysisInputV1 input) {
        Future<ProviderAnalysisOutputV1> future = providerExecutor.submit(() -> provider.analyze(input));
        try {
            return future.get(providerTimeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException exception) {
            future.cancel(true);
            throw new ProviderTimeoutException(providerTimeout, exception);
        } catch (InterruptedException exception) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw new IllegalStateException("provider analysis interrupted", exception);
        } catch (ExecutionException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            if (cause instanceof Error error) {
                throw error;
            }
            throw new IllegalStateException("provider analysis failed", cause);
        }
    }

    private static Instant nextAttemptAt(int attemptCount, Instant now) {
        long multiplier = 1L << Math.max(0, attemptCount - 1);
        return now.plus(BASE_BACKOFF.multipliedBy(multiplier));
    }

    private static Duration requirePositive(Duration duration, String name) {
        Objects.requireNonNull(duration, name);
        if (duration.isZero() || duration.isNegative()) {
            throw new IllegalArgumentException(name + " must be positive");
        }
        return duration;
    }

    private static boolean isRateLimited(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase(java.util.Locale.ROOT);
                if (normalized.contains("429")
                        && (normalized.contains("quota") || normalized.contains("rate limit"))) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    private static final class ProviderTimeoutException extends RuntimeException {
        private ProviderTimeoutException(Duration timeout, Throwable cause) {
            super("provider analysis exceeded " + timeout, cause);
        }
    }
}
