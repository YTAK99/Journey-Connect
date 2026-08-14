package com.jc.backend.recommendation.explore;

import java.util.Objects;

/** Explore ranking 의미를 버전 문자열과 결속합니다. */
public final class ExploreRankingPolicy {

    public static final String DISCOVERY_RANKING_VERSION = "explore-discovery-ranking-v1";
    public static final String SEARCH_RANKING_VERSION = "explore-search-ranking-v1";

    private ExploreRankingPolicy() {}

    public static String versionFor(ExploreMode mode) {
        return switch (Objects.requireNonNull(mode, "mode")) {
            case DISCOVERY -> DISCOVERY_RANKING_VERSION;
            case EXPLICIT_SEARCH -> SEARCH_RANKING_VERSION;
        };
    }
}
