package com.jc.backend.intelligence.contentanalysis;

import java.util.Arrays;

public enum TravelStyle {
    SOLO("solo"),
    COUPLE("couple"),
    FRIENDS("friends"),
    FAMILY("family"),
    BUDGET("budget"),
    LUXURY("luxury"),
    SLOW_TRAVEL("slow_travel"),
    SHORT_TRIP("short_trip"),
    WALKING("walking"),
    DRIVING("driving");

    private final String wireValue;

    TravelStyle(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static TravelStyle fromWireValue(String value) {
        return Arrays.stream(values())
                .filter(style -> style.wireValue.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown travel style: " + value));
    }
}
