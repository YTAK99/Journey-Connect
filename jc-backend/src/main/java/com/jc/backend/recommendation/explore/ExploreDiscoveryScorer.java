package com.jc.backend.recommendation.explore;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.OptionalDouble;

/** Explore Discovery의 base score만 계산합니다. Diversity rerank는 EX-5 책임입니다. */
public final class ExploreDiscoveryScorer {

    public ExploreDiscoveryScore score(ExploreCandidateFeatures candidate) {
        return score(candidate, ExploreScoringPolicy.discoveryV1());
    }

    public ExploreDiscoveryScore score(
            ExploreCandidateFeatures candidate,
            ExploreScoringPolicy.Discovery policy) {
        Objects.requireNonNull(candidate, "candidate");
        Objects.requireNonNull(policy, "policy");

        double quality = policy.qualityWeights().score(candidate.normalizedPopularity());
        double freshness = candidate.freshness();
        double exploration = exploration(quality, freshness, policy);
        OptionalDouble relevance = candidate.optionalUserAffinity();
        double baseScore = activeWeightScore(relevance, quality, freshness, exploration, policy);

        return new ExploreDiscoveryScore(
                candidate,
                relevance,
                quality,
                freshness,
                exploration,
                baseScore,
                policy.rankingVersion());
    }

    public List<ExploreDiscoveryScore> rank(List<ExploreCandidateFeatures> candidates) {
        return rank(candidates, ExploreScoringPolicy.discoveryV1());
    }

    public List<ExploreDiscoveryScore> rank(
            List<ExploreCandidateFeatures> candidates,
            ExploreScoringPolicy.Discovery policy) {
        Objects.requireNonNull(candidates, "candidates");
        Objects.requireNonNull(policy, "policy");
        return candidates.stream()
                .map(candidate -> score(Objects.requireNonNull(candidate, "candidate"), policy))
                .sorted(ordering())
                .toList();
    }

    static double exploration(
            double quality,
            double freshness,
            ExploreScoringPolicy.Discovery policy) {
        boolean eligible = freshness >= policy.explorationFreshnessFloor()
                || quality >= policy.explorationQualityFloor();
        if (!eligible) {
            return 0.0d;
        }
        return ExploreScoringPolicy.clamp(1.0d - quality);
    }

    private static double activeWeightScore(
            OptionalDouble relevance,
            double quality,
            double freshness,
            double exploration,
            ExploreScoringPolicy.Discovery policy) {
        double weighted = policy.qualityWeight() * quality
                + policy.freshnessWeight() * freshness
                + policy.explorationWeight() * exploration;
        double activeWeight = policy.qualityWeight()
                + policy.freshnessWeight()
                + policy.explorationWeight();

        if (relevance.isPresent()) {
            weighted += policy.relevanceWeight() * relevance.getAsDouble();
            activeWeight += policy.relevanceWeight();
        }
        if (activeWeight <= 0.0d) {
            throw new IllegalStateException("at least one discovery score term must be active");
        }
        return ExploreScoringPolicy.clamp(weighted / activeWeight);
    }

    private static Comparator<ExploreDiscoveryScore> ordering() {
        return Comparator.comparingDouble(ExploreDiscoveryScore::baseScore).reversed()
                .thenComparing(Comparator.comparingDouble(ExploreDiscoveryScore::quality).reversed())
                .thenComparing(Comparator.comparingDouble(ExploreDiscoveryScore::freshness).reversed())
                .thenComparing(
                        score -> score.candidate().createdAt(),
                        Comparator.reverseOrder())
                .thenComparing(
                        ExploreDiscoveryScore::postId,
                        Comparator.reverseOrder());
    }
}
