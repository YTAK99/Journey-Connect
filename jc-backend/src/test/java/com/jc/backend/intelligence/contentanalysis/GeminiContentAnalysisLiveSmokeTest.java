package com.jc.backend.intelligence.contentanalysis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;

@EnabledIfEnvironmentVariable(named = "JC_AI_CONTENT_SMOKE_ENABLED", matches = "(?i:true|1|yes)")
class GeminiContentAnalysisLiveSmokeTest {

    @Test
    void realGeminiProducesValidatedStructuredOutput() {
        String apiKey = requireEnvironment("GOOGLE_AI_API_KEY");
        String modelVersion = environmentOrDefault(
                "JC_AI_CONTENT_MODEL",
                "gemini-2.5-flash");

        try (Client client = Client.builder().apiKey(apiKey).build()) {
            GoogleGenAiChatModel chatModel = GoogleGenAiChatModel.builder()
                    .genAiClient(client)
                    .defaultOptions(GoogleGenAiChatOptions.builder()
                            .model(modelVersion)
                            .temperature(0.1)
                            .build())
                    .toolCallingManager(ToolCallingManager.builder().build())
                    .build();

            GeminiContentAnalysisProvider provider = new GeminiContentAnalysisProvider(
                    chatModel,
                    modelVersion,
                    new ObjectMapper(),
                    new PostContentAnalysisValidator());

            PostContentAnalysisInputV1 input = new PostContentAnalysisInputV1(
                    42L,
                    "성수동 빈티지숍과 카페 하루 코스",
                    "성수연방을 둘러본 뒤 근처 카페에 들렀고 서울숲까지 걸어갔습니다. 사진 찍기 좋은 곳이 많았습니다.",
                    "Seoul",
                    List.of("성수동", "빈티지", "카페"),
                    "live-smoke-content-v1");

            ProviderAnalysisOutputV1 output = provider.analyze(input);

            assertEquals("google-genai", provider.providerId());
            assertEquals(modelVersion, provider.modelVersion());
            assertTrue(output.sourceLanguage().toLowerCase().startsWith("ko"));
            assertFalse(output.summary().isBlank());
            assertTrue(output.suggestedTags().size() <= 5);
            assertTrue(output.placeMentions().size() <= 10);
            assertTrue(Double.isFinite(output.confidence()));
            assertTrue(output.confidence() >= 0.0 && output.confidence() <= 1.0);
        }
    }

    private static String requireEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " must be set for live smoke");
        }
        return value.trim();
    }

    private static String environmentOrDefault(String name, String defaultValue) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }
}
