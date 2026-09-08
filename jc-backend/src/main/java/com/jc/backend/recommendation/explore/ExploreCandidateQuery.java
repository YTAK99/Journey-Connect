package com.jc.backend.recommendation.explore;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;

public record ExploreCandidateQuery(
        Instant referenceTime,
        String region,
        String regionCountryCode,
        int recentLimit,
        int qualityLimit) {

    public static final int MAX_SLICE_LIMIT = 500;

    public ExploreCandidateQuery {
        referenceTime = Objects.requireNonNull(referenceTime, "referenceTime");
        region = normalize(region);
        regionCountryCode = normalizeCountryCode(regionCountryCode);
        if (recentLimit < 0 || qualityLimit < 0) {
            throw new IllegalArgumentException("candidate slice limits must not be negative");
        }
        if (recentLimit == 0 && qualityLimit == 0) {
            throw new IllegalArgumentException("at least one candidate slice must be enabled");
        }
        recentLimit = Math.min(recentLimit, MAX_SLICE_LIMIT);
        qualityLimit = Math.min(qualityLimit, MAX_SLICE_LIMIT);
    }

    public boolean hasExplicitRegion() {
        return region != null;
    }

    String regionSqlValue() {
        return region == null ? "" : region;
    }

    String regionCountryCodeSqlValue() {
        return regionCountryCode == null ? "" : regionCountryCode;
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static String normalizeCountryCode(String value) {
        String normalized = normalize(value);
        if (normalized == null) {
            return null;
        }
        String countryCode = normalized.toUpperCase(Locale.ROOT);
        if (!countryCode.matches("[A-Z]{2}")) {
            throw new IllegalArgumentException("regionCountryCode must be a two-letter ISO country code");
        }
        return countryCode;
    }
}
