package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class ExploreCandidateQueryTest {

    private static final Instant REFERENCE_TIME = Instant.parse("2026-08-13T07:00:00Z");

    @Test
    void normalizesRegionAndCountryCode() {
        ExploreCandidateQuery query = new ExploreCandidateQuery(
                REFERENCE_TIME,
                "  서울  ",
                " kr ",
                100,
                100);

        assertThat(query.region()).isEqualTo("서울");
        assertThat(query.regionCountryCode()).isEqualTo("KR");
        assertThat(query.hasExplicitRegion()).isTrue();
    }

    @Test
    void blankRegionMeansAllRegionDiscovery() {
        ExploreCandidateQuery query = new ExploreCandidateQuery(
                REFERENCE_TIME,
                " ",
                " ",
                100,
                100);

        assertThat(query.region()).isNull();
        assertThat(query.regionCountryCode()).isNull();
        assertThat(query.hasExplicitRegion()).isFalse();
        assertThat(query.regionSqlValue()).isEmpty();
        assertThat(query.regionCountryCodeSqlValue()).isEmpty();
    }

    @Test
    void clampsEachSliceWithoutFixingProductPolicy() {
        ExploreCandidateQuery query = new ExploreCandidateQuery(
                REFERENCE_TIME,
                null,
                null,
                5_000,
                900);

        assertThat(query.recentLimit()).isEqualTo(ExploreCandidateQuery.MAX_SLICE_LIMIT);
        assertThat(query.qualityLimit()).isEqualTo(ExploreCandidateQuery.MAX_SLICE_LIMIT);
    }

    @Test
    void allowsOneSliceToBeDisabledButNotBoth() {
        ExploreCandidateQuery recentOnly = new ExploreCandidateQuery(
                REFERENCE_TIME,
                null,
                null,
                20,
                0);
        ExploreCandidateQuery qualityOnly = new ExploreCandidateQuery(
                REFERENCE_TIME,
                null,
                null,
                0,
                20);

        assertThat(recentOnly.qualityLimit()).isZero();
        assertThat(qualityOnly.recentLimit()).isZero();
        assertThatThrownBy(() -> new ExploreCandidateQuery(
                REFERENCE_TIME,
                null,
                null,
                0,
                0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsInvalidCandidateQuery() {
        assertThatThrownBy(() -> new ExploreCandidateQuery(
                null,
                null,
                null,
                10,
                10)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new ExploreCandidateQuery(
                REFERENCE_TIME,
                null,
                "KOR",
                10,
                10)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ExploreCandidateQuery(
                REFERENCE_TIME,
                null,
                null,
                -1,
                10)).isInstanceOf(IllegalArgumentException.class);
    }
}
