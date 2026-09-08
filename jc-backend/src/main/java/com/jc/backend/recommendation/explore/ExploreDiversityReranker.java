package com.jc.backend.recommendation.explore;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Discovery base ranking 뒤에서 author/region/tag 반복 노출을 완화하는 deterministic reranker입니다.
 * baseScore 자체는 수정하지 않으며 adjustedScore는 선택 시점의 비교값으로만 사용합니다.
 */
public final class ExploreDiversityReranker {

    public List<DiversifiedCandidate> rerank(
            List<ExploreDiscoveryScore> baseRanking,
            boolean explicitRegion) {
        return rerank(baseRanking, explicitRegion, Policy.discoveryV1());
    }

    public List<DiversifiedCandidate> rerank(
            List<ExploreDiscoveryScore> baseRanking,
            boolean explicitRegion,
            Policy policy) {
        Objects.requireNonNull(baseRanking, "baseRanking");
        Objects.requireNonNull(policy, "policy");
        validateInput(baseRanking);

        if (baseRanking.isEmpty()) {
            return List.of();
        }

        double sparseScale = sparseScale(baseRanking.size(), policy.fullPressureCandidateCount());
        List<ExploreDiscoveryScore> remaining = new ArrayList<>(baseRanking);
        List<DiversifiedCandidate> selected = new ArrayList<>(baseRanking.size());

        while (!remaining.isEmpty()) {
            DiversifiedCandidate best = null;
            int bestIndex = -1;

            for (int index = 0; index < remaining.size(); index++) {
                ExploreDiscoveryScore candidate = remaining.get(index);
                Penalties penalties = penalties(candidate, selected, explicitRegion, sparseScale, policy);
                double adjusted = clamp(candidate.baseScore() - penalties.total());
                DiversifiedCandidate evaluated = new DiversifiedCandidate(
                        candidate,
                        adjusted,
                        penalties.author(),
                        penalties.region(),
                        penalties.tagOverlap(),
                        selected.size());

                if (best == null || better(evaluated, best)) {
                    best = evaluated;
                    bestIndex = index;
                }
            }

            selected.add(best);
            remaining.remove(bestIndex);
        }

        return List.copyOf(selected);
    }

    private static Penalties penalties(
            ExploreDiscoveryScore candidate,
            List<DiversifiedCandidate> selected,
            boolean explicitRegion,
            double sparseScale,
            Policy policy) {
        if (selected.isEmpty() || sparseScale == 0.0d) {
            return Penalties.none();
        }

        int start = Math.max(0, selected.size() - policy.lookbackWindow());
        int sameAuthor = 0;
        int sameRegion = 0;
        Set<String> recentTags = new HashSet<>();

        for (int index = start; index < selected.size(); index++) {
            ExploreCandidateFeatures previous = selected.get(index).score().candidate();
            if (previous.authorId() == candidate.candidate().authorId()) {
                sameAuthor++;
            }
            if (!explicitRegion && previous.regionCode().equalsIgnoreCase(candidate.candidate().regionCode())) {
                sameRegion++;
            }
            for (String tag : previous.tags()) {
                if (tag != null && !tag.isBlank()) {
                    recentTags.add(tag.trim());
                }
            }
        }

        double authorPenalty = clamp(policy.authorPenaltyPerRepeat() * sameAuthor * sparseScale);
        double regionPenalty = explicitRegion
                ? 0.0d
                : clamp(policy.regionPenaltyPerRepeat() * sameRegion * sparseScale);
        double tagPenalty = clamp(
                policy.tagOverlapPenalty()
                        * tagOverlap(candidate.candidate().tags(), recentTags)
                        * sparseScale);
        return new Penalties(authorPenalty, regionPenalty, tagPenalty);
    }

