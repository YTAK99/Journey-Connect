package com.jc.backend.intelligence.contentanalysis;

import java.time.Instant;
import java.util.Optional;

public interface PostContentAnalysisJobStore {

    Optional<PostContentAnalysisJob> findByDedupeKey(
            long postId,
            String sourceContentVersion,
            String schemaVersion,
            String promptVersion);

    PostContentAnalysisJob saveIfAbsent(PostContentAnalysisJob job);

    PostContentAnalysisJob save(PostContentAnalysisJob job);

    int recoverStaleRunning(Instant staleBefore, Instant retryAt, int maxAttempts);

    Optional<PostContentAnalysisJob> claimNextReady(Instant now);
}
