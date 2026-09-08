package com.jc.backend.intelligence.contentanalysis;

import java.util.Optional;

public interface PostContentAnalysisResultStore {

    void append(PostContentAnalysisResultV1 result);

    Optional<PostContentAnalysisResultV1> findByAnalysisRunId(String analysisRunId);
}
