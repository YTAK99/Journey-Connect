package com.jc.backend.intelligence.contentanalysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class FakeContentAnalysisProviderTest {

    @Test
    void returnsOnlyValidatedProviderPayload() {
        PostContentAnalysisValidator validator = new PostContentAnalysisValidator();
        PostContentAnalysisInputV1 input = PostContentAnalysisValidatorTest.validInput();
        FakeContentAnalysisProvider provider = new FakeContentAnalysisProvider(
                ignored -> validOutput(),
                validator);

        ProviderAnalysisOutputV1 output = provider.analyze(input);

        assertThat(provider.providerId()).isEqualTo("fake-content-analysis");
        assertThat(provider.modelVersion()).isEqualTo("fake-model-v1");
        assertThat(output.summary()).contains("성수동");
        assertThat(output.themes()).contains(ContentTheme.SHOPPING);
    }

    private static ProviderAnalysisOutputV1 validOutput() {
        return new ProviderAnalysisOutputV1(
                "ko",
                "성수동의 빈티지 매장과 카페를 둘러본 여행 후기입니다.",
                List.of(ContentTheme.SHOPPING, ContentTheme.CAFE),
                List.of(TravelStyle.WALKING),
                List.of("성수동", "빈티지"),
                List.of(),
                0.91);
    }
}
