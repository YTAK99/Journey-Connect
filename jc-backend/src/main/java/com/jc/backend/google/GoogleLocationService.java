package com.jc.backend.google;

import com.fasterxml.jackson.databind.JsonNode;
import com.jc.backend.common.DomainException;
import java.net.URI;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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

    private static final DateTimeFormatter LOCAL_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter LOCAL_TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final double INCHEON_AIRPORT_LATITUDE = 37.4602;
    private static final double INCHEON_AIRPORT_LONGITUDE = 126.4407;
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double AVERAGE_FLIGHT_SPEED_KMH = 820.0;
    private static final int AIRPORT_BUFFER_MINUTES = 45;
    private static final Map<String, PresetRegion> PRESET_REGIONS = Map.ofEntries(
            Map.entry("seoul", new PresetRegion("서울", "Seoul, South Korea", 37.5665, 126.9780, "Asia/Seoul")),
            Map.entry("busan", new PresetRegion("부산", "Busan, South Korea", 35.1796, 129.0756, "Asia/Seoul")),
            Map.entry("jeju", new PresetRegion("제주", "Jeju, South Korea", 33.4996, 126.5312, "Asia/Seoul")),
            Map.entry("gangneung", new PresetRegion("강릉", "Gangneung, South Korea", 37.7519, 128.8761, "Asia/Seoul")),
            Map.entry("tokyo", new PresetRegion("도쿄", "Tokyo, Japan", 35.6762, 139.6503, "Asia/Tokyo")),
            Map.entry("osaka", new PresetRegion("오사카", "Osaka, Japan", 34.6937, 135.5023, "Asia/Tokyo")),
            Map.entry("paris", new PresetRegion("파리", "Paris, France", 48.8566, 2.3522, "Europe/Paris")),
            Map.entry("new york", new PresetRegion("뉴욕", "New York, United States", 40.7128, -74.0060, "America/New_York")),
            Map.entry("bali", new PresetRegion("발리", "Bali, Indonesia", -8.3405, 115.0920, "Asia/Makassar")));

    private final RestClient restClient;
    private final String apiKey;

    public GoogleLocationService(
            RestClient.Builder restClientBuilder,
            @Value("${app.google.api-key:}") String apiKey) {
        this.restClient = restClientBuilder.build();
        this.apiKey = apiKey;
    }

    public GoogleLocationDtos.LocationSummary lookup(String query, String languageCode) {
        // 필수 장소를 먼저 찾고, 같은 좌표로 각 부가 정보를 조회해 단일 화면 응답으로 합칩니다.
        if (query == null || query.isBlank()) {
            throw new DomainException(HttpStatus.BAD_REQUEST, "QUERY_REQUIRED", "검색할 지역명을 입력해주세요.");
        }
        if (apiKey == null || apiKey.isBlank()) {
            PresetRegion preset = findPresetRegion(query);
            if (preset != null) return presetSummary(preset, normalizeLanguage(languageCode));
            throw new DomainException(HttpStatus.INTERNAL_SERVER_ERROR, "GOOGLE_API_KEY_MISSING", "Google API 키가 설정되어 있지 않습니다.");
        }

        String language = normalizeLanguage(languageCode);
        GoogleLocationDtos.Place place;
        try {
            place = findPlace(query.trim(), language);
        } catch (DomainException exception) {
            PresetRegion preset = findPresetRegion(query);
            if (preset == null || !isPlacesConfigurationFailure(exception)) throw exception;
            return presetSummary(preset, language);
        }
        GoogleLocationDtos.Weather weather = tryFindWeather(place.latitude(), place.longitude(), language);
        GoogleLocationDtos.TimeZone timeZone = findTimeZone(place.latitude(), place.longitude(), language);
        GoogleLocationDtos.FlightEstimate flight = estimateFlight(place.latitude(), place.longitude(), language);
        return new GoogleLocationDtos.LocationSummary(place, weather, timeZone, flight);
    }

    public GoogleLocationDtos.LocationSummary lookupCoordinates(
            String name,
            String address,
            double latitude,
            double longitude,
            String languageCode) {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new DomainException(HttpStatus.BAD_REQUEST, "INVALID_COORDINATES", "올바른 좌표가 아닙니다.");
        }
        String language = normalizeLanguage(languageCode);
        String displayName = name == null || name.isBlank() ? "Selected location" : name.trim();
        GoogleLocationDtos.Place place = new GoogleLocationDtos.Place(
                displayName, address == null ? "" : address.trim(), latitude, longitude);
        GoogleLocationDtos.Weather weather = tryFindWeather(latitude, longitude, language);
        GoogleLocationDtos.TimeZone timeZone = tryFindTimeZone(latitude, longitude, language);
        return new GoogleLocationDtos.LocationSummary(
                place, weather, timeZone, estimateFlight(latitude, longitude, language));
    }

    private GoogleLocationDtos.TimeZone tryFindTimeZone(
            double latitude, double longitude, String language) {
        if (apiKey == null || apiKey.isBlank()) return utcTimeZone();
        try {
            return findTimeZone(latitude, longitude, language);
        } catch (DomainException exception) {
            return utcTimeZone();
        }
    }

    private GoogleLocationDtos.TimeZone utcTimeZone() {
        Instant now = Instant.now();
        return new GoogleLocationDtos.TimeZone(
                "UTC", "UTC", 0, 0,
                LOCAL_DATE.withZone(ZoneId.of("UTC")).format(now),
                LOCAL_TIME.withZone(ZoneId.of("UTC")).format(now));
    }

    private boolean isPlacesConfigurationFailure(DomainException exception) {
        return "PLACE_SEARCH_FAILED".equals(exception.getCode())
                || "PLACE_SUGGESTION_FAILED".equals(exception.getCode())
                || "PLACE_DETAILS_FAILED".equals(exception.getCode());
    }

    private PresetRegion findPresetRegion(String query) {
        if (query == null) return null;
        String normalized = query.trim().toLowerCase(Locale.ROOT)
                .replaceAll("\\s+(kr|jp|fr|us|id)$", "")
                .replace('-', ' ')
                .replaceAll("\\s+", " ");
        return PRESET_REGIONS.get(normalized);
    }

    private GoogleLocationDtos.LocationSummary presetSummary(PresetRegion preset, String language) {
        ZoneId zoneId = ZoneId.of(preset.timeZoneId());
        Instant now = Instant.now();
        int offsetSeconds = zoneId.getRules().getOffset(now).getTotalSeconds();
        GoogleLocationDtos.Place place = new GoogleLocationDtos.Place(
                language.equals("ko") ? preset.koreanName() : preset.englishAddress().split(",")[0],
                preset.englishAddress(), preset.latitude(), preset.longitude());
        GoogleLocationDtos.Weather weather = new GoogleLocationDtos.Weather(
                null, null, null, null, "Google Weather unavailable");
        GoogleLocationDtos.TimeZone timeZone = new GoogleLocationDtos.TimeZone(
                preset.timeZoneId(), preset.timeZoneId(), offsetSeconds, 0,
                LOCAL_DATE.withZone(zoneId).format(now), LOCAL_TIME.withZone(zoneId).format(now));
        return new GoogleLocationDtos.LocationSummary(
                place,
                weather,
                timeZone,
                estimateFlight(preset.latitude(), preset.longitude(), language));
    }

    private record PresetRegion(
            String koreanName,
            String englishAddress,
            double latitude,
            double longitude,
            String timeZoneId) {}

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
        String status = body.path("status").asText();
        if (!"OK".equals(status) && !"ZERO_RESULTS".equals(status)) {
            throw providerFailure(status, "PLACE_SUGGESTION_FAILED");
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
        JsonNode result = body.path("result");
        String status = body.path("status").asText();
        if ("ZERO_RESULTS".equals(status) || ("OK".equals(status) && result.isMissingNode())) {
            throw new DomainException(HttpStatus.NOT_FOUND, "PLACE_NOT_FOUND", "지역을 찾을 수 없습니다.");
        }
        if (!"OK".equals(status)) throw providerFailure(status, "PLACE_DETAILS_FAILED");
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
        if (apiKey == null || apiKey.isBlank()) {
            return new GoogleLocationDtos.Weather(null, null, null, null, "Google Weather unavailable");
        }
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

        if ("ZERO_RESULTS".equals(status) || ("OK".equals(status) && first == null)) {
            return findPlaceFromAutocomplete(query, language);
        }
        if (!"OK".equals(status)) throw providerFailure(status, "PLACE_SEARCH_FAILED");

        JsonNode location = first.path("geometry").path("location");
        return new GoogleLocationDtos.Place(
                first.path("name").asText(query),
                first.path("formatted_address").asText(""),
                location.path("lat").asDouble(),
                location.path("lng").asDouble());
    }

    /**
     * Text Search가 고정 도시명에도 결과를 주지 않는 API 설정을 대비해, 이미 장소 선택에서
     * 사용 중인 Autocomplete + Place Details 조합으로 한 번 더 해석한다.
     */
    private GoogleLocationDtos.Place findPlaceFromAutocomplete(String query, String language) {
        List<GoogleLocationDtos.LocationSuggestion> suggestions = suggest(query, language, "region");
        if (suggestions.isEmpty()) {
            throw new DomainException(HttpStatus.NOT_FOUND, "PLACE_NOT_FOUND", "지역을 찾을 수 없습니다.");
        }

        GoogleLocationDtos.ResolvedPlace resolved = resolvePlace(suggestions.get(0).placeId(), language);
        return new GoogleLocationDtos.Place(
                resolved.displayName(),
                resolved.formattedAddress(),
                resolved.latitude(),
                resolved.longitude());
    }

    private DomainException providerFailure(String status, String code) {
        HttpStatus httpStatus = "OVER_QUERY_LIMIT".equals(status)
                || "UNKNOWN_ERROR".equals(status)
                ? HttpStatus.SERVICE_UNAVAILABLE
                : HttpStatus.BAD_GATEWAY;
        String message = "REQUEST_DENIED".equals(status)
                ? "지역 서비스 인증 또는 사용 설정을 확인해주세요."
                : "지역 서비스에 일시적으로 연결할 수 없습니다.";
        return new DomainException(httpStatus, code, message);
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
