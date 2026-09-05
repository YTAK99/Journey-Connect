package com.jc.backend.intelligence.journeyai;

import com.jc.backend.intelligence.contentanalysis.ContentAnalysisRuntimeProperties;
import java.util.Objects;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;

final class SpringAiJourneyAiModelClient implements JourneyAiModelClient {

    private final ChatClient chatClient;
    private final ContentAnalysisRuntimeProperties contentAnalysisProperties;

    SpringAiJourneyAiModelClient(
            ChatModel chatModel,
            ContentAnalysisRuntimeProperties contentAnalysisProperties) {
        this.chatClient = ChatClient.create(Objects.requireNonNull(chatModel, "chatModel"));
        this.contentAnalysisProperties = Objects.requireNonNull(contentAnalysisProperties, "contentAnalysisProperties");
    }

    @Override
    public String chat(String systemPrompt, String userPrompt) {
        return chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .options(GoogleGenAiChatOptions.builder()
                        .model(contentAnalysisProperties.getModelVersion())
                        .temperature(0.2)
                        .responseMimeType("application/json")
                        .outputSchema(JourneyAiService.RESPONSE_SCHEMA)
                        .build())
                .call()
                .content();
    }
}
