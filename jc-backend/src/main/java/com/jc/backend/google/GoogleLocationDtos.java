package com.jc.backend.google;

import java.util.List;

public final class GoogleLocationDtos {

    private GoogleLocationDtos() {}

    public record LocationSummary(
            Place place,
            Weather weather,
            TimeZone timeZone,
            FlightEstimate flight) {}

    public record LocationSuggestion(
            String placeId,
            String mainText,
            String secondaryText,
            String description) {}

    public record ResolvedPlace(
            String placeId,
            String displayName,
            String formattedAddress,
            List<String> addressComponentNames,
            String countryCode,
            double latitude,
            double longitude) {}

    public record Place(
            String name,
            String formattedAddress,
            double latitude,
            double longitude) {}

    public record Weather(
            Double temperatureDegrees,
            String temperatureUnit,
            String conditionText,
            Boolean daytime,
            String errorMessage) {}

    public record TimeZone(
            String id,
            String name,
            int rawOffsetSeconds,
            int dstOffsetSeconds,
            String localDate,
            String localTime) {}

    public record FlightEstimate(
            String originName,
            double distanceKm,
            int durationMinutes,
            String label,
            boolean estimated) {}
}
