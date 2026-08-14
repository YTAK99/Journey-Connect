package com.jc.backend.recommendation.explore;

import java.util.Objects;
import java.util.OptionalDouble;

public record ExploreDiscoveryScore(
        ExploreCandidateFeatures candidate,
        OptionalDouble relevance,
        double quality,
        double freshness,
        double exploration,
        double baseScore,
        String rankingVersion) {

    public ExploreDiscoveryScore {
        candidate = Objects.requireNonNull(candidate, "candidate");
        relevance = relevance == null ? OptionalDouble.empty() : relevance;
        if (relevance.isPresent()) {
            requireUnit(relevance.getAsDouble(), "relevance");
        }
        quality = requireUnit(quality, "quality");
        freshness = requireUnit(freshness, "freshness");
        exploration = requireUnit(exploration, "exploration");
        baseScore = requireUnit(baseScore, "baseScore");
        rankingVersion = Objects.requireNonNull(rankingVersion, "rankingVersion");
        if (!ExploreRankingPolicy.DISCOVERY_RANKING_VERSION.equals(rankingVersion)) {
            throw new IllegalArgumentException("discovery score rankingVersion mismatch");
        }
    }

    public long postId() {
        return candidate.postId();
    }

    private static double requireUnit(double value, String field) {
        if (!Double.isFinite(value) || value < 0.0d || value > 1.0d) {
            throw new IllegalArgumentException(field + " must be finite and within [0,1]");
        }
        return value == 0.0d ? 0.0d : value;
    }
}
