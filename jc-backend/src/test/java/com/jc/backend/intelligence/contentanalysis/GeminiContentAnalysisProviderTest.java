package com.jc.backend.intelligence.contentanalysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class GeminiContentAnalysisProviderTest {

    private static final String VALID_RESPONSE = """
            {
              "sourceLanguage": "ko",
              "summary": "성수연방과 서울숲을 도보로 둘러본 여행 후기입니다.",
              "themes": ["shopping", "cafe", "local_experience"],
              "travelStyles": ["walking", "short_trip"],
              "suggestedTags": ["성수연방", "서울숲"],
              "placeMentions": [
                {
                  "mentionText": "성수연방",
                  "normalizedNameCandidate": "성수연방",
                  "confidence": 0.96
                },
                {
                  "mentionText": "서울숲",
                  "normalizedNameCandidate": "서울숲",
                  "confidence": 0.98
                }
              ],
              "confidence": 0.94
            }
            """;

    @Test
    void mapsStructuredResponseIntoProviderOwnedPayloadOnly() {
        PostContentAnalysisInputV1 input = input();
        GeminiContentAnalysisProvider provider = provider(VALID_RESPONSE);

        ProviderAnalysisOutputV1 output = provider.analyze(input);

        assertThat(provider.providerId()).isEqualTo("google-genai");
        assertThat(provider.modelVersion()).isEqualTo("gemini-2.5-flash");
        assertThat(output.sourceLanguage()).isEqualTo("ko");
        assertThat(output.themes()).containsExactly(
                ContentTheme.SHOPPING,
                ContentTheme.CAFE,
                ContentTheme.LOCAL_EXPERIENCE);
        assertThat(output.travelStyles()).containsExactly(
                TravelStyle.WALKING,
                TravelStyle.SHORT_TRIP);
        assertThat(output.placeMentions()).extracting(PlaceMentionCandidate::mentionText)
                .containsExactly("성수연방", "서울숲");
        assertThat(output.confidence()).isEqualTo(0.94);
    }

    @Test
    void malformedJsonIsClassifiedAsOutputValidationFailure() {
        GeminiContentAnalysisProvider provider = provider("not-json");

        assertThatThrownBy(() -> provider.analyze(input()))
                .isInstanceOf(PostContentAnalysisValidationException.class)
                .hasMessageContaining("valid JSON");
    }

    @Test
    void unknownVocabularyIsClassifiedAsOutputValidationFailure() {
        String response = VALID_RESPONSE.replace("\"shopping\"", "\"unknown_theme\"");
        GeminiContentAnalysisProvider provider = provider(response);

        assertThatThrownBy(() -> provider.analyze(input()))
                .isInstanceOf(PostContentAnalysisValidationException.class)
                .hasMessageContaining("unknown vocabulary");
    }

    @Test
    void mutableModelAliasIsRejectedBeforeRuntimeInvocation() {
        assertThatThrownBy(() -> new GeminiContentAnalysisProvider(
                        "latest",
                        ignored -> VALID_RESPONSE,
                        new ObjectMapper(),
                        new PostContentAnalysisValidator()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("immutable version");
    }

    private static GeminiContentAnalysisProvider provider(String response) {
        return new GeminiContentAnalysisProvider(
                "gemini-2.5-flash",
                ignored -> response,
                new ObjectMapper(),
                new PostContentAnalysisValidator());
    }

    private static PostContentAnalysisInputV1 input() {
        return new PostContentAnalysisInputV1(
                42L,
                "성수동 빈티지숍과 카페 하루 코스",
                "성수연방을 둘러본 뒤 서울숲까지 걸어갔습니다.",
                "Seoul",
                List.of("성수동", "빈티지", "카페"),
                "post-content-v1");
    }
}
