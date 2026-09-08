package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ExploreFeatureExtractorTest {

    private static final Instant REFERENCE_TIME = Instant.parse("2026-08-13T07:00:00Z");
    private static final Duration HALF_LIFE = Duration.ofDays(30);
    private final ExploreFeatureExtractor extractor = new ExploreFeatureExtractor();

    @Test
    void emptyPopulationProducesZeroPercentiles() {
        ExploreFeatureSnapshot snapshot = extractor.extract(List.of(), REFERENCE_TIME, HALF_LIFE);

        assertThat(snapshot.population()).isEqualTo(new ExploreFeatureSnapshot.Population(0, 0, 0, 0, 0));
        assertThat(snapshot.candidates()).isEmpty();
    }

    @Test
    void zeroPopulationDoesNotCreateArtificialPopularity() {
        ExploreFeatureSnapshot snapshot = extractor.extract(
                List.of(candidate(1, REFERENCE_TIME.minus(Duration.ofDays(1)), 0, 0, 0, 0)),
                REFERENCE_TIME,
                HALF_LIFE);

        ExploreCandidateFeatures.NormalizedPopularity popularity = snapshot.candidates().getFirst().normalizedPopularity();
        assertThat(popularity.view()).isZero();
        assertThat(popularity.like()).isZero();
        assertThat(popularity.bookmark()).isZero();
        assertThat(popularity.comment()).isZero();
    }

    @Test
    void massiveOutlierIsCappedAtOne() {
        List<ExploreCandidateRow> candidates = new ArrayList<>();
        for (int index = 1; index <= 99; index++) {
            candidates.add(candidate(index, REFERENCE_TIME.minusSeconds(index), index, index, index, index));
        }
        candidates.add(candidate(100, REFERENCE_TIME.minusSeconds(100), 1_000_000_000L, 1_000_000_000L, 1_000_000_000L, 1_000_000_000L));

        ExploreFeatureSnapshot snapshot = extractor.extract(candidates, REFERENCE_TIME, HALF_LIFE);

        assertThat(snapshot.population().viewP95()).isEqualTo(95L);
        ExploreCandidateFeatures.NormalizedPopularity outlier = snapshot.candidates().getLast().normalizedPopularity();
        assertThat(outlier.view()).isEqualTo(1.0d);
        assertThat(outlier.like()).isEqualTo(1.0d);
        assertThat(outlier.bookmark()).isEqualTo(1.0d);
        assertThat(outlier.comment()).isEqualTo(1.0d);
        assertThat(snapshot.candidates())
                .allSatisfy(feature -> {
                    assertThat(feature.normalizedPopularity().view()).isBetween(0.0d, 1.0d);
                    assertThat(feature.normalizedPopularity().like()).isBetween(0.0d, 1.0d);
                    assertThat(feature.normalizedPopularity().bookmark()).isBetween(0.0d, 1.0d);
                    assertThat(feature.normalizedPopularity().comment()).isBetween(0.0d, 1.0d);
                });
    }

    @Test
    void samePositivePopulationNormalizesToOne() {
        ExploreFeatureSnapshot snapshot = extractor.extract(
                List.of(
                        candidate(1, REFERENCE_TIME.minusSeconds(1), 7, 7, 7, 7),
                        candidate(2, REFERENCE_TIME.minusSeconds(2), 7, 7, 7, 7),
                        candidate(3, REFERENCE_TIME.minusSeconds(3), 7, 7, 7, 7)),
                REFERENCE_TIME,
                HALF_LIFE);

        assertThat(snapshot.candidates())
                .allSatisfy(feature -> {
                    assertThat(feature.normalizedPopularity().view()).isEqualTo(1.0d);
                    assertThat(feature.normalizedPopularity().like()).isEqualTo(1.0d);
                    assertThat(feature.normalizedPopularity().bookmark()).isEqualTo(1.0d);
                    assertThat(feature.normalizedPopularity().comment()).isEqualTo(1.0d);
                });
    }

    @Test
    void freshnessUsesExplicitHalfLifeAndClampsFutureTimestamp() {
        ExploreFeatureSnapshot snapshot = extractor.extract(
                List.of(
                        candidate(1, REFERENCE_TIME, 0, 0, 0, 0),
                        candidate(2, REFERENCE_TIME.minus(HALF_LIFE), 0, 0, 0, 0),
                        candidate(3, REFERENCE_TIME.plus(Duration.ofDays(1)), 0, 0, 0, 0)),
                REFERENCE_TIME,
                HALF_LIFE);

        assertThat(snapshot.candidates().get(0).freshness()).isEqualTo(1.0d);
        assertThat(snapshot.candidates().get(1).freshness()).isEqualTo(0.5d);
        assertThat(snapshot.candidates().get(2).freshness()).isEqualTo(1.0d);
    }

    @Test
    void missingPersonalProfileRemainsUnavailableInsteadOfZero() {
        ExploreFeatureSnapshot snapshot = extractor.extract(
                List.of(
                        candidate(1, REFERENCE_TIME.minusSeconds(1), 1, 1, 1, 1),
                        candidate(2, REFERENCE_TIME.minusSeconds(2), 1, 1, 1, 1)),
                REFERENCE_TIME,
                HALF_LIFE,
                Map.of(1L, 0.8d));

        assertThat(snapshot.candidates().get(0).optionalUserAffinity()).hasValue(0.8d);
        assertThat(snapshot.candidates().get(1).optionalUserAffinity()).isEmpty();
    }

    @Test
    void anonymousExtractionLeavesAffinityUnavailable() {
        ExploreFeatureSnapshot snapshot = extractor.extract(
                List.of(candidate(1, REFERENCE_TIME.minusSeconds(1), 1, 1, 1, 1)),
                REFERENCE_TIME,
                HALF_LIFE);

        assertThat(snapshot.candidates().getFirst().optionalUserAffinity()).isEmpty();
    }

    @Test
    void preservesCandidateOrderAndDiversityMetadata() {
        ExploreCandidateRow first = new ExploreCandidateRow(
                2,
                22,
                "kr-11",
                REFERENCE_TIME.minusSeconds(2),
                2,
                2,
                2,
                2,
                List.of("cafe", "seoul"));
        ExploreCandidateRow second = new ExploreCandidateRow(
                1,
                11,
                "jp-13",
                REFERENCE_TIME.minusSeconds(1),
                1,
                1,
                1,
                1,
                List.of("tokyo"));

        ExploreFeatureSnapshot snapshot = extractor.extract(List.of(first, second), REFERENCE_TIME, HALF_LIFE);

        assertThat(snapshot.candidates()).extracting(ExploreCandidateFeatures::postId).containsExactly(2L, 1L);
        assertThat(snapshot.candidates().getFirst().authorId()).isEqualTo(22L);
        assertThat(snapshot.candidates().getFirst().regionCode()).isEqualTo("kr-11");
        assertThat(snapshot.candidates().getFirst().tags()).containsExactly("cafe", "seoul");
    }

    @Test
    void rejectsInvalidExtractionInputs() {
        ExploreCandidateRow duplicate = candidate(1, REFERENCE_TIME, 1, 1, 1, 1);

        assertThatThrownBy(() -> extractor.extract(
                List.of(duplicate, duplicate),
                REFERENCE_TIME,
                HALF_LIFE)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> extractor.extract(
                List.of(duplicate),
                REFERENCE_TIME,
                Duration.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> extractor.extract(
                List.of(duplicate),
                REFERENCE_TIME,
                HALF_LIFE,
                Map.of(1L, 1.1d))).isInstanceOf(IllegalArgumentException.class);
    }

    private static ExploreCandidateRow candidate(
            long postId,
            Instant createdAt,
            long views,
            long likes,
            long bookmarks,
            long comments) {
        return new ExploreCandidateRow(
                postId,
                1_000L + postId,
                "kr-11",
                createdAt,
                views,
                likes,
                bookmarks,
                comments,
                List.of("travel"));
    }
}
