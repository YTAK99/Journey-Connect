package com.jc.backend.recommendation.explore;

import java.util.Objects;

/** Explore V1 scoring에서 사용하는 version-bound heuristic policy입니다. */
public final class ExploreScoringPolicy {

    private ExploreScoringPolicy() {}

    public static Discovery discoveryV1() {
        return new Discovery(
                ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                0.30d,
                0.25d,
                0.25d,
                0.20d,
                new QualityWeights(0.05d, 0.30d, 0.45d, 0.20d),
                0.35d,
                0.20d);
    }

    public static Search searchV1() {
        return new Search(
                ExploreRankingPolicy.SEARCH_RANKING_VERSION,
                new QualityWeights(0.05d, 0.30d, 0.45d, 0.20d));
    }

    public record QualityWeights(
            double view,
            double like,
            double bookmark,
            double comment) {

        public QualityWeights {
            view = unit(view, "view quality weight");
            like = unit(like, "like quality weight");
            bookmark = unit(bookmark, "bookmark quality weight");
            comment = unit(comment, "comment quality weight");
            requireUnitSum(view + like + bookmark + comment, "quality weights");
            if (!(bookmark > like && like > comment && comment > view)) {
                throw new IllegalArgumentException("quality weights must satisfy bookmark > like > comment > view");
            }
        }

        double score(ExploreCandidateFeatures.NormalizedPopularity popularity) {
            Objects.requireNonNull(popularity, "popularity");
            return clamp(
                    view * popularity.view()
                            + like * popularity.like()
                            + bookmark * popularity.bookmark()
                            + comment * popularity.comment());
        }
    }

    public record Discovery(
            String rankingVersion,
            double relevanceWeight,
            double qualityWeight,
            double freshnessWeight,
            double explorationWeight,
            QualityWeights qualityWeights,
            double explorationFreshnessFloor,
            double explorationQualityFloor) {

        public Discovery {
            rankingVersion = Objects.requireNonNull(rankingVersion, "rankingVersion");
            if (!ExploreRankingPolicy.DISCOVERY_RANKING_VERSION.equals(rankingVersion)) {
                throw new IllegalArgumentException("discovery policy rankingVersion mismatch");
            }
            relevanceWeight = unit(relevanceWeight, "relevanceWeight");
            qualityWeight = unit(qualityWeight, "qualityWeight");
            freshnessWeight = unit(freshnessWeight, "freshnessWeight");
            explorationWeight = unit(explorationWeight, "explorationWeight");
            requireUnitSum(
                    relevanceWeight + qualityWeight + freshnessWeight + explorationWeight,
                    "discovery weights");
            qualityWeights = Objects.requireNonNull(qualityWeights, "qualityWeights");
            explorationFreshnessFloor = unit(explorationFreshnessFloor, "explorationFreshnessFloor");
            explorationQualityFloor = unit(explorationQualityFloor, "explorationQualityFloor");
        }
    }

    public record Search(
            String rankingVersion,
            QualityWeights qualityWeights) {

        public Search {
            rankingVersion = Objects.requireNonNull(rankingVersion, "rankingVersion");
            if (!ExploreRankingPolicy.SEARCH_RANKING_VERSION.equals(rankingVersion)) {
                throw new IllegalArgumentException("search policy rankingVersion mismatch");
            }
            qualityWeights = Objects.requireNonNull(qualityWeights, "qualityWeights");
        }
    }

    private static double unit(double value, String field) {
        if (!Double.isFinite(value) || value < 0.0d || value > 1.0d) {
            throw new IllegalArgumentException(field + " must be finite and within [0,1]");
        }
        return value == 0.0d ? 0.0d : value;
    }

    private static void requireUnitSum(double sum, String field) {
        if (!Double.isFinite(sum) || Math.abs(sum - 1.0d) > 1.0e-12d) {
            throw new IllegalArgumentException(field + " must sum to 1.0");
        }
    }

    static double clamp(double value) {
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException("score must be finite");
        }
        return Math.max(0.0d, Math.min(value, 1.0d));
    }
}
