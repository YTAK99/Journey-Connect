package com.jc.backend.intelligence.contentanalysis;

import java.util.Objects;
import java.util.function.Function;

public final class FakeContentAnalysisProvider implements ContentAnalysisProvider {

    private static final String DEFAULT_MODEL_VERSION = "fake-model-v1";

    private final String modelVersion;
    private final Function<PostContentAnalysisInputV1, ProviderAnalysisOutputV1> responder;
    private final PostContentAnalysisValidator validator;

    public FakeContentAnalysisProvider(
            Function<PostContentAnalysisInputV1, ProviderAnalysisOutputV1> responder,
            PostContentAnalysisValidator validator) {
        this(DEFAULT_MODEL_VERSION, responder, validator);
    }

    public FakeContentAnalysisProvider(
            String modelVersion,
            Function<PostContentAnalysisInputV1, ProviderAnalysisOutputV1> responder,
            PostContentAnalysisValidator validator) {
        this.modelVersion = Objects.requireNonNull(modelVersion, "modelVersion");
        this.responder = Objects.requireNonNull(responder, "responder");
        this.validator = Objects.requireNonNull(validator, "validator");
    }

    @Override
    public String providerId() {
        return "fake-content-analysis";
    }

    @Override
    public String modelVersion() {
        return modelVersion;
    }

    @Override
    public ProviderAnalysisOutputV1 analyze(PostContentAnalysisInputV1 input) {
        validator.validateInput(input);
        ProviderAnalysisOutputV1 output = responder.apply(input);
        validator.validateProviderOutput(output, input);
        return output;
    }
}
