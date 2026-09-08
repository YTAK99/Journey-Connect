package com.jc.backend.recommendation.explore;

import java.util.Objects;

/**
 * Explore 요청의 의도와 ranking version을 하나의 불변 컨텍스트로 결속합니다.
 * 지역 값이 존재하면 후속 candidate retrieval에서 hard filter로 해석합니다.
 */
public record ExploreRequestContext(
        ExploreMode mode,
        String keyword,
        String region,
        String rankingVersion) {

    public ExploreRequestContext {
        mode = Objects.requireNonNull(mode, "mode");
        keyword = normalize(keyword);
        region = normalize(region);
        rankingVersion = Objects.requireNonNull(rankingVersion, "rankingVersion");

        if (mode == ExploreMode.DISCOVERY && keyword != null) {
            throw new IllegalArgumentException("discovery mode cannot contain an explicit keyword");
        }
        if (mode == ExploreMode.EXPLICIT_SEARCH && keyword == null) {
            throw new IllegalArgumentException("explicit search mode requires a keyword");
        }
        if (!ExploreRankingPolicy.versionFor(mode).equals(rankingVersion)) {
            throw new IllegalArgumentException("ranking version does not match explore mode");
        }
    }

    public static ExploreRequestContext resolve(String keyword, String region) {
        String normalizedKeyword = normalize(keyword);
        ExploreMode mode = normalizedKeyword == null
                ? ExploreMode.DISCOVERY
                : ExploreMode.EXPLICIT_SEARCH;
        return new ExploreRequestContext(
                mode,
                normalizedKeyword,
                normalize(region),
                ExploreRankingPolicy.versionFor(mode));
    }

    public boolean hasExplicitRegion() {
        return region != null;
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
