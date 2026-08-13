package com.jc.backend.intelligence.contentanalysis;

import java.util.List;

public record ProviderAnalysisOutputV1(
        String sourceLanguage,
        String summary,
        List<ContentTheme> themes,
        List<TravelStyle> travelStyles,
        List<String> suggestedTags,
        List<PlaceMentionCandidate> placeMentions,
        double confidence) {

    public ProviderAnalysisOutputV1 {
        themes = themes == null ? List.of() : List.copyOf(themes);
        travelStyles = travelStyles == null ? List.of() : List.copyOf(travelStyles);
        suggestedTags = suggestedTags == null ? List.of() : List.copyOf(suggestedTags);
        placeMentions = placeMentions == null ? List.of() : List.copyOf(placeMentions);
    }
}
