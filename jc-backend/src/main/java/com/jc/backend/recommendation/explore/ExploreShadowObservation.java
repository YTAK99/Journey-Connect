package com.jc.backend.recommendation.explore;

import com.jc.backend.post.PostDtos;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.TimeUnit;

public record ExploreShadowObservation(
        String rankingVersion,
        boolean explicitRegion,
        long rankingLatencyMs,
        int candidateCount,
        int topN,
        double topNOverlap,
        int uniqueAuthors,
        int uniqueRegions,
        double topAuthorShare) {

    private static final int DEFAULT_TOP_N = 10;

    public ExploreShadowObservation {
        Objects.requireNonNull(rankingVersion, "rankingVersion");
        if (rankingLatencyMs < 0 || candidateCount < 0 || topN < 0 || uniqueAuthors < 0 || uniqueRegions < 0) {
            throw new IllegalArgumentException("shadow observation counts must not be negative");
        }
        requireUnitInterval(topNOverlap, "topNOverlap");
        requireUnitInterval(topAuthorShare, "topAuthorShare");
    }

    public static ExploreShadowObservation compare(
            List<PostDtos.Summary> legacy,
            List<PostDtos.Summary> discovery,
            int candidateCount,
            long rankingLatencyNanos,
            boolean explicitRegion) {
        Objects.requireNonNull(legacy, "legacy");
        Objects.requireNonNull(discovery, "discovery");
        if (candidateCount < 0 || rankingLatencyNanos < 0) {
            throw new IllegalArgumentException("candidateCount and rankingLatencyNanos must not be negative");
        }

        int discoveryTopN = Math.min(DEFAULT_TOP_N, discovery.size());
        List<PostDtos.Summary> discoveryTop = discovery.subList(0, discoveryTopN);
        int comparableTopN = Math.min(DEFAULT_TOP_N, Math.min(legacy.size(), discovery.size()));

        Set<Long> legacyIds = new HashSet<>();
        for (int index = 0; index < comparableTopN; index++) {
            legacyIds.add(legacy.get(index).id());
        }
        long overlapCount = discovery.subList(0, comparableTopN).stream()
                .map(PostDtos.Summary::id)
                .filter(legacyIds::contains)
                .count();
        double overlap = comparableTopN == 0
                ? 0.0d
                : (double) overlapCount / comparableTopN;

        Set<Long> authors = new HashSet<>();
        Set<String> regions = new HashSet<>();
        Map<Long, Integer> authorCounts = new HashMap<>();
        for (PostDtos.Summary summary : discoveryTop) {
            if (summary.author() != null && summary.author().id() != null) {
                Long authorId = summary.author().id();
                authors.add(authorId);
                authorCounts.merge(authorId, 1, Integer::sum);
            }
            if (summary.regionCode() != null && !summary.regionCode().isBlank()) {
                regions.add(summary.regionCode());
            }
        }
        int maxAuthorCount = authorCounts.values().stream()
                .mapToInt(Integer::intValue)
                .max()
                .orElse(0);
        double topAuthorShare = discoveryTopN == 0
                ? 0.0d
                : (double) maxAuthorCount / discoveryTopN;

        return new ExploreShadowObservation(
                ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                explicitRegion,
                TimeUnit.NANOSECONDS.toMillis(rankingLatencyNanos),
                candidateCount,
                discoveryTopN,
                overlap,
                authors.size(),
                regions.size(),
                topAuthorShare);
    }

    private static void requireUnitInterval(double value, String field) {
        if (!Double.isFinite(value) || value < 0.0d || value > 1.0d) {
            throw new IllegalArgumentException(field + " must be finite and within [0,1]");
        }
    }
}
