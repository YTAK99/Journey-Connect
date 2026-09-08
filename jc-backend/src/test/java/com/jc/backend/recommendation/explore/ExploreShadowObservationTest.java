package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.post.PostDtos;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ExploreShadowObservationTest {

    @Test
    void computesBoundedShadowComparisonMetrics() {
        List<PostDtos.Summary> legacy = List.of(
                summary(1L, 10L, "KR-SEOUL"),
                summary(2L, 20L, "KR-BUSAN"),
                summary(3L, 30L, "KR-JEJU"),
                summary(4L, 40L, "JP-TOKYO"));
        List<PostDtos.Summary> discovery = List.of(
                summary(2L, 10L, "KR-SEOUL"),
                summary(1L, 10L, "KR-SEOUL"),
                summary(5L, 50L, "KR-BUSAN"),
                summary(6L, 60L, "KR-BUSAN"));

        ExploreShadowObservation observation = ExploreShadowObservation.compare(
                legacy,
                discovery,
                17,
                12_345_678L,
                false);

        assertThat(observation.rankingVersion())
                .isEqualTo(ExploreRankingPolicy.DISCOVERY_RANKING_VERSION);
        assertThat(observation.rankingLatencyMs()).isEqualTo(12L);
        assertThat(observation.candidateCount()).isEqualTo(17);
        assertThat(observation.topN()).isEqualTo(4);
        assertThat(observation.topNOverlap()).isEqualTo(0.5d);
        assertThat(observation.uniqueAuthors()).isEqualTo(3);
        assertThat(observation.uniqueRegions()).isEqualTo(2);
        assertThat(observation.topAuthorShare()).isEqualTo(0.5d);
    }

    @Test
    void emptyDiscoveryProducesZeroDiversityShares() {
        ExploreShadowObservation observation = ExploreShadowObservation.compare(
                List.of(),
                List.of(),
                0,
                0,
                true);

        assertThat(observation.topN()).isZero();
        assertThat(observation.topNOverlap()).isZero();
        assertThat(observation.uniqueAuthors()).isZero();
        assertThat(observation.uniqueRegions()).isZero();
        assertThat(observation.topAuthorShare()).isZero();
        assertThat(observation.explicitRegion()).isTrue();
    }

    private static PostDtos.Summary summary(long id, long authorId, String regionCode) {
        return new PostDtos.Summary(
                id,
                "post-" + id,
                regionCode,
                null,
                regionCode,
                Map.of(),
                regionCode,
                null,
                List.of(),
                0,
                0,
                0,
                new PostDtos.Author(authorId, "author-" + authorId, null),
                LocalDateTime.of(2026, 8, 14, 9, 0));
    }
}
