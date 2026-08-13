package com.jc.backend.intelligence.contentanalysis;

import java.time.Instant;
import java.util.List;

public record PostContentAnalysisResultV1(
        String analysisRunId,
        String schemaVersion,
        String sourceContentVersion,
        String sourceLanguage,
        String modelVersion,
        String promptVersion,
        AnalysisStatus status,
        String summary,
        List<ContentTheme> themes,
        List<TravelStyle> travelStyles,
        List<String> suggestedTags,
        List<PlaceMentionCandidate> placeMentions,
        double confidence,
        Instant createdAt) {

    public static final String SCHEMA_VERSION = "post-content-analysis-v1";

    public PostContentAnalysisResultV1 {
        themes = themes == null ? List.of() : List.copyOf(themes);
        travelStyles = travelStyles == null ? List.of() : List.copyOf(travelStyles);
        suggestedTags = suggestedTags == null ? List.of() : List.copyOf(suggestedTags);
        placeMentions = placeMentions == null ? List.of() : List.copyOf(placeMentions);
    }
}
