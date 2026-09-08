package com.jc.backend.intelligence.contentanalysis;

import java.util.Arrays;

public enum ContentTheme {
    FOOD("food"),
    CAFE("cafe"),
    CULTURE("culture"),
    NATURE("nature"),
    SHOPPING("shopping"),
    NIGHTLIFE("nightlife"),
    ACTIVITY("activity"),
    RELAXATION("relaxation"),
    HISTORY("history"),
    PHOTOGRAPHY("photography"),
    LOCAL_EXPERIENCE("local_experience");

    private final String wireValue;

    ContentTheme(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static ContentTheme fromWireValue(String value) {
        return Arrays.stream(values())
                .filter(theme -> theme.wireValue.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown content theme: " + value));
    }
}
