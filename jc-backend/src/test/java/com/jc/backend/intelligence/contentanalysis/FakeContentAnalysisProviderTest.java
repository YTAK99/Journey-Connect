package com.jc.backend.intelligence.contentanalysis;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FakeContentAnalysisProviderTest {

    @Test
    void returnsOnlyValidatedConfiguredResult() {
        PostContentAnalysisValidator validator = new PostContentAnalysisValidator();
        PostContentAnalysisInputV1 input = PostContentAnalysisValidatorTest.validInput();
        FakeContentAnalysisProvider provider = new FakeContentAnalysisProvider(
                ignored -> PostContentAnalysisValidatorTest.validResult(input),
                validator);

        PostContentAnalysisResultV1 result = provider.analyze(input);

        assertThat(provider.providerId()).isEqualTo("fake-content-analysis");
        assertThat(result.summary()).contains("성수동");
        assertThat(result.status()).isEqualTo(AnalysisStatus.SUCCEEDED);
    }
}
