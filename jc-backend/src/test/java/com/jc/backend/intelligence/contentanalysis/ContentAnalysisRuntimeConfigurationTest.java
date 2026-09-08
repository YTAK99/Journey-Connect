package com.jc.backend.intelligence.contentanalysis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class ContentAnalysisRuntimeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(context -> new ContentAnalysisEnvironmentPostProcessor()
                    .postProcessEnvironment(context.getEnvironment(), null))
            .withUserConfiguration(ContentAnalysisRuntimeConfiguration.class)
            .withBean(ObjectMapper.class, ObjectMapper::new);

    @Test
    void providerIsAbsentWhenFeatureIsDisabledByDefault() {
        contextRunner.run(context -> {
            assertNull(context.getStartupFailure());
            assertEquals(0, context.getBeanNamesForType(ContentAnalysisProvider.class).length);
            assertEquals(1, context.getBeanNamesForType(PostContentAnalysisValidator.class).length);
        });
    }

    @Test
    void enabledFeatureRejectsNonGeminiChatModelSelection() {
        contextRunner
                .withPropertyValues(
                        "app.intelligence.content-analysis.enabled=true",
                        "spring.ai.model.chat=none")
                .run(context -> {
                    Throwable failure = context.getStartupFailure();
                    assertNotNull(failure);
                    assertTrue(messageChain(failure).contains(
                            "spring.ai.model.chat=google-genai"));
                });
    }

    @Test
    void enabledFeatureRejectsMissingChatModelBean() {
        contextRunner
                .withPropertyValues(
                        "app.intelligence.content-analysis.enabled=true",
                        "spring.ai.model.chat=google-genai")
                .run(context -> {
                    Throwable failure = context.getStartupFailure();
                    assertNotNull(failure);
                    assertTrue(messageChain(failure).contains(
                            "exactly one ChatModel bean"));
                });
    }

    @Test
    void enabledGeminiRuntimeCreatesProviderBean() {
        contextRunner
                .withBean(ChatModel.class, () -> mock(ChatModel.class))
                .withPropertyValues(
                        "app.intelligence.content-analysis.enabled=true",
                        "app.intelligence.content-analysis.model-version=gemini-2.5-flash",
                        "spring.ai.model.chat=google-genai")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    ContentAnalysisProvider provider = context.getBean(ContentAnalysisProvider.class);
                    assertTrue(provider instanceof GeminiContentAnalysisProvider);
                    assertEquals("google-genai", provider.providerId());
                    assertEquals("gemini-2.5-flash", provider.modelVersion());
                });
    }

    @Test
    void documentedEnvironmentAliasesCreateProviderAndResolveCanonicalProperties() {
        contextRunner
                .withBean(ChatModel.class, () -> mock(ChatModel.class))
                .withPropertyValues(
                        "JC_AI_CONTENT_ANALYSIS_ENABLED=true",
                        "SPRING_AI_CHAT_MODEL=google-genai",
                        "app.intelligence.content-analysis.model-version=gemini-2.5-flash")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertEquals("true", context.getEnvironment().getProperty(
                            "app.intelligence.content-analysis.enabled"));
                    assertEquals("google-genai", context.getEnvironment().getProperty(
                            "spring.ai.model.chat"));
                    assertEquals(1, context.getBeanNamesForType(ContentAnalysisProvider.class).length);
                });
    }

    @Test
    void mutableModelAliasFailsDuringProviderCreation() {
        contextRunner
                .withBean(ChatModel.class, () -> mock(ChatModel.class))
                .withPropertyValues(
                        "app.intelligence.content-analysis.enabled=true",
                        "app.intelligence.content-analysis.model-version=latest",
                        "spring.ai.model.chat=google-genai")
                .run(context -> {
                    Throwable failure = context.getStartupFailure();
                    assertNotNull(failure);
                    assertTrue(messageChain(failure).contains("immutable version"));
                });
    }

    private static String messageChain(Throwable throwable) {
        StringBuilder message = new StringBuilder();
        Throwable current = throwable;
        while (current != null) {
            if (current.getMessage() != null) {
                message.append(current.getMessage()).append('\n');
            }
            current = current.getCause();
        }
        return message.toString();
    }
}