    private static double tagOverlap(List<String> tags, Set<String> recentTags) {
        if (tags == null || tags.isEmpty() || recentTags.isEmpty()) {
            return 0.0d;
        }
        Set<String> unique = new HashSet<>();
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                unique.add(tag.trim());
            }
        }
        if (unique.isEmpty()) {
            return 0.0d;
        }
        long overlaps = unique.stream().filter(recentTags::contains).count();
        return (double) overlaps / unique.size();
    }

    private static boolean better(DiversifiedCandidate left, DiversifiedCandidate right) {
        int adjusted = Double.compare(left.adjustedScore(), right.adjustedScore());
        if (adjusted != 0) {
            return adjusted > 0;
        }
        int base = Double.compare(left.score().baseScore(), right.score().baseScore());
        if (base != 0) {
            return base > 0;
        }
        int quality = Double.compare(left.score().quality(), right.score().quality());
        if (quality != 0) {
            return quality > 0;
        }
        int freshness = Double.compare(left.score().freshness(), right.score().freshness());
        if (freshness != 0) {
            return freshness > 0;
        }
        int created = left.score().candidate().createdAt()
                .compareTo(right.score().candidate().createdAt());
        if (created != 0) {
            return created > 0;
        }
        return left.postId() > right.postId();
    }

    private static double sparseScale(int candidateCount, int fullPressureCandidateCount) {
        if (candidateCount <= 1) {
            return 0.0d;
        }
        if (fullPressureCandidateCount <= 1 || candidateCount >= fullPressureCandidateCount) {
            return 1.0d;
        }
        return (double) (candidateCount - 1) / (fullPressureCandidateCount - 1);
    }

    private static void validateInput(List<ExploreDiscoveryScore> ranking) {
        Set<Long> ids = new HashSet<>();
        for (ExploreDiscoveryScore score : ranking) {
            Objects.requireNonNull(score, "score");
            if (!ExploreRankingPolicy.DISCOVERY_RANKING_VERSION.equals(score.rankingVersion())) {
                throw new IllegalArgumentException("diversity reranker requires discovery ranking");
            }
            if (!ids.add(score.postId())) {
                throw new IllegalArgumentException("duplicate discovery postId: " + score.postId());
            }
        }
    }

    private static double clamp(double value) {
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException("diversity score must be finite");
        }
        return Math.max(0.0d, Math.min(value, 1.0d));
    }

    public record Policy(
            int lookbackWindow,
            int fullPressureCandidateCount,
            double authorPenaltyPerRepeat,
            double regionPenaltyPerRepeat,
            double tagOverlapPenalty) {

        public Policy {
            if (lookbackWindow <= 0) {
                throw new IllegalArgumentException("lookbackWindow must be positive");
            }
            if (fullPressureCandidateCount <= 1) {
                throw new IllegalArgumentException("fullPressureCandidateCount must be greater than one");
            }
            authorPenaltyPerRepeat = unit(authorPenaltyPerRepeat, "authorPenaltyPerRepeat");
            regionPenaltyPerRepeat = unit(regionPenaltyPerRepeat, "regionPenaltyPerRepeat");
            tagOverlapPenalty = unit(tagOverlapPenalty, "tagOverlapPenalty");
        }

        public static Policy discoveryV1() {
            return new Policy(10, 10, 0.08d, 0.04d, 0.06d);
        }

        private static double unit(double value, String field) {
            if (!Double.isFinite(value) || value < 0.0d || value > 1.0d) {
                throw new IllegalArgumentException(field + " must be finite and within [0,1]");
            }
            return value == 0.0d ? 0.0d : value;
        }
    }

    public record DiversifiedCandidate(
            ExploreDiscoveryScore score,
            double adjustedScore,
            double authorPenalty,
            double regionPenalty,
            double tagOverlapPenalty,
            int finalIndex) {

        public DiversifiedCandidate {
            score = Objects.requireNonNull(score, "score");
            adjustedScore = unit(adjustedScore, "adjustedScore");
            authorPenalty = unit(authorPenalty, "authorPenalty");
            regionPenalty = unit(regionPenalty, "regionPenalty");
            tagOverlapPenalty = unit(tagOverlapPenalty, "tagOverlapPenalty");
            if (finalIndex < 0) {
                throw new IllegalArgumentException("finalIndex must not be negative");
            }
        }

        public long postId() {
            return score.postId();
        }

        public double baseScore() {
            return score.baseScore();
        }

        private static double unit(double value, String field) {
            if (!Double.isFinite(value) || value < 0.0d || value > 1.0d) {
                throw new IllegalArgumentException(field + " must be finite and within [0,1]");
            }
            return value == 0.0d ? 0.0d : value;
        }
    }

    private record Penalties(double author, double region, double tagOverlap) {
        static Penalties none() {
            return new Penalties(0.0d, 0.0d, 0.0d);
        }

        double total() {
            return author + region + tagOverlap;
        }
    }
}
