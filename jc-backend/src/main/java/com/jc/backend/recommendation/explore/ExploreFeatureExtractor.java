package com.jc.backend.recommendation.explore;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.function.ToLongFunction;

public final class ExploreFeatureExtractor {

    public ExploreFeatureSnapshot extract(
            List<ExploreCandidateRow> candidates,
            Instant referenceTime,
            Duration freshnessHalfLife) {
        return extract(candidates, referenceTime, freshnessHalfLife, Map.of());
    }

    public ExploreFeatureSnapshot extract(
            List<ExploreCandidateRow> candidates,
            Instant referenceTime,
            Duration freshnessHalfLife,
            Map<Long, Double> userAffinityByPostId) {
        Objects.requireNonNull(candidates, "candidates");
        Objects.requireNonNull(referenceTime, "referenceTime");
        Objects.requireNonNull(freshnessHalfLife, "freshnessHalfLife");
        Objects.requireNonNull(userAffinityByPostId, "userAffinityByPostId");
        if (freshnessHalfLife.isZero() || freshnessHalfLife.isNegative()) {
            throw new IllegalArgumentException("freshnessHalfLife must be positive");
        }

        validateCandidateIdentity(candidates);
        validateAffinity(userAffinityByPostId);

        long viewP95 = percentile95(candidates, ExploreCandidateRow::viewCount);
        long likeP95 = percentile95(candidates, ExploreCandidateRow::likeCount);
        long bookmarkP95 = percentile95(candidates, ExploreCandidateRow::bookmarkCount);
        long commentP95 = percentile95(candidates, ExploreCandidateRow::commentCount);

        ExploreFeatureSnapshot.Population population = new ExploreFeatureSnapshot.Population(
                candidates.size(),
                viewP95,
                likeP95,
                bookmarkP95,
                commentP95);

        List<ExploreCandidateFeatures> features = candidates.stream()
                .map(candidate -> new ExploreCandidateFeatures(
                        candidate.postId(),
                        candidate.authorId(),
                        candidate.regionCode(),
                        candidate.tagSlugs(),
                        candidate.createdAt(),
                        candidate.viewCount(),
                        candidate.likeCount(),
                        candidate.bookmarkCount(),
                        candidate.commentCount(),
                        new ExploreCandidateFeatures.NormalizedPopularity(
                                normalizeCount(candidate.viewCount(), viewP95),
                                normalizeCount(candidate.likeCount(), likeP95),
                                normalizeCount(candidate.bookmarkCount(), bookmarkP95),
                                normalizeCount(candidate.commentCount(), commentP95)),
                        freshness(candidate.createdAt(), referenceTime, freshnessHalfLife),
                        affinity(candidate.postId(), userAffinityByPostId)))
                .toList();

        return new ExploreFeatureSnapshot(referenceTime, population, features);
    }

    static double normalizeCount(long value, long candidateP95) {
        if (value < 0 || candidateP95 < 0) {
            throw new IllegalArgumentException("count normalization inputs must not be negative");
        }
        if (candidateP95 == 0L) {
            return 0.0d;
        }
        double normalized = Math.log1p((double) value) / Math.log1p((double) candidateP95);
        return Math.max(0.0d, Math.min(normalized, 1.0d));
    }

    static double freshness(Instant createdAt, Instant referenceTime, Duration halfLife) {
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(referenceTime, "referenceTime");
        Objects.requireNonNull(halfLife, "halfLife");
        if (halfLife.isZero() || halfLife.isNegative()) {
            throw new IllegalArgumentException("halfLife must be positive");
        }

        double ageSeconds = secondsBetween(createdAt, referenceTime);
        if (ageSeconds <= 0.0d) {
            return 1.0d;
        }
        double halfLifeSeconds = durationSeconds(halfLife);
        double value = Math.pow(0.5d, ageSeconds / halfLifeSeconds);
        return Math.max(0.0d, Math.min(value, 1.0d));
    }

    private static long percentile95(
            List<ExploreCandidateRow> candidates,
            ToLongFunction<ExploreCandidateRow> extractor) {
        if (candidates.isEmpty()) {
            return 0L;
        }
        List<Long> values = new ArrayList<>(candidates.size());
        for (ExploreCandidateRow candidate : candidates) {
            values.add(extractor.applyAsLong(candidate));
        }
        values.sort(Long::compareTo);
        int index = Math.max(0, (int) Math.ceil(values.size() * 0.95d) - 1);
        return values.get(index);
    }

    private static OptionalDouble affinity(long postId, Map<Long, Double> affinities) {
        Double value = affinities.get(postId);
        return value == null ? OptionalDouble.empty() : OptionalDouble.of(value);
    }

    private static void validateCandidateIdentity(List<ExploreCandidateRow> candidates) {
        Set<Long> postIds = new HashSet<>();
        for (ExploreCandidateRow candidate : candidates) {
            Objects.requireNonNull(candidate, "candidate");
            if (!postIds.add(candidate.postId())) {
                throw new IllegalArgumentException("duplicate candidate postId: " + candidate.postId());
            }
        }
    }

    private static void validateAffinity(Map<Long, Double> affinities) {
        for (Map.Entry<Long, Double> entry : affinities.entrySet()) {
            Long postId = Objects.requireNonNull(entry.getKey(), "affinity postId");
            Double value = Objects.requireNonNull(entry.getValue(), "affinity value");
            if (postId <= 0) {
                throw new IllegalArgumentException("affinity postId must be positive");
            }
            if (!Double.isFinite(value) || value < 0.0d || value > 1.0d) {
                throw new IllegalArgumentException("affinity must be finite and within [0,1]");
            }
        }
    }

    private static double secondsBetween(Instant start, Instant end) {
        long seconds = end.getEpochSecond() - start.getEpochSecond();
        int nanos = end.getNano() - start.getNano();
        return seconds + nanos / 1_000_000_000.0d;
    }

    private static double durationSeconds(Duration duration) {
        return duration.getSeconds() + duration.getNano() / 1_000_000_000.0d;
    }
}
