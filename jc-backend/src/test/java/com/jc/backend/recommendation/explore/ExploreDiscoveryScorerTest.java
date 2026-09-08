package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.OptionalDouble;
import org.junit.jupiter.api.Test;

class ExploreDiscoveryScorerTest {

    private static final Instant NOW = Instant.parse("2026-08-13T09:00:00Z");
    private final ExploreDiscoveryScorer scorer = new ExploreDiscoveryScorer();

    @Test
    void defaultPolicyUsesVersionBoundHeuristicWeights() {
        ExploreScoringPolicy.Discovery policy = ExploreScoringPolicy.discoveryV1();

        assertThat(policy.rankingVersion()).isEqualTo(ExploreRankingPolicy.DISCOVERY_RANKING_VERSION);
        assertThat(policy.relevanceWeight()).isEqualTo(0.30d);
        assertThat(policy.qualityWeight()).isEqualTo(0.25d);
        assertThat(policy.freshnessWeight()).isEqualTo(0.25d);
        assertThat(policy.explorationWeight()).isEqualTo(0.20d);
        assertThat(policy.qualityWeights().bookmark()).isGreaterThan(policy.qualityWeights().like());
        assertThat(policy.qualityWeights().like()).isGreaterThan(policy.qualityWeights().comment());
        assertThat(policy.qualityWeights().comment()).isGreaterThan(policy.qualityWeights().view());
    }

    @Test
    void qualityRespectsBookmarkLikeCommentViewPriority() {
        ExploreDiscoveryScore bookmark = scorer.score(feature(1, 0, 0, 1, 0, 1.0d, OptionalDouble.empty()));
        ExploreDiscoveryScore like = scorer.score(feature(2, 0, 1, 0, 0, 1.0d, OptionalDouble.empty()));
        ExploreDiscoveryScore comment = scorer.score(feature(3, 0, 0, 0, 1, 1.0d, OptionalDouble.empty()));
        ExploreDiscoveryScore view = scorer.score(feature(4, 1, 0, 0, 0, 1.0d, OptionalDouble.empty()));

        assertThat(bookmark.quality()).isEqualTo(0.45d);
        assertThat(like.quality()).isEqualTo(0.30d);
        assertThat(comment.quality()).isEqualTo(0.20d);
        assertThat(view.quality()).isEqualTo(0.05d);
    }

    @Test
    void missingRelevanceIsExcludedAndActiveWeightsAreRenormalized() {
        ExploreCandidateFeatures anonymous = feature(1, 0, 0, 0, 0, 0.50d, OptionalDouble.empty());
        ExploreCandidateFeatures explicitZeroAffinity = feature(2, 0, 0, 0, 0, 0.50d, OptionalDouble.of(0.0d));

        ExploreDiscoveryScore anonymousScore = scorer.score(anonymous);
        ExploreDiscoveryScore zeroAffinityScore = scorer.score(explicitZeroAffinity);

        assertThat(anonymousScore.relevance()).isEmpty();
        assertThat(zeroAffinityScore.relevance()).hasValue(0.0d);
        assertThat(anonymousScore.baseScore()).isGreaterThan(zeroAffinityScore.baseScore());
    }

    @Test
    void freshZeroEngagementCandidateGetsExplorationValue() {
        ExploreDiscoveryScore score = scorer.score(feature(1, 0, 0, 0, 0, 1.0d, OptionalDouble.empty()));

        assertThat(score.quality()).isZero();
        assertThat(score.exploration()).isEqualTo(1.0d);
        assertThat(score.baseScore()).isCloseTo(0.6428571428571429d, within());
    }

    @Test
    void staleZeroEvidenceCandidateDoesNotReceiveExplorationBonus() {
        ExploreDiscoveryScore score = scorer.score(feature(1, 0, 0, 0, 0, 0.10d, OptionalDouble.empty()));

        assertThat(score.quality()).isZero();
        assertThat(score.exploration()).isZero();
    }

