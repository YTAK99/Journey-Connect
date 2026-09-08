package com.jc.backend.intelligence.contentanalysis;

import java.util.Optional;

public interface PostContentAnalysisInputSnapshotStore {

    void saveIfAbsent(PostContentAnalysisInputV1 input);

    Optional<PostContentAnalysisInputV1> find(long postId, String sourceContentVersion);
}
