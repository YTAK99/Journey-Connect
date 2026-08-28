package com.jc.backend.crew;

/** 크루 추천 V1의 고정된 점수 정책과 조회 한도를 정의합니다. */
final class CrewRecommendationPolicy {

    static final String VERSION = "crew-recommendation-v1";
    static final int DEFAULT_SIZE = 10;
    static final int MAX_SIZE = 20;
    static final int RETRIEVAL_LIMIT = 200;

    static final double REGION_WEIGHT = 0.45d;
    static final double TAG_WEIGHT = 0.35d;
    static final double BALANCE_WEIGHT = 0.10d;
    static final double FRESHNESS_WEIGHT = 0.10d;
    static final double FRESHNESS_HALF_LIFE_DAYS = 30.0d;

    static {
        double total = REGION_WEIGHT + TAG_WEIGHT + BALANCE_WEIGHT + FRESHNESS_WEIGHT;
        if (Math.abs(total - 1.0d) > 1.0e-12d) {
            throw new IllegalStateException("crew recommendation weights must sum to 1.0");
        }
    }

    private CrewRecommendationPolicy() {}
}
