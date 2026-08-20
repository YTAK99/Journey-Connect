package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.OptionalDouble;
import org.junit.jupiter.api.Test;

class ExploreDiversityRerankerTest {

    private static final Instant NOW = Instant.parse("2026-08-14T00:00:00Z");

    private final ExploreDiversityReranker reranker = new ExploreDiversityReranker();

    @Test
    void penalizesRepeatedAuthorWithoutChangingBaseScore() {
        List<ExploreDiscoveryScore> base = List.of(
                score(1, 10, "kr-11", List.of("cafe"), 0.90),
                score(2, 10, "kr-26", List.of("beach"), 0.89),
                score(3, 20, "jp-13", List.of("history"), 0.88));

        List<ExploreDiversityReranker.DiversifiedCandidate> result = reranker.rerank(base, false);

        assertThat(result).extracting(ExploreDiversityReranker.DiversifiedCandidate::postId)
                .containsExactly(1L, 3L, 2L);
        assertThat(result.get(2).authorPenalty()).isGreaterThan(0.0d);
        assertThat(result.get(2).baseScore()).isEqualTo(0.89d);
    }

    @Test
    void disablesRegionPenaltyWhenRegionIsExplicitHardFilter() {
        List<ExploreDiscoveryScore> base = List.of(
                score(1, 10, "kr-11", List.of("cafe"), 0.90),
                score(2, 20, "kr-11", List.of("beach"), 0.885),
                score(3, 30, "jp-13", List.of("history"), 0.88));

        List<ExploreDiversityReranker.DiversifiedCandidate> allRegion = reranker.rerank(base, false);
        List<ExploreDiversityReranker.DiversifiedCandidate> explicitRegion = reranker.rerank(base, true);

        assertThat(allRegion.get(1).postId()).isEqualTo(3L);
        assertThat(explicitRegion).extracting(ExploreDiversityReranker.DiversifiedCandidate::postId)
                .containsExactly(1L, 2L, 3L);
        assertThat(explicitRegion).allMatch(candidate -> candidate.regionPenalty() == 0.0d);
    }

    @Test
    void penalizesTagOverlap() {
        List<ExploreDiscoveryScore> base = List.of(
                score(1, 10, "kr-11", List.of("cafe", "seoul"), 0.90),
                score(2, 20, "jp-13", List.of("cafe", "seoul"), 0.89),
                score(3, 30, "us-ca", List.of("beach"), 0.88));

        List<ExploreDiversityReranker.DiversifiedCandidate> result = reranker.rerank(base, true);

        assertThat(result).extracting(ExploreDiversityReranker.DiversifiedCandidate::postId)
                .containsExactly(1L, 3L, 2L);
        assertThat(result.get(2).tagOverlapPenalty()).isGreaterThan(0.0d);
    }

    @Test
    void relaxesPenaltyPressureForSparseCandidateSet() {
        ExploreDiversityReranker.Policy policy =
                new ExploreDiversityReranker.Policy(10, 10, 0.50d, 0.0d, 0.0d);

        List<ExploreDiscoveryScore> sparse = List.of(
                score(1, 10, "kr-11", List.of(), 0.90),
                score(2, 10, "kr-26", List.of(), 0.89));

        List<ExploreDiversityReranker.DiversifiedCandidate> result =
                reranker.rerank(sparse, false, policy);

        assertThat(result.get(1).authorPenalty()).isGreaterThan(0.0d).isLessThan(0.50d);
    }

    @Test
    void deterministicTieFallsBackToPostId() {
        List<ExploreDiscoveryScore> base = List.of(
                score(1, 10, "kr-11", List.of(), 0.50),
                score(2, 20, "jp-13", List.of(), 0.50));

        List<Long> first = reranker.rerank(base, false).stream()
                .map(ExploreDiversityReranker.DiversifiedCandidate::postId)
                .toList();
        List<Long> second = reranker.rerank(base, false).stream()
                .map(ExploreDiversityReranker.DiversifiedCandidate::postId)
                .toList();

        assertThat(first).isEqualTo(second);
        assertThat(first).containsExactly(2L, 1L);
    }

    @Test
    void rejectsDuplicatePostIds() {
        List<ExploreDiscoveryScore> base = List.of(
                score(1, 10, "kr-11", List.of(), 0.90),
                score(1, 20, "jp-13", List.of(), 0.80));

        assertThatThrownBy(() -> reranker.rerank(base, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static ExploreDiscoveryScore score(
            long postId,
            long authorId,
            String region,
            List<String> tags,
            double baseScore) {
        ExploreCandidateFeatures features = new ExploreCandidateFeatures(
                postId,
                authorId,
                region,
                tags,
                NOW,
                0,
                0,
                0,
                0,
                new ExploreCandidateFeatures.NormalizedPopularity(0.0, 0.0, 0.0, 0.0),
                0.5,
                OptionalDouble.empty());
        return new ExploreDiscoveryScore(
                features,
                OptionalDouble.empty(),
                0.5,
                0.5,
                0.5,
                baseScore,
                ExploreRankingPolicy.DISCOVERY_RANKING_VERSION);
    }
}
