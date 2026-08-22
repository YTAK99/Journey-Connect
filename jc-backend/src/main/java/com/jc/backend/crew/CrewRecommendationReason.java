package com.jc.backend.crew;

/** FE가 추천 설명 문구로 안정적으로 매핑할 수 있는 공개 reason code 계약입니다. */
public enum CrewRecommendationReason {
    REGION_MATCH,
    TAG_MATCH,
    GOOD_CAPACITY,
    FRESH_CREW,

    /** 개인화/운영 신호가 임계값을 넘지 않은 cold-start 또는 중립 추천입니다. */
    GENERAL_RECOMMENDATION
}
