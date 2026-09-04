package com.jc.backend.google;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jc.backend.common.DomainException;
import java.net.URI;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

/** 장소 검색 결과에 현재 날씨·현지 시각·인천 출발 이동 추정치를 조합합니다. */
@Service // 비즈니스 로직 컴포넌트로 등록해 컨트롤러가 생성자 주입으로 사용합니다.
public class GoogleLocationService {

    private static final Logger log = LoggerFactory.getLogger(GoogleLocationService.class);
    private static final DateTimeFormatter LOCAL_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter LOCAL_TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final double INCHEON_AIRPORT_LATITUDE = 37.4602;
    private static final double INCHEON_AIRPORT_LONGITUDE = 126.4407;
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double AVERAGE_FLIGHT_SPEED_KMH = 820.0;
    private static final int AIRPORT_BUFFER_MINUTES = 45;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public GoogleLocationService(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${app.google.api-key:}") String apiKey) {
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    public GoogleLocationDtos.LocationSummary lookup(String query, String languageCode) {
        // 필수 장소를 먼저 찾고, 같은 좌표로 각 부가 정보를 조회해 단일 화면 응답으로 합칩니다.
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
        return suggest(query, languageCode, "region");
    }

    public List<GoogleLocationDtos.LocationSuggestion> suggest(
            String query, String languageCode, String scope) {
        // 도시·행정구역 중심의 후보만 받아 작성 화면에서 임의 문자열 대신 Place ID를 선택하게 합니다.
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new DomainException(HttpStatus.INTERNAL_SERVER_ERROR, "GOOGLE_API_KEY_MISSING", "Google API key is not configured.");
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString("https://maps.googleapis.com/maps/api/place/autocomplete/json")
                .queryParam("input", query.trim())
                .queryParam("language", normalizeLanguage(languageCode))
                .queryParam("key", apiKey);
        if (!"place".equalsIgnoreCase(scope)) {
            builder.queryParam("types", "(regions)");
        }
        URI uri = builder.build().toUri();

        JsonNode body = get(uri, "Places Autocomplete");
        if (!requireGoogleStatus(body, "Places Autocomplete", ZeroResultsHandling.EMPTY)) {
            return List.of();
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

    public GoogleLocationDtos.ResolvedPlace resolvePlace(String placeId, String languageCode) {
        // 표시명과 모든 주소 구성요소를 함께 반환해 도시를 주·도 및 국가명으로도 찾을 수 있게 합니다.
        if (placeId == null || placeId.isBlank()) {
            throw new DomainException(HttpStatus.BAD_REQUEST, "PLACE_ID_REQUIRED", "선택한 지역 정보가 필요합니다.");
        }
        URI uri = UriComponentsBuilder
                .fromUriString("https://maps.googleapis.com/maps/api/place/details/json")
                .queryParam("place_id", placeId.trim())
                .queryParam("fields", "place_id,name,formatted_address,address_component,geometry")
                .queryParam("language", normalizeLanguage(languageCode))
                .queryParam("key", apiKey)
                .build()
                .toUri();
        JsonNode body = get(uri, "Place Details");
        requireGoogleStatus(body, "Place Details", ZeroResultsHandling.PLACE_NOT_FOUND);
        JsonNode result = body.path("result");
        if (!result.isObject()) {
            throw malformedGoogleResponse("Place Details", "result is missing");
        }
        String countryCode = "ZZ";
        List<String> addressComponentNames = new ArrayList<>();
        for (JsonNode component : result.path("address_components")) {
            String longName = component.path("long_name").asText("").trim();
            if (!longName.isBlank() && !addressComponentNames.contains(longName)) {
                addressComponentNames.add(longName);
            }
            for (JsonNode type : component.path("types")) {
                if ("country".equals(type.asText())) {
                    countryCode = component.path("short_name").asText("ZZ").toUpperCase(Locale.ROOT);
                }
            }
        }
        JsonNode location = result.path("geometry").path("location");
        return new GoogleLocationDtos.ResolvedPlace(
                result.path("place_id").asText(placeId.trim()),
                result.path("name").asText(placeId.trim()),
                result.path("formatted_address").asText(""),
                List.copyOf(addressComponentNames),
                countryCode,
                location.path("lat").asDouble(),
                location.path("lng").asDouble());
    }

    private String normalizeLanguage(String languageCode) {
        if (languageCode == null || languageCode.isBlank()) {
            return "ko";
        }
        return languageCode.toLowerCase().startsWith("ko") ? "ko" : "en";
    }

    private GoogleLocationDtos.Weather tryFindWeather(double latitude, double longitude, String language) {
        // 날씨 장애만으로 전체 위치 화면이 실패하지 않도록 오류를 weather.error 필드로 낮춥니다.
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
        requireGoogleStatus(body, "Places Text Search", ZeroResultsHandling.PLACE_NOT_FOUND);
        JsonNode results = body.path("results");
        JsonNode first = results.isArray() && !results.isEmpty() ? results.get(0) : null;

        if (first == null) {
            throw malformedGoogleResponse("Places Text Search", "OK response has no results");
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
        // 실제 항공편 검색이 아니라 대권거리와 평균 속도를 이용한 UI 안내용 근사치입니다.
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
        requireGoogleStatus(body, "Time Zone", ZeroResultsHandling.TIME_ZONE_NOT_FOUND);

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
            JsonNode error = body.path("error");
            if (error.isObject()) {
                throw googleApiException(
                        apiName,
                        error.path("status").asText("GOOGLE_API_ERROR"),
                        error.path("message").asText(""),
                        null);
            }
            return body;
        } catch (HttpStatusCodeException exception) {
            JsonNode error = parseErrorBody(exception.getResponseBodyAsString()).path("error");
            String googleStatus = error.path("status").asText("");
            String upstreamMessage = error.path("message").asText("");
            throw googleApiException(apiName, googleStatus, upstreamMessage, exception.getStatusCode().value());
        } catch (RestClientException exception) {
            // RestClientException messages can contain the complete request URI, including its query string.
            log.warn("{} API transport failure: {}", apiName, exception.getClass().getSimpleName());
            throw new DomainException(HttpStatus.BAD_GATEWAY, "GOOGLE_API_ERROR", apiName + " API 호출 중 오류가 발생했습니다.");
        }
    }

    /**
     * Legacy Maps Platform APIs can report failures in a successful HTTP response.
     * Returns false only when ZERO_RESULTS is an allowed empty result for this call.
     */
    private boolean requireGoogleStatus(
            JsonNode body, String apiName, ZeroResultsHandling zeroResultsHandling) {
        String status = body.path("status").asText("").trim().toUpperCase(Locale.ROOT);
        if ("OK".equals(status)) {
            return true;
        }

        String upstreamMessage = body.path("error_message").asText("");
        if (upstreamMessage.isBlank()) {
            upstreamMessage = body.path("errorMessage").asText("");
        }
        if ("ZERO_RESULTS".equals(status)
                || "NOT_FOUND".equals(status) && zeroResultsHandling == ZeroResultsHandling.PLACE_NOT_FOUND) {
            log.warn("{} API upstream failure: status={}, reason={}",
                    apiName,
                    status,
                    sanitizeForLog(upstreamMessage.isBlank() ? "no upstream error message" : upstreamMessage));
            return switch (zeroResultsHandling) {
                case EMPTY -> false;
                case PLACE_NOT_FOUND -> throw new DomainException(
                        HttpStatus.NOT_FOUND,
                        "PLACE_NOT_FOUND",
                        "지역을 찾을 수 없습니다.");
                case TIME_ZONE_NOT_FOUND -> throw new DomainException(
                        HttpStatus.BAD_GATEWAY,
                        "GOOGLE_TIME_ZONE_NOT_FOUND",
                        "현지 시간 정보를 찾지 못했습니다.");
            };
        }
        throw googleApiException(apiName, status, upstreamMessage, null);
    }

    private DomainException googleApiException(
            String apiName, String googleStatus, String upstreamMessage, Integer httpStatus) {
        String normalizedStatus = googleStatus == null
                ? ""
                : googleStatus.trim().toUpperCase(Locale.ROOT);
        if (normalizedStatus.isBlank()) {
            normalizedStatus = statusFromHttp(httpStatus);
        }

        String reason = upstreamMessage == null || upstreamMessage.isBlank()
                ? httpStatus == null ? "no upstream error message" : "HTTP " + httpStatus
                : upstreamMessage;
        log.warn("{} API upstream failure: status={}, reason={}",
                apiName, normalizedStatus, sanitizeForLog(reason));

        return switch (normalizedStatus) {
            case "ZERO_RESULTS" -> new DomainException(
                    HttpStatus.NOT_FOUND,
                    "PLACE_NOT_FOUND",
                    "지역을 찾을 수 없습니다.");
            case "REQUEST_DENIED", "PERMISSION_DENIED", "UNAUTHENTICATED" -> new DomainException(
                    HttpStatus.BAD_GATEWAY,
                    "GOOGLE_API_REQUEST_DENIED",
                    apiName + " API 요청이 거부되었습니다.");
            case "OVER_QUERY_LIMIT", "OVER_DAILY_LIMIT", "RESOURCE_EXHAUSTED" -> new DomainException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "GOOGLE_API_QUOTA_EXCEEDED",
                    apiName + " API 사용량 한도를 초과했습니다.");
            case "INVALID_REQUEST", "INVALID_ARGUMENT", "FAILED_PRECONDITION" -> new DomainException(
                    HttpStatus.BAD_GATEWAY,
                    "GOOGLE_API_INVALID_REQUEST",
                    apiName + " API 요청 구성이 올바르지 않습니다.");
            case "UNKNOWN_ERROR", "UNKNOWN", "INTERNAL", "UNAVAILABLE", "DEADLINE_EXCEEDED" -> new DomainException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "GOOGLE_API_TEMPORARY_ERROR",
                    apiName + " API가 일시적으로 응답하지 않습니다.");
            default -> new DomainException(
                    HttpStatus.BAD_GATEWAY,
                    "GOOGLE_API_ERROR",
                    apiName + " API 호출에 실패했습니다.");
        };
    }

    private String statusFromHttp(Integer httpStatus) {
        if (httpStatus == null) {
            return "GOOGLE_API_ERROR";
        }
        return switch (httpStatus) {
            case 400 -> "INVALID_ARGUMENT";
            case 401 -> "UNAUTHENTICATED";
            case 403 -> "PERMISSION_DENIED";
            case 429 -> "RESOURCE_EXHAUSTED";
            case 500, 502, 503, 504 -> "UNAVAILABLE";
            default -> "HTTP_" + httpStatus;
        };
    }

    private JsonNode parseErrorBody(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(responseBody);
        } catch (JsonProcessingException ignored) {
            return objectMapper.createObjectNode();
        }
    }

    private DomainException malformedGoogleResponse(String apiName, String reason) {
        log.warn("{} API malformed response: {}", apiName, reason);
        return new DomainException(
                HttpStatus.BAD_GATEWAY,
                "GOOGLE_API_ERROR",
                apiName + " API 응답 형식이 올바르지 않습니다.");
    }

    private String sanitizeForLog(String message) {
        if (message == null || message.isBlank()) {
            return "no details";
        }
        String sanitized = message.replaceAll("[\\r\\n\\t]+", " ");
        if (apiKey != null && !apiKey.isBlank()) {
            sanitized = sanitized.replace(apiKey, "[REDACTED]");
        }
        return sanitized.length() <= 500 ? sanitized : sanitized.substring(0, 500) + "...";
    }

    private enum ZeroResultsHandling {
        EMPTY,
        PLACE_NOT_FOUND,
        TIME_ZONE_NOT_FOUND
    }
}