    @Test
    void oldViralPostDoesNotAutomaticallyBeatFreshZeroEngagementPost() {
        ExploreCandidateFeatures oldViral = feature(1, 1, 1, 1, 1, 0.05d, OptionalDouble.empty());
        ExploreCandidateFeatures freshNew = feature(2, 0, 0, 0, 0, 1.0d, OptionalDouble.empty());

        List<ExploreDiscoveryScore> ranked = scorer.rank(List.of(oldViral, freshNew));

        assertThat(ranked).extracting(ExploreDiscoveryScore::postId).containsExactly(2L, 1L);
    }

    @Test
    void relevanceIsBoundedAndCannotTurnDiscoveryIntoPurePersonalization() {
        ExploreCandidateFeatures affinityOnly = feature(1, 0, 0, 0, 0, 0.10d, OptionalDouble.of(1.0d));
        ExploreCandidateFeatures strongDiscovery = feature(2, 1, 1, 1, 1, 1.0d, OptionalDouble.of(0.0d));

        List<ExploreDiscoveryScore> ranked = scorer.rank(List.of(affinityOnly, strongDiscovery));

        assertThat(ranked).extracting(ExploreDiscoveryScore::postId).containsExactly(2L, 1L);
        assertThat(ranked.get(1).baseScore()).isLessThanOrEqualTo(0.325d);
    }

    @Test
    void rankingIsDeterministicAndUsesStableTieBreaks() {
        ExploreCandidateFeatures older = featureAt(1, NOW.minusSeconds(60), 0, 0, 0, 0, 0.5d, OptionalDouble.empty());
        ExploreCandidateFeatures newerLowId = featureAt(2, NOW, 0, 0, 0, 0, 0.5d, OptionalDouble.empty());
        ExploreCandidateFeatures newerHighId = featureAt(3, NOW, 0, 0, 0, 0, 0.5d, OptionalDouble.empty());

        List<Long> first = scorer.rank(List.of(older, newerLowId, newerHighId)).stream()
                .map(ExploreDiscoveryScore::postId)
                .toList();
        List<Long> second = scorer.rank(List.of(newerHighId, older, newerLowId)).stream()
                .map(ExploreDiscoveryScore::postId)
                .toList();

        assertThat(first).containsExactly(3L, 2L, 1L);
        assertThat(second).isEqualTo(first);
    }

    @Test
    void rejectsPolicyDriftAndInvalidWeights() {
        assertThatThrownBy(() -> new ExploreScoringPolicy.Discovery(
                        ExploreRankingPolicy.SEARCH_RANKING_VERSION,
                        0.30d,
                        0.25d,
                        0.25d,
                        0.20d,
                        new ExploreScoringPolicy.QualityWeights(0.05d, 0.30d, 0.45d, 0.20d),
                        0.35d,
                        0.20d))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> new ExploreScoringPolicy.QualityWeights(0.25d, 0.25d, 0.25d, 0.25d))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static ExploreCandidateFeatures feature(
            long postId,
            double view,
            double like,
            double bookmark,
            double comment,
            double freshness,
            OptionalDouble affinity) {
        return featureAt(postId, NOW, view, like, bookmark, comment, freshness, affinity);
    }

    private static ExploreCandidateFeatures featureAt(
            long postId,
            Instant createdAt,
            double view,
            double like,
            double bookmark,
            double comment,
            double freshness,
            OptionalDouble affinity) {
        return new ExploreCandidateFeatures(
                postId,
                10L + postId,
                "kr-11",
                List.of("travel"),
                createdAt,
                0L,
                0L,
                0L,
                0L,
                new ExploreCandidateFeatures.NormalizedPopularity(view, like, bookmark, comment),
                freshness,
                affinity);
    }

    private static org.assertj.core.data.Offset<Double> within() {
        return org.assertj.core.data.Offset.offset(1.0e-12d);
    }
}
