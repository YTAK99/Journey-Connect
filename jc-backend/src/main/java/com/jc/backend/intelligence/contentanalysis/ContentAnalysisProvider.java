package com.jc.backend.intelligence.contentanalysis;

public interface ContentAnalysisProvider {

    String providerId();

    String modelVersion();

    ProviderAnalysisOutputV1 analyze(PostContentAnalysisInputV1 input);
}
