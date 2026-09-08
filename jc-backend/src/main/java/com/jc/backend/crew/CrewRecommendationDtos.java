package com.jc.backend.crew;

import java.util.List;

/** 크루 개인화 추천 응답 계약입니다. */
public final class CrewRecommendationDtos {

    private CrewRecommendationDtos() {}

    public record Item(
            CrewDtos.View crew,
            double score,
            List<CrewRecommendationReason> reasons,
            String policyVersion) {

        public Item {
            reasons = List.copyOf(reasons);
            if (policyVersion == null || policyVersion.isBlank()) throw new IllegalArgumentException("policyVersion must not be blank");
        }
    }
}
