package com.jc.backend.intelligence.contentanalysis;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Objects;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(ContentAnalysisRuntimeProperties.class)
public class ContentAnalysisRuntimeConfiguration {

    @Bean
    PostContentAnalysisValidator postContentAnalysisValidator() {
        return new PostContentAnalysisValidator();
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.intelligence.content-analysis",
            name = "enabled",
            havingValue = "true")
    ContentAnalysisProvider contentAnalysisProvider(
            ObjectProvider<ChatModel> chatModels,
            ObjectMapper objectMapper,
            PostContentAnalysisValidator validator,
            ContentAnalysisRuntimeProperties properties,
            @Value("${spring.ai.model.chat:none}") String selectedChatModel) {
        if (!"google-genai".equals(selectedChatModel)) {
            throw new IllegalStateException(
                    "content analysis requires spring.ai.model.chat=google-genai when enabled");
        }

        ChatModel chatModel = chatModels.getIfUnique();
        if (chatModel == null) {
            throw new IllegalStateException(
                    "content analysis requires exactly one ChatModel bean when enabled");
        }

        return new GeminiContentAnalysisProvider(
                chatModel,
                Objects.requireNonNull(properties.getModelVersion(), "modelVersion"),
                objectMapper,
                validator);
    }
}
