package com.jc.backend.intelligence.contentanalysis;

public interface ContentAnalysisProvider {

    String providerId();

    PostContentAnalysisResultV1 analyze(PostContentAnalysisInputV1 input);
}
