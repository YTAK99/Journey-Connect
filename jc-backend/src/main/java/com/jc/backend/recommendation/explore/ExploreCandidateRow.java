package com.jc.backend.recommendation.explore;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

public record ExploreCandidateRow(
        long postId,
        long authorId,
        String regionCode,
        Instant createdAt,
        long viewCount,
        long likeCount,
        long bookmarkCount,
        long commentCount,
        List<String> tagSlugs) {

    public ExploreCandidateRow {
        if (postId <= 0 || authorId <= 0) {
            throw new IllegalArgumentException("postId and authorId must be positive");
        }
        regionCode = Objects.requireNonNull(regionCode, "regionCode");
        if (regionCode.isBlank()) {
            throw new IllegalArgumentException("regionCode must not be blank");
        }
        createdAt = Objects.requireNonNull(createdAt, "createdAt");
        if (viewCount < 0 || likeCount < 0 || bookmarkCount < 0 || commentCount < 0) {
            throw new IllegalArgumentException("candidate counters must not be negative");
        }
        tagSlugs = tagSlugs == null ? List.of() : List.copyOf(tagSlugs);
    }
}
