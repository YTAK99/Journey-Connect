package com.jc.backend.crew;

import com.jc.backend.crew.CrewRecommendationCandidateSource.Candidate;
import com.jc.backend.crew.CrewRecommendationCandidateSource.TagValue;
import com.jc.recommendation.model.feature.PreferenceKind;
import com.jc.recommendation.p1.profile.P1FeatureSignal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** 기존 P1 관심 신호와 크루 상태를 결합하는 deterministic V1 scorer입니다. */
@Component
public class CrewRecommendationScorer {

    public Score score(
            Candidate candidate,
            Map<String, P1FeatureSignal> signals,
            LocalDateTime referenceTime) {
        double regionAffinity = affinity(
                CrewRecommendationFeatureMapper.regionFeature(candidate.regionCode()),
                signals);
        double tagAffinity = tagAffinity(candidate.tags(), signals);
        double balance = balance(candidate.memberCount(), candidate.capacity());
        double freshness = freshness(candidate.createdAt(), referenceTime);

        double total = CrewRecommendationPolicy.REGION_WEIGHT * regionAffinity
                + CrewRecommendationPolicy.TAG_WEIGHT * tagAffinity
                + CrewRecommendationPolicy.BALANCE_WEIGHT * balance
                + CrewRecommendationPolicy.FRESHNESS_WEIGHT * freshness;

        List<String> reasons = new ArrayList<>();
        if (regionAffinity > 0.5d) {
            reasons.add("REGION_MATCH");
        }
        if (tagAffinity > 0.5d) {
            reasons.add("TAG_MATCH");
        }
        if (balance >= 0.75d) {
            reasons.add("GOOD_CAPACITY");
        }
        if (freshness >= 0.75d) {
            reasons.add("FRESH_CREW");
        }
        return new Score(round4(clamp(total)), reasons);
    }

    private static double tagAffinity(List<TagValue> tags, Map<String, P1FeatureSignal> signals) {
        Set<String> features = new LinkedHashSet<>();
        for (TagValue tag : tags) {
            String feature = CrewRecommendationFeatureMapper.tagFeature(tag.normalizedName());
            if (feature != null) {
                features.add(feature);
            }
        }
        if (features.isEmpty()) {
            return 0.5d;
        }
        return features.stream()
                .mapToDouble(feature -> affinity(feature, signals))
                .average()
                .orElse(0.5d);
    }

    private static double affinity(String featureId, Map<String, P1FeatureSignal> signals) {
        if (featureId == null) {
            return 0.5d;
        }
        P1FeatureSignal signal = signals.get(featureId);
        if (signal == null) {
            return 0.5d;
        }
        double direction = signal.direction() == PreferenceKind.PREFER ? 1.0d : -1.0d;
        return clamp(0.5d + direction * signal.strength() * 0.5d);
    }

    private static double balance(long memberCount, int capacity) {
        if (capacity <= 0) {
            return 0.0d;
        }
        double occupancy = clamp((double) memberCount / (double) capacity);
        return clamp(4.0d * occupancy * (1.0d - occupancy));
    }

    private static double freshness(LocalDateTime createdAt, LocalDateTime referenceTime) {
        if (createdAt == null || referenceTime == null) {
            return 0.5d;
        }
        double ageDays = Math.max(
                0.0d,
                Duration.between(createdAt, referenceTime).toSeconds() / 86_400.0d);
        return StrictMath.pow(0.5d, ageDays / CrewRecommendationPolicy.FRESHNESS_HALF_LIFE_DAYS);
    }

    private static double clamp(double value) {
        return Math.max(0.0d, Math.min(1.0d, value));
    }

    private static double round4(double value) {
        return Math.round(value * 10_000.0d) / 10_000.0d;
    }

    public record Score(double value, List<String> reasons) {
        public Score {
            reasons = List.copyOf(reasons);
        }
    }
}
