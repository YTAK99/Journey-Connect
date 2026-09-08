package com.jc.backend.intelligence.contentanalysis;

import java.util.List;

public record PostContentAnalysisInputV1(
        long postId,
        String title,
        String content,
        String regionName,
        List<String> sourceTags,
        String sourceContentVersion) {

    public PostContentAnalysisInputV1 {
        sourceTags = sourceTags == null ? List.of() : List.copyOf(sourceTags);
    }

    public String sourceText() {
        return title + "\n" + content;
    }
}
