package com.jc.backend.intelligence.journeyai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.jc.backend.intelligence.contentanalysis.ContentAnalysisRuntimeProperties;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class JourneyAiRuntimeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(JourneyAiRuntimeConfiguration.class)
            .withBean(
                    ContentAnalysisRuntimeProperties.class,
                    ContentAnalysisRuntimeProperties::new);

    @Test
    void missingGoogleChatModelCreatesUnavailableBoundaryWithoutExternalCall() {
        contextRunner.run(context -> {
            assertThat(context.getStartupFailure()).isNull();

            JourneyAiModelClient client = context.getBean(JourneyAiModelClient.class);

            assertThatThrownBy(() -> client.chat("system", "user"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Google GenAI ChatModel is unavailable");
        });
    }

    @Test
    void mockedGoogleChatModelCreatesSpringAiBoundaryWithoutCredentials() {
        contextRunner
                .withBean(ChatModel.class, () -> mock(ChatModel.class))
                .withPropertyValues("spring.ai.model.chat=google-genai")
                .run(context -> {
                    assertThat(context.getStartupFailure()).isNull();
                    assertThat(context.getBean(JourneyAiModelClient.class))
                            .isInstanceOf(SpringAiJourneyAiModelClient.class);
                });
    }

    @Test
    void nonGoogleSelectionNeverRequiresProviderCredentials() {
        contextRunner
                .withPropertyValues("spring.ai.model.chat=none")
                .run(context -> {
                    assertThat(context.getStartupFailure()).isNull();
                    assertThat(context.getBean(JourneyAiModelClient.class))
                            .isNotInstanceOf(SpringAiJourneyAiModelClient.class);
                });
    }
}
