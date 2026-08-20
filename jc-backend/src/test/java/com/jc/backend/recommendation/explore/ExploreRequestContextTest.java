package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ExploreRequestContextTest {

    @Test
    void blankKeywordResolvesToDiscovery() {
        ExploreRequestContext context = ExploreRequestContext.resolve("   ", null);

        assertThat(context.mode()).isEqualTo(ExploreMode.DISCOVERY);
        assertThat(context.keyword()).isNull();
        assertThat(context.rankingVersion())
                .isEqualTo(ExploreRankingPolicy.DISCOVERY_RANKING_VERSION);
        assertThat(context.hasExplicitRegion()).isFalse();
    }

    @Test
    void nonBlankKeywordResolvesToExplicitSearch() {
        ExploreRequestContext context = ExploreRequestContext.resolve("  서울 카페  ", "  KR-11  ");

        assertThat(context.mode()).isEqualTo(ExploreMode.EXPLICIT_SEARCH);
        assertThat(context.keyword()).isEqualTo("서울 카페");
        assertThat(context.region()).isEqualTo("KR-11");
        assertThat(context.rankingVersion())
                .isEqualTo(ExploreRankingPolicy.SEARCH_RANKING_VERSION);
        assertThat(context.hasExplicitRegion()).isTrue();
    }

    @Test
    void discoveryRejectsExplicitKeyword() {
        assertThatThrownBy(() -> new ExploreRequestContext(
                        ExploreMode.DISCOVERY,
                        "seoul",
                        null,
                        ExploreRankingPolicy.DISCOVERY_RANKING_VERSION))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void explicitSearchRequiresKeyword() {
        assertThatThrownBy(() -> new ExploreRequestContext(
                        ExploreMode.EXPLICIT_SEARCH,
                        null,
                        null,
                        ExploreRankingPolicy.SEARCH_RANKING_VERSION))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rankingVersionCannotDriftFromMode() {
        assertThatThrownBy(() -> new ExploreRequestContext(
                        ExploreMode.DISCOVERY,
                        null,
                        null,
                        ExploreRankingPolicy.SEARCH_RANKING_VERSION))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
