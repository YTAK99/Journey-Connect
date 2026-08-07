package com.jc.backend.intelligence.contentanalysis;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class PostContentAnalysisValidator {

    private static final int MAX_TITLE_LENGTH = 120;
    private static final int MAX_REGION_NAME_LENGTH = 100;
    private static final int MAX_SOURCE_TAGS = 5;
    private static final int MAX_TAG_LENGTH = 20;
    private static final int MAX_SUMMARY_LENGTH = 240;
    private static final int MAX_SUGGESTED_TAGS = 5;
    private static final int MAX_PLACE_MENTIONS = 10;
    private static final int MAX_PLACE_NAME_LENGTH = 100;
    private static final int MAX_VERSION_LENGTH = 128;
    private static final Pattern ANALYSIS_RUN_ID = Pattern.compile(
            "analysis:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    private static final Pattern LANGUAGE_TAG = Pattern.compile("[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*");
    private static final Set<String> FORBIDDEN_VERSION_IDS = Set.of("latest", "current", "default");

    public void validateInput(PostContentAnalysisInputV1 input) {
        List<String> violations = new ArrayList<>();
        if (input == null) {
            throw new PostContentAnalysisValidationException(List.of("input must not be null"));
        }

        if (input.postId() <= 0) violations.add("postId must be positive");
        requireText(input.title(), "title", MAX_TITLE_LENGTH, violations);
        requireText(input.content(), "content", Integer.MAX_VALUE, violations);
        optionalText(input.regionName(), "regionName", MAX_REGION_NAME_LENGTH, violations);
        requireVersion(input.sourceContentVersion(), "sourceContentVersion", violations);
        validateTags(input.sourceTags(), "sourceTags", MAX_SOURCE_TAGS, violations);

        throwIfInvalid(violations);
    }

    public void validateProviderOutput(
            ProviderAnalysisOutputV1 output,
            PostContentAnalysisInputV1 input) {
        validateInput(input);
        if (output == null) {
            throw new PostContentAnalysisValidationException(
                    List.of("provider output must not be null"));
        }

        List<String> violations = new ArrayList<>();
        validatePayload(
                output.sourceLanguage(),
                output.summary(),
                output.themes(),
                output.travelStyles(),
                output.suggestedTags(),
                output.placeMentions(),
                output.confidence(),
                input.sourceText(),
                violations);
        throwIfInvalid(violations);
    }

    public void validateResult(PostContentAnalysisResultV1 result, PostContentAnalysisInputV1 input) {
        validateInput(input);
        List<String> violations = new ArrayList<>();
        if (result == null) {
            throw new PostContentAnalysisValidationException(List.of("result must not be null"));
        }

        if (result.analysisRunId() == null || !ANALYSIS_RUN_ID.matcher(result.analysisRunId()).matches()) {
            violations.add("analysisRunId must use analysis:<uuid> format");
        }
        if (!PostContentAnalysisResultV1.SCHEMA_VERSION.equals(result.schemaVersion())) {
            violations.add("schemaVersion must be " + PostContentAnalysisResultV1.SCHEMA_VERSION);
        }
        if (!input.sourceContentVersion().equals(result.sourceContentVersion())) {
            violations.add("sourceContentVersion must match input");
        }
        requireVersion(result.modelVersion(), "modelVersion", violations);
        requireVersion(result.promptVersion(), "promptVersion", violations);
        if (result.status() != AnalysisStatus.SUCCEEDED) {
            violations.add("result status must be succeeded");
        }
        validatePayload(
                result.sourceLanguage(),
                result.summary(),
                result.themes(),
                result.travelStyles(),
                result.suggestedTags(),
                result.placeMentions(),
                result.confidence(),
                input.sourceText(),
                violations);
        if (result.createdAt() == null) violations.add("createdAt must not be null");

        throwIfInvalid(violations);
    }

    private static void validatePayload(
            String sourceLanguage,
            String summary,
            List<ContentTheme> themes,
            List<TravelStyle> travelStyles,
            List<String> suggestedTags,
            List<PlaceMentionCandidate> placeMentions,
            double confidence,
            String sourceText,
            List<String> violations) {
        if (sourceLanguage == null || !LANGUAGE_TAG.matcher(sourceLanguage).matches()) {
            violations.add("sourceLanguage must be a supported language tag shape");
        }
        requireText(summary, "summary", MAX_SUMMARY_LENGTH, violations);
        validateUniqueValues(themes, "themes", violations);
        validateUniqueValues(travelStyles, "travelStyles", violations);
        validateTags(suggestedTags, "suggestedTags", MAX_SUGGESTED_TAGS, violations);
        validatePlaceMentions(placeMentions, sourceText, violations);
        validateConfidence(confidence, "confidence", violations);
    }

    private static void validatePlaceMentions(
            List<PlaceMentionCandidate> mentions,
            String sourceText,
            List<String> violations) {
        if (mentions.size() > MAX_PLACE_MENTIONS) {
            violations.add("placeMentions must contain at most " + MAX_PLACE_MENTIONS + " values");
        }

        String normalizedSource = sourceText.toLowerCase(Locale.ROOT);
        Set<String> seen = new HashSet<>();
        for (int index = 0; index < mentions.size(); index++) {
            PlaceMentionCandidate mention = mentions.get(index);
            String field = "placeMentions[" + index + "]";
            if (mention == null) {
                violations.add(field + " must not be null");
                continue;
            }

            requireText(mention.mentionText(), field + ".mentionText", MAX_PLACE_NAME_LENGTH, violations);
            requireText(
                    mention.normalizedNameCandidate(),
                    field + ".normalizedNameCandidate",
                    MAX_PLACE_NAME_LENGTH,
                    violations);
            validateConfidence(mention.confidence(), field + ".confidence", violations);

            if (hasText(mention.mentionText())) {
                String normalizedMention = mention.mentionText().trim().toLowerCase(Locale.ROOT);
                if (!normalizedSource.contains(normalizedMention)) {
                    violations.add(field + ".mentionText must appear in the source post");
                }
                if (!seen.add(normalizedMention)) {
                    violations.add("placeMentions must not contain duplicate mentionText values");
                }
            }
        }
    }

    private static void validateTags(
            List<String> tags,
            String field,
            int maxCount,
            List<String> violations) {
        if (tags.size() > maxCount) {
            violations.add(field + " must contain at most " + maxCount + " values");
        }

        Set<String> seen = new HashSet<>();
        for (int index = 0; index < tags.size(); index++) {
            String tag = tags.get(index);
            requireText(tag, field + "[" + index + "]", MAX_TAG_LENGTH, violations);
            if (hasText(tag) && !seen.add(tag.trim().toLowerCase(Locale.ROOT))) {
                violations.add(field + " must not contain duplicate values");
            }
        }
    }

    private static void validateUniqueValues(List<?> values, String field, List<String> violations) {
        Set<Object> seen = new HashSet<>();
        for (Object value : values) {
            if (value == null) {
                violations.add(field + " must not contain null values");
            } else if (!seen.add(value)) {
                violations.add(field + " must not contain duplicate values");
            }
        }
    }

    private static void validateConfidence(double value, String field, List<String> violations) {
        if (!Double.isFinite(value) || value < 0.0 || value > 1.0) {
            violations.add(field + " must be between 0.0 and 1.0");
        }
    }

    private static void requireVersion(String value, String field, List<String> violations) {
        requireText(value, field, MAX_VERSION_LENGTH, violations);
        if (hasText(value) && FORBIDDEN_VERSION_IDS.contains(value.trim().toLowerCase(Locale.ROOT))) {
            violations.add(field + " must be an explicit immutable version");
        }
    }

    private static void requireText(String value, String field, int maxLength, List<String> violations) {
        if (!hasText(value)) {
            violations.add(field + " must not be blank");
        } else if (value.length() > maxLength) {
            violations.add(field + " must be at most " + maxLength + " characters");
        }
    }

    private static void optionalText(String value, String field, int maxLength, List<String> violations) {
        if (value != null && value.length() > maxLength) {
            violations.add(field + " must be at most " + maxLength + " characters");
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static void throwIfInvalid(List<String> violations) {
        if (!violations.isEmpty()) {
            throw new PostContentAnalysisValidationException(violations);
        }
    }
}
