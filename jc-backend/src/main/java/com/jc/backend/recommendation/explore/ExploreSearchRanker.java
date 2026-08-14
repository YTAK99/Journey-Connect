package com.jc.backend.recommendation.explore;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Explicit Search는 relevance tier를 최우선으로 비교하고 동일 tier에서만 tie-break합니다. */
public final class ExploreSearchRanker {

    public List<RankedCandidate> rank(List<Candidate> candidates) {
        return rank(candidates, ExploreScoringPolicy.searchV1());
    }

    public List<RankedCandidate> rank(
            List<Candidate> candidates,
            ExploreScoringPolicy.Search policy) {
        Objects.requireNonNull(candidates, "candidates");
        Objects.requireNonNull(policy, "policy");
        return candidates.stream()
                .map(candidate -> score(Objects.requireNonNull(candidate, "candidate"), policy))
                .sorted(ordering())
                .toList();
    }

    public RankedCandidate score(Candidate candidate) {
        return score(candidate, ExploreScoringPolicy.searchV1());
    }

    public RankedCandidate score(Candidate candidate, ExploreScoringPolicy.Search policy) {
        Objects.requireNonNull(candidate, "candidate");
        Objects.requireNonNull(policy, "policy");
        Tier tier = candidate.relevance().tier();
        double quality = policy.qualityWeights().score(candidate.features().normalizedPopularity());
        return new RankedCandidate(
                candidate.features(),
                tier,
                quality,
                policy.rankingVersion());
    }

    private static Comparator<RankedCandidate> ordering() {
        return Comparator.comparing(RankedCandidate::tier)
                .thenComparing(Comparator.comparingDouble(RankedCandidate::freshness).reversed())
                .thenComparing(Comparator.comparingDouble(RankedCandidate::quality).reversed())
                .thenComparing(
                        candidate -> candidate.features().createdAt(),
                        Comparator.reverseOrder())
                .thenComparing(
                        RankedCandidate::postId,
                        Comparator.reverseOrder());
    }

    public enum Tier {
        A,
        B,
        C,
        D
    }

    public record RelevanceEvidence(
            boolean titleExact,
            boolean tagExact,
            boolean titleStrongMatch,
            boolean regionStrongMatch,
            boolean tagContains,
            boolean regionContains,
            boolean contentMatch) {

        public Tier tier() {
            if (titleExact || tagExact) {
                return Tier.A;
            }
            if (titleStrongMatch || regionStrongMatch) {
                return Tier.B;
            }
            if (tagContains || regionContains) {
                return Tier.C;
            }
            if (contentMatch) {
                return Tier.D;
            }
            throw new IllegalArgumentException("explicit search candidate requires relevance evidence");
        }
    }

    public record Candidate(
            ExploreCandidateFeatures features,
            RelevanceEvidence relevance) {

        public Candidate {
            features = Objects.requireNonNull(features, "features");
            relevance = Objects.requireNonNull(relevance, "relevance");
            relevance.tier();
        }
    }

    public record RankedCandidate(
            ExploreCandidateFeatures features,
            Tier tier,
            double quality,
            String rankingVersion) {

        public RankedCandidate {
            features = Objects.requireNonNull(features, "features");
            tier = Objects.requireNonNull(tier, "tier");
            quality = requireUnit(quality, "quality");
            rankingVersion = Objects.requireNonNull(rankingVersion, "rankingVersion");
            if (!ExploreRankingPolicy.SEARCH_RANKING_VERSION.equals(rankingVersion)) {
                throw new IllegalArgumentException("search rank rankingVersion mismatch");
            }
        }

        public long postId() {
            return features.postId();
        }

        public double freshness() {
            return features.freshness();
        }

        private static double requireUnit(double value, String field) {
            if (!Double.isFinite(value) || value < 0.0d || value > 1.0d) {
                throw new IllegalArgumentException(field + " must be finite and within [0,1]");
            }
            return value == 0.0d ? 0.0d : value;
        }
    }
}
