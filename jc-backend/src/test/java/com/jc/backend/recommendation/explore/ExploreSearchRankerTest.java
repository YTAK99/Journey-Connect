package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.OptionalDouble;
import org.junit.jupiter.api.Test;

class ExploreSearchRankerTest {

    private static final Instant NOW = Instant.parse("2026-08-13T09:00:00Z");
    private final ExploreSearchRanker ranker = new ExploreSearchRanker();

    @Test
    void classifiesLexicographicRelevanceTiers() {
        assertThat(evidence(true, false, false, false, false, false, false).tier())
                .isEqualTo(ExploreSearchRanker.Tier.A);
        assertThat(evidence(false, true, false, false, false, false, false).tier())
                .isEqualTo(ExploreSearchRanker.Tier.A);
        assertThat(evidence(false, false, true, false, false, false, false).tier())
                .isEqualTo(ExploreSearchRanker.Tier.B);
        assertThat(evidence(false, false, false, true, false, false, false).tier())
                .isEqualTo(ExploreSearchRanker.Tier.B);
        assertThat(evidence(false, false, false, false, true, false, false).tier())
                .isEqualTo(ExploreSearchRanker.Tier.C);
        assertThat(evidence(false, false, false, false, false, true, false).tier())
                .isEqualTo(ExploreSearchRanker.Tier.C);
        assertThat(evidence(false, false, false, false, false, false, true).tier())
                .isEqualTo(ExploreSearchRanker.Tier.D);
    }

    @Test
    void exactRelevanceAlwaysBeatsLowerTierPopularity() {
        ExploreSearchRanker.Candidate exactNoEngagement = candidate(
                1,
                0.10d,
                0.0d,
                evidence(true, false, false, false, false, false, false));
        ExploreSearchRanker.Candidate weakerViral = candidate(
                2,
                1.0d,
                1.0d,
                evidence(false, false, true, false, false, false, false));

        List<ExploreSearchRanker.RankedCandidate> ranked = ranker.rank(List.of(weakerViral, exactNoEngagement));

        assertThat(ranked).extracting(ExploreSearchRanker.RankedCandidate::postId).containsExactly(1L, 2L);
        assertThat(ranked.get(0).tier()).isEqualTo(ExploreSearchRanker.Tier.A);
        assertThat(ranked.get(1).tier()).isEqualTo(ExploreSearchRanker.Tier.B);
    }

    @Test
    void sameTierUsesFreshnessBeforeQuality() {
        ExploreSearchRanker.Candidate freshWeak = candidate(
                1,
                1.0d,
                0.0d,
                evidence(false, false, true, false, false, false, false));
        ExploreSearchRanker.Candidate olderStrong = candidate(
                2,
                0.50d,
                1.0d,
                evidence(false, false, false, true, false, false, false));

        List<ExploreSearchRanker.RankedCandidate> ranked = ranker.rank(List.of(olderStrong, freshWeak));

        assertThat(ranked).extracting(ExploreSearchRanker.RankedCandidate::postId).containsExactly(1L, 2L);
    }

    @Test
    void sameTierAndFreshnessUseQualityThenCreatedAtThenId() {
        ExploreSearchRanker.Candidate highQuality = candidateAt(
                1,
                NOW.minusSeconds(120),
                0.5d,
                1.0d,
                evidence(false, false, false, false, true, false, false));
        ExploreSearchRanker.Candidate lowQuality = candidateAt(
                2,
                NOW,
                0.5d,
                0.0d,
                evidence(false, false, false, false, false, true, false));

        List<ExploreSearchRanker.RankedCandidate> ranked = ranker.rank(List.of(lowQuality, highQuality));
        assertThat(ranked).extracting(ExploreSearchRanker.RankedCandidate::postId).containsExactly(1L, 2L);

        ExploreSearchRanker.Candidate tieLowId = candidateAt(
                3,
                NOW,
                0.5d,
                0.5d,
                evidence(false, false, false, false, true, false, false));
        ExploreSearchRanker.Candidate tieHighId = candidateAt(
                4,
                NOW,
                0.5d,
                0.5d,
                evidence(false, false, false, false, true, false, false));

        assertThat(ranker.rank(List.of(tieLowId, tieHighId)))
                .extracting(ExploreSearchRanker.RankedCandidate::postId)
                .containsExactly(4L, 3L);
    }

    @Test
    void rejectsCandidateWithoutSearchRelevanceEvidence() {
        assertThatThrownBy(() -> new ExploreSearchRanker.Candidate(
                        feature(1, NOW, 1.0d, 0.5d),
                        evidence(false, false, false, false, false, false, false)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void searchOutputIsBoundToSearchRankingVersion() {
        ExploreSearchRanker.RankedCandidate ranked = ranker.score(candidate(
                1,
                1.0d,
                0.5d,
                evidence(true, false, false, false, false, false, false)));

        assertThat(ranked.rankingVersion()).isEqualTo(ExploreRankingPolicy.SEARCH_RANKING_VERSION);
    }

    private static ExploreSearchRanker.Candidate candidate(
            long postId,
            double freshness,
            double qualityLevel,
            ExploreSearchRanker.RelevanceEvidence evidence) {
        return candidateAt(postId, NOW, freshness, qualityLevel, evidence);
    }

    private static ExploreSearchRanker.Candidate candidateAt(
            long postId,
            Instant createdAt,
            double freshness,
            double qualityLevel,
            ExploreSearchRanker.RelevanceEvidence evidence) {
        return new ExploreSearchRanker.Candidate(
                feature(postId, createdAt, freshness, qualityLevel),
                evidence);
    }

    private static ExploreCandidateFeatures feature(
            long postId,
            Instant createdAt,
            double freshness,
            double qualityLevel) {
        return new ExploreCandidateFeatures(
                postId,
                100L + postId,
                "kr-11",
                List.of("cafe"),
                createdAt,
                0L,
                0L,
                0L,
                0L,
                new ExploreCandidateFeatures.NormalizedPopularity(
                        qualityLevel,
                        qualityLevel,
                        qualityLevel,
                        qualityLevel),
                freshness,
                OptionalDouble.empty());
    }

    private static ExploreSearchRanker.RelevanceEvidence evidence(
            boolean titleExact,
            boolean tagExact,
            boolean titleStrong,
            boolean regionStrong,
            boolean tagContains,
            boolean regionContains,
            boolean contentMatch) {
        return new ExploreSearchRanker.RelevanceEvidence(
                titleExact,
                tagExact,
                titleStrong,
                regionStrong,
                tagContains,
                regionContains,
                contentMatch);
    }
}
