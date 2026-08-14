package com.jc.backend.recommendation.explore;

import java.util.Locale;

public enum ExploreRolloutMode {
    LEGACY,
    SHADOW,
    ACTIVE;

    public static ExploreRolloutMode parse(String value) {
        if (value == null || value.isBlank()) {
            return LEGACY;
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(
                    "Unsupported Explore rollout mode: " + value
                            + ". Expected LEGACY, SHADOW, or ACTIVE.",
                    exception);
        }
    }
}
