package com.jc.backend.google;

import com.fasterxml.jackson.databind.JsonNode;
import com.jc.backend.common.DomainException;
import java.net.URI;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class GoogleLocationService {

    private static final DateTimeFormatter LOCAL_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter LOCAL_TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final double INCHEON_AIRPORT_LATITUDE = 37.4602;
    private static final double INCHEON_AIRPORT_LONGITUDE = 126.4407;
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double AVERAGE_FLIGHT_SPEED_KMH = 820.0;
    private static final int AIRPORT_BUFFER_MINUTES = 45;

    private final RestClient restClient;
    private final String apiKey;

    public GoogleLocationService(
            RestClient.Builder restClientBuilder,
            @Value("${app.google.api-key:}") String apiKey) {
        this.restClient = restClientBuilder.build();
        this.apiKey = apiKey;
    }

    public GoogleLocationDtos.LocationSummary lookup(String query, String languageCode) {
        if (query == null || query.isBlank()) {
            throw new DomainException(HttpStatus.BAD_REQUEST, "QUERY_REQUIRED", "검색할 지역명을 입력해주세요.");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new DomainException(HttpStatus.INTERNAL_SERVER_ERROR, "GOOGLE_API_KEY_MISSING", "Google API 키가 설정되어 있지 않습니다.");
        }

        String language = normalizeLanguage(languageCode);
        GoogleLocationDtos.Place place = findPlace(query.trim(), language);
        GoogleLocationDtos.Weather weather = tryFindWeather(place.latitude(), place.longitude(), language);
        GoogleLocationDtos.TimeZone timeZone = findTimeZone(place.latitude(), place.longitude(), language);
        GoogleLocationDtos.FlightEstimate flight = estimateFlight(place.latitude(), place.longitude(), language);
        return new GoogleLocationDtos.LocationSummary(place, weather, timeZone, flight);
    }

    public List<GoogleLocationDtos.LocationSuggestion> suggest(String query, String languageCode) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new DomainException(HttpStatus.INTERNAL_SERVER_ERROR, "GOOGLE_API_KEY_MISSING", "Google API key is not configured.");
        }

        URI uri = UriComponentsBuilder
                .fromUriString("https://maps.googleapis.com/maps/api/place/autocomplete/json")
                .queryParam("input", query.trim())
                .queryParam("types", "(cities)")
                .queryParam("language", normalizeLanguage(languageCode))
                .queryParam("key", apiKey)
                .build()
                .toUri();

        JsonNode body = get(uri, "Places Autocomplete");
        if (!"OK".equals(body.path("status").asText()) && !"ZERO_RESULTS".equals(body.path("status").asText())) {
            throw new DomainException(HttpStatus.BAD_GATEWAY, "PLACE_SUGGESTION_FAILED", "Could not load location suggestions.");
        }

        List<GoogleLocationDtos.LocationSuggestion> suggestions = new ArrayList<>();
        for (JsonNode prediction : body.path("predictions")) {
            JsonNode formatting = prediction.path("structured_formatting");
            suggestions.add(new GoogleLocationDtos.LocationSuggestion(
                    prediction.path("place_id").asText(),
                    formatting.path("main_text").asText(prediction.path("description").asText()),
                    formatting.path("secondary_text").asText(""),
                    prediction.path("description").asText()));
            if (suggestions.size() == 6) break;
        }
        return suggestions;
    }

    private String normalizeLanguage(String languageCode) {
        if (languageCode == null || languageCode.isBlank()) {
            return "ko";
        }
        return languageCode.toLowerCase().startsWith("ko") ? "ko" : "en";
    }

    private GoogleLocationDtos.Weather tryFindWeather(double latitude, double longitude, String language) {
        try {
            return findWeather(latitude, longitude, language);
        } catch (DomainException exception) {
            return new GoogleLocationDtos.Weather(null, null, null, null, exception.getMessage());
        }
    }

    private GoogleLocationDtos.Place findPlace(String query, String language) {
        URI uri = UriComponentsBuilder
                .fromUriString("https://maps.googleapis.com/maps/api/place/textsearch/json")
                .queryParam("query", query)
                .queryParam("language", language)
                .queryParam("key", apiKey)
                .build()
                .toUri();

        JsonNode body = get(uri, "Places");
        String status = body.path("status").asText();
        JsonNode results = body.path("results");
        JsonNode first = results.isArray() && !results.isEmpty() ? results.get(0) : null;

        if (!"OK".equals(status) || first == null) {
            throw new DomainException(HttpStatus.NOT_FOUND, "PLACE_NOT_FOUND", "지역을 찾을 수 없습니다.");
        }

        JsonNode location = first.path("geometry").path("location");
        return new GoogleLocationDtos.Place(
                first.path("name").asText(query),
                first.path("formatted_address").asText(""),
                location.path("lat").asDouble(),
                location.path("lng").asDouble());
    }

    private GoogleLocationDtos.Weather findWeather(double latitude, double longitude, String language) {
        URI uri = UriComponentsBuilder
                .fromUriString("https://weather.googleapis.com/v1/currentConditions:lookup")
                .queryParam("location.latitude", latitude)
                .queryParam("location.longitude", longitude)
                .queryParam("languageCode", language)
                .queryParam("key", apiKey)
                .build()
                .toUri();

        JsonNode body = get(uri, "Weather");
        JsonNode temperature = body.path("temperature");
        JsonNode condition = body.path("weatherCondition");
        String conditionText = condition.path("description").path("text").asText(null);
        if (conditionText == null || conditionText.isBlank()) {
            conditionText = condition.path("type").asText(null);
        }

        return new GoogleLocationDtos.Weather(
                temperature.hasNonNull("degrees") ? temperature.path("degrees").asDouble() : null,
                temperature.path("unit").asText(null),
                conditionText,
                body.hasNonNull("isDaytime") ? body.path("isDaytime").asBoolean() : null,
                null);
    }

    private GoogleLocationDtos.FlightEstimate estimateFlight(double latitude, double longitude, String language) {
        double distanceKm = haversineKm(
                INCHEON_AIRPORT_LATITUDE,
                INCHEON_AIRPORT_LONGITUDE,
                latitude,
                longitude);

        if (distanceKm < 120) {
            return new GoogleLocationDtos.FlightEstimate(
                    originName(language),
                    Math.round(distanceKm * 10) / 10.0,
                    0,
                    language.equals("ko") ? "항공 이동 불필요" : "No flight needed",
                    true);
        }

        int durationMinutes = (int) Math.round((distanceKm / AVERAGE_FLIGHT_SPEED_KMH) * 60 + AIRPORT_BUFFER_MINUTES);
        return new GoogleLocationDtos.FlightEstimate(
                originName(language),
                Math.round(distanceKm * 10) / 10.0,
                durationMinutes,
                formatDuration(durationMinutes, language),
                true);
    }

    private String originName(String language) {
        return language.equals("ko") ? "인천공항" : "Incheon Airport";
    }

    private String formatDuration(int minutes, String language) {
        int hours = minutes / 60;
        int remainder = minutes % 60;
        if (language.equals("ko")) {
            if (hours == 0) {
                return "약 " + remainder + "분";
            }
            return remainder == 0 ? "약 " + hours + "시간" : "약 " + hours + "시간 " + remainder + "분";
        }
        if (hours == 0) {
            return "About " + remainder + "m";
        }
        return remainder == 0 ? "About " + hours + "h" : "About " + hours + "h " + remainder + "m";
    }

    private double haversineKm(double fromLatitude, double fromLongitude, double toLatitude, double toLongitude) {
        double latitudeDistance = Math.toRadians(toLatitude - fromLatitude);
        double longitudeDistance = Math.toRadians(toLongitude - fromLongitude);
        double fromLat = Math.toRadians(fromLatitude);
        double toLat = Math.toRadians(toLatitude);

        double a = Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2)
                + Math.cos(fromLat) * Math.cos(toLat)
                * Math.sin(longitudeDistance / 2) * Math.sin(longitudeDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    private GoogleLocationDtos.TimeZone findTimeZone(double latitude, double longitude, String language) {
        long timestamp = Instant.now().getEpochSecond();
        URI uri = UriComponentsBuilder
                .fromUriString("https://maps.googleapis.com/maps/api/timezone/json")
                .queryParam("location", latitude + "," + longitude)
                .queryParam("timestamp", timestamp)
                .queryParam("language", language)
                .queryParam("key", apiKey)
                .build()
                .toUri();

        JsonNode body = get(uri, "Time Zone");
        String status = body.path("status").asText();
        if (!"OK".equals(status)) {
            throw new DomainException(HttpStatus.BAD_GATEWAY, "TIMEZONE_LOOKUP_FAILED", "현지 시간 정보를 가져오지 못했습니다.");
        }

        String timeZoneId = body.path("timeZoneId").asText("UTC");
        ZoneId zoneId = ZoneId.of(timeZoneId);
        Instant now = Instant.now();

        return new GoogleLocationDtos.TimeZone(
                timeZoneId,
                body.path("timeZoneName").asText(""),
                body.path("rawOffset").asInt(0),
                body.path("dstOffset").asInt(0),
                LOCAL_DATE.withZone(zoneId).format(now),
                LOCAL_TIME.withZone(zoneId).format(now));
    }

    private JsonNode get(URI uri, String apiName) {
        try {
            JsonNode body = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(JsonNode.class);
            if (body == null) {
                throw new DomainException(HttpStatus.BAD_GATEWAY, "GOOGLE_API_EMPTY_RESPONSE", apiName + " API 응답이 비어 있습니다.");
            }
            return body;
        } catch (HttpStatusCodeException exception) {
            throw new DomainException(
                    HttpStatus.BAD_GATEWAY,
                    "GOOGLE_API_ERROR",
                    apiName + " API 호출 실패: HTTP " + exception.getStatusCode().value());
        } catch (RestClientException exception) {
            throw new DomainException(HttpStatus.BAD_GATEWAY, "GOOGLE_API_ERROR", apiName + " API 호출 중 오류가 발생했습니다.");
        }
    }
}
