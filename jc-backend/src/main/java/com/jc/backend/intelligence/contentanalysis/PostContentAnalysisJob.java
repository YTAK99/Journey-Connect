package com.jc.backend.intelligence.contentanalysis;

import java.time.Instant;
import java.util.Objects;

public record PostContentAnalysisJob(
        String analysisRunId,
        long postId,
        String sourceContentVersion,
        String schemaVersion,
        String promptVersion,
        AnalysisStatus status,
        int attemptCount,
        Instant nextAttemptAt,
        String lastErrorCode,
        Instant createdAt,
        Instant updatedAt) {

    public PostContentAnalysisJob {
        Objects.requireNonNull(analysisRunId, "analysisRunId");
        Objects.requireNonNull(sourceContentVersion, "sourceContentVersion");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(promptVersion, "promptVersion");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(updatedAt, "updatedAt");
        if (postId <= 0) throw new IllegalArgumentException("postId must be positive");
        if (attemptCount < 0) throw new IllegalArgumentException("attemptCount must not be negative");
    }

    public static PostContentAnalysisJob queued(
            String analysisRunId,
            PostContentAnalysisInputV1 input,
            String promptVersion,
            Instant now) {
        return new PostContentAnalysisJob(
                analysisRunId,
                input.postId(),
                input.sourceContentVersion(),
                PostContentAnalysisResultV1.SCHEMA_VERSION,
                promptVersion,
                AnalysisStatus.QUEUED,
                0,
                now,
                null,
                now,
                now);
    }

    public PostContentAnalysisJob markRunning(Instant now) {
        return copy(AnalysisStatus.RUNNING, attemptCount + 1, null, null, now);
    }

    public PostContentAnalysisJob markSucceeded(Instant now) {
        return copy(AnalysisStatus.SUCCEEDED, attemptCount, null, null, now);
    }

    public PostContentAnalysisJob scheduleRetry(Instant nextAttemptAt, String errorCode, Instant now) {
        Objects.requireNonNull(nextAttemptAt, "nextAttemptAt");
        return copy(AnalysisStatus.QUEUED, attemptCount, nextAttemptAt, errorCode, now);
    }

    public PostContentAnalysisJob markFailed(String errorCode, Instant now) {
        return copy(AnalysisStatus.FAILED, attemptCount, null, errorCode, now);
    }

    public PostContentAnalysisJob quarantine(String errorCode, Instant now) {
        return copy(AnalysisStatus.QUARANTINED, attemptCount, null, errorCode, now);
    }

    private PostContentAnalysisJob copy(
            AnalysisStatus newStatus,
            int newAttemptCount,
            Instant newNextAttemptAt,
            String newLastErrorCode,
            Instant now) {
        return new PostContentAnalysisJob(
                analysisRunId,
                postId,
                sourceContentVersion,
                schemaVersion,
                promptVersion,
                newStatus,
                newAttemptCount,
                newNextAttemptAt,
                newLastErrorCode,
                createdAt,
                now);
    }
}
