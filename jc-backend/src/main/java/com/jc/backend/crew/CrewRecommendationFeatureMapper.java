package com.jc.backend.crew;

import java.util.Locale;

/** 크루의 지역·태그를 기존 P1 사용자 프로필 feature vocabulary에 맞춥니다. */
final class CrewRecommendationFeatureMapper {

    private CrewRecommendationFeatureMapper() {}

    static String regionFeature(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        String normalized = code.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("kr-seoul") || normalized.startsWith("kr-seoul-")) {
            return "region:seoul";
        }
        if (normalized.equals("kr-busan") || normalized.startsWith("kr-busan-")) {
            return "region:busan";
        }
        if (normalized.equals("kr-jeju") || normalized.startsWith("kr-jeju-")) {
            return "region:jeju";
        }
        if (normalized.equals("kr-gangwon") || normalized.startsWith("kr-gangwon-")) {
            return "region:gangwon";
        }
        if (normalized.equals("kr-gyeongju") || normalized.startsWith("kr-gyeongju-")) {
            return "region:gyeongju";
        }
        return null;
    }

    static String tagFeature(String normalizedName) {
        if (normalizedName == null || normalizedName.isBlank()) {
            return null;
        }
        return switch (normalizedName.trim().toLowerCase(Locale.ROOT)) {
            case "food" -> "theme:food";
            case "cafe" -> "theme:cafe";
            case "nature" -> "theme:nature";
            case "history" -> "theme:history";
            case "adventure" -> "theme:adventure";
            case "wellness" -> "theme:wellness";
            case "running" -> "activity:running";
            case "plogging" -> "activity:plogging";
            case "pilgrimage" -> "activity:pilgrimage";
            case "cycling" -> "activity:cycling";
            case "solo-travel" -> "companion:solo";
            case "couple-trip" -> "companion:couple";
            case "family-trip" -> "companion:family";
            default -> null;
        };
    }
}
