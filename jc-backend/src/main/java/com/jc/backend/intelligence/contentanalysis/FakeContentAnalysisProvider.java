package com.jc.backend.intelligence.contentanalysis;

import java.util.Objects;
import java.util.function.Function;

public final class FakeContentAnalysisProvider implements ContentAnalysisProvider {

    private final Function<PostContentAnalysisInputV1, PostContentAnalysisResultV1> responder;
    private final PostContentAnalysisValidator validator;

    public FakeContentAnalysisProvider(
            Function<PostContentAnalysisInputV1, PostContentAnalysisResultV1> responder,
            PostContentAnalysisValidator validator) {
        this.responder = Objects.requireNonNull(responder, "responder");
        this.validator = Objects.requireNonNull(validator, "validator");
    }

    @Override
    public String providerId() {
        return "fake-content-analysis";
    }

    @Override
    public PostContentAnalysisResultV1 analyze(PostContentAnalysisInputV1 input) {
        validator.validateInput(input);
        PostContentAnalysisResultV1 result = responder.apply(input);
        validator.validateResult(result, input);
        return result;
    }
}
