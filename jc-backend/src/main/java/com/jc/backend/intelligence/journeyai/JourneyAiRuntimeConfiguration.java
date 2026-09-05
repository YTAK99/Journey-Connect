package com.jc.backend.intelligence.journeyai;

import com.jc.backend.intelligence.contentanalysis.ContentAnalysisRuntimeProperties;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class JourneyAiRuntimeConfiguration {

    @Bean
    JourneyAiModelClient journeyAiModelClient(
            ObjectProvider<ChatModel> chatModels,
            ContentAnalysisRuntimeProperties contentAnalysisProperties,
            @Value("${spring.ai.model.chat:none}") String selectedChatModel) {
        ChatModel chatModel = chatModels.getIfUnique();
        if (!"google-genai".equals(selectedChatModel) || chatModel == null) {
            return (systemPrompt, userPrompt) -> {
                throw new IllegalStateException("Journey AI Google GenAI ChatModel is unavailable");
            };
        }
        return new SpringAiJourneyAiModelClient(chatModel, contentAnalysisProperties);
    }
}
