package com.jc.backend.recommendation.explore;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.OptionalDouble;

public record ExploreCandidateFeatures(
        long postId,
        long authorId,
        String regionCode,
        List<String> tags,
        Instant createdAt,
        long viewCount,
        long likeCount,
        long bookmarkCount,
        long commentCount,
        NormalizedPopularity normalizedPopularity,
        double freshness,
        OptionalDouble optionalUserAffinity) {

    public ExploreCandidateFeatures {
        if (postId <= 0 || authorId <= 0) {
            throw new IllegalArgumentException("postId and authorId must be positive");
        }
        regionCode = Objects.requireNonNull(regionCode, "regionCode");
        if (regionCode.isBlank()) {
            throw new IllegalArgumentException("regionCode must not be blank");
        }
        tags = tags == null ? List.of() : List.copyOf(tags);
        createdAt = Objects.requireNonNull(createdAt, "createdAt");
        if (viewCount < 0 || likeCount < 0 || bookmarkCount < 0 || commentCount < 0) {
            throw new IllegalArgumentException("candidate counters must not be negative");
        }
        normalizedPopularity = Objects.requireNonNull(normalizedPopularity, "normalizedPopularity");
        freshness = requireUnitInterval(freshness, "freshness");
        optionalUserAffinity = optionalUserAffinity == null ? OptionalDouble.empty() : optionalUserAffinity;
        if (optionalUserAffinity.isPresent()) {
            requireUnitInterval(optionalUserAffinity.getAsDouble(), "optionalUserAffinity");
        }
    }

    public record NormalizedPopularity(
            double view,
            double like,
            double bookmark,
            double comment) {

        public NormalizedPopularity {
            view = requireUnitInterval(view, "normalized view");
            like = requireUnitInterval(like, "normalized like");
            bookmark = requireUnitInterval(bookmark, "normalized bookmark");
            comment = requireUnitInterval(comment, "normalized comment");
        }
    }

    private static double requireUnitInterval(double value, String field) {
        if (!Double.isFinite(value) || value < 0.0d || value > 1.0d) {
            throw new IllegalArgumentException(field + " must be finite and within [0,1]");
        }
        return value == 0.0d ? 0.0d : value;
    }
}
