package com.jc.backend.intelligence.contentanalysis;

import java.time.Instant;
import java.util.List;

public record PostContentAnalysisReadView(
        long postId,
        String sourceContentVersion,
        String status,
        String analysisRunId,
        int attemptCount,
        Instant nextAttemptAt,
        String lastErrorCode,
        Instant updatedAt,
        Result result) {

    public static PostContentAnalysisReadView notRequested(
            long postId,
            String sourceContentVersion) {
        return new PostContentAnalysisReadView(
                postId,
                sourceContentVersion,
                "not_requested",
                null,
                0,
                null,
                null,
                null,
                null);
    }

    public static PostContentAnalysisReadView from(
            PostContentAnalysisJob job,
            PostContentAnalysisResultV1 result) {
        return new PostContentAnalysisReadView(
                job.postId(),
                job.sourceContentVersion(),
                job.status().wireValue(),
                job.analysisRunId(),
                job.attemptCount(),
                job.nextAttemptAt(),
                job.lastErrorCode(),
                job.updatedAt(),
                result == null ? null : Result.from(result));
    }

    public record Result(
            String schemaVersion,
            String sourceLanguage,
            String modelVersion,
            String promptVersion,
            String summary,
            List<String> themes,
            List<String> travelStyles,
            List<String> suggestedTags,
            List<PlaceMentionCandidate> placeMentions,
            double confidence,
            Instant createdAt) {

        static Result from(PostContentAnalysisResultV1 result) {
            return new Result(
                    result.schemaVersion(),
                    result.sourceLanguage(),
                    result.modelVersion(),
                    result.promptVersion(),
                    result.summary(),
                    result.themes().stream().map(ContentTheme::wireValue).toList(),
                    result.travelStyles().stream().map(TravelStyle::wireValue).toList(),
                    result.suggestedTags(),
                    result.placeMentions(),
                    result.confidence(),
                    result.createdAt());
        }
    }
}
