package com.jc.backend.crew;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.crew.CrewRecommendationCandidateSource.Candidate;
import com.jc.backend.crew.CrewRecommendationCandidateSource.TagValue;
import com.jc.recommendation.model.feature.PreferenceKind;
import com.jc.recommendation.p1.profile.P1FeatureSignal;
import com.jc.recommendation.p1.profile.P1SignalSource;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CrewRecommendationScorerTest {

    private final CrewRecommendationScorer scorer = new CrewRecommendationScorer();

    @Test
    void regionAndTagPreferenceOutrankNeutralCrewDeterministically() {
        LocalDateTime referenceTime = LocalDateTime.of(2026, 8, 21, 12, 0);
        Map<String, P1FeatureSignal> signals = Map.of(
                "region:seoul",
                new P1FeatureSignal(
                        "region:seoul",
                        PreferenceKind.PREFER,
                        1.0d,
                        1.0d,
                        P1SignalSource.EXPLICIT),
                "theme:food",
                new P1FeatureSignal(
                        "theme:food",
                        PreferenceKind.PREFER,
                        1.0d,
                        1.0d,
                        P1SignalSource.EXPLICIT));

        Candidate preferred = candidate(
                1L,
                "KR-SEOUL",
                List.of(new TagValue("food", "food")),
                referenceTime.minusDays(2));
        Candidate neutral = candidate(
                2L,
                "KR-BUSAN",
                List.of(new TagValue("nature", "nature")),
                referenceTime.minusDays(2));

        CrewRecommendationScorer.Score first = scorer.score(preferred, signals, referenceTime);
        CrewRecommendationScorer.Score repeated = scorer.score(preferred, signals, referenceTime);
        CrewRecommendationScorer.Score other = scorer.score(neutral, signals, referenceTime);

        assertThat(first).isEqualTo(repeated);
        assertThat(first.value()).isGreaterThan(other.value());
        assertThat(first.reasons()).contains(
                CrewRecommendationReason.REGION_MATCH,
                CrewRecommendationReason.TAG_MATCH);
    }

    @Test
    void neutralOldSparseCrewStillHasStableFallbackReason() {
        LocalDateTime referenceTime = LocalDateTime.of(2026, 8, 21, 12, 0);
        Candidate candidate = new Candidate(
                99L, "neutral", "UNKNOWN", "Unknown", "description",
                null, null, 20, 1, 0, true, 199L, "owner",
                referenceTime.minusDays(120), null, List.of());

        CrewRecommendationScorer.Score score = scorer.score(
                candidate,
                Map.of(),
                referenceTime);

        assertThat(score.reasons())
                .containsExactly(CrewRecommendationReason.GENERAL_RECOMMENDATION);
    }

    private Candidate candidate(
            long id,
            String regionCode,
            List<TagValue> tags,
            LocalDateTime createdAt) {
        return new Candidate(
                id,
                "crew-" + id,
                regionCode,
                regionCode,
                "description",
                null,
                null,
                10,
                4,
                0,
                true,
                100L + id,
                "owner-" + id,
                createdAt,
                null,
                tags);
    }
}
