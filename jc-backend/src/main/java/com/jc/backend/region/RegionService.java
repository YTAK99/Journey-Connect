package com.jc.backend.region;

import com.jc.backend.common.DomainException;
import com.jc.backend.google.GoogleLocationDtos;
import com.jc.backend.google.GoogleLocationService;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 지역 코드 해석과 PostGIS 기반 주변 지역 검색 규칙을 담당합니다. */
@Service
@Transactional(readOnly = true)
public class RegionService {

    private static final Set<String> ISO_COUNTRY_CODES = Set.copyOf(Arrays.asList(Locale.getISOCountries()));

    private final RegionRepository regions;
    private final GoogleLocationService googleLocations;

    public RegionService(RegionRepository regions, GoogleLocationService googleLocations) {
        this.regions = regions;
        this.googleLocations = googleLocations;
    }

    public List<RegionDtos.View> list(String keyword) {
        List<Region> result = keyword == null || keyword.isBlank()
                ? regions.findTop50ByOrderByCountryCodeAscDisplayNameAsc()
                : regions.findTop50ByDisplayNameContainingIgnoreCaseOrderByDisplayNameAsc(keyword.trim());
        return result.stream().map(this::view).toList();
    }

    public List<RegionDtos.View> nearby(
            double latitude,
            double longitude,
            double radiusKm,
            int limit) {
        validateCoordinates(latitude, longitude);
        if (radiusKm <= 0 || radiusKm > 500) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_RADIUS",
                    "검색 반경은 0km 초과 500km 이하여야 합니다.");
        }
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        // 저장소 쿼리는 미터 단위를 사용하므로 API의 km 입력을 변환합니다.
        return regions.findNearby(latitude, longitude, radiusKm * 1000, safeLimit)
                .stream()
                .map(this::view)
                .toList();
    }


    @Transactional
    public Region require(String code, String legacyName) {
        return require(code, legacyName, null);
    }

    @Transactional
    public Region require(String code, String legacyName, String googlePlaceId) {
        if (googlePlaceId != null && !googlePlaceId.isBlank()) {
            String normalizedPlaceId = googlePlaceId.trim();
            return regions.findByGooglePlaceId(normalizedPlaceId)
                    .map(region -> ensureGoogleSearchText(region, normalizedPlaceId))
                    .orElseGet(() -> registerGooglePlace(normalizedPlaceId));
        }
        if (code != null && !code.isBlank()) {
            String normalizedCode = code.trim().toUpperCase(Locale.ROOT);
            return regions.findByCodeIgnoreCase(normalizedCode)
                    .orElseGet(() -> registerMissing(
                            normalizedCode,
                            countryCodeOf(normalizedCode),
                            legacyName));
        }
        if (legacyName != null && !legacyName.isBlank()) {
            String displayName = normalizeDisplayName(legacyName);
            return regions.findFirstByTranslatedNameIgnoreCase(displayName)
                    .or(() -> regions.findFirstByDisplayNameIgnoreCase(displayName))
                    .map(this::ensureGoogleSearchText)
                    .orElseGet(() -> registerMissing(customCode(displayName), "ZZ", displayName));
        }
        throw new DomainException(
                HttpStatus.BAD_REQUEST,
                "REGION_REQUIRED",
                "지역 코드는 필수입니다.");
    }

    private Region registerGooglePlace(String placeId) {
        GoogleLocationDtos.ResolvedPlace korean = googleLocations.resolvePlace(placeId, "ko");
        GoogleLocationDtos.ResolvedPlace english = googleLocations.resolvePlace(placeId, "en");
        String code = googleCode(placeId);
        String searchText = googleSearchText(korean, english);
        regions.insertGoogleRegionIfMissing(
                code,
                english.countryCode(),
                normalizeDisplayName(english.displayName()),
                placeId,
                searchText,
                english.latitude(),
                english.longitude());
        Region region = regions.findByGooglePlaceId(placeId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "REGION_REGISTRATION_FAILED",
                        "지역을 등록하지 못했습니다."));
        if (region.getSearchText() == null || region.getSearchText().isBlank()) {
            region.updateSearchText(searchText);
        }
        regions.upsertTranslation(region.getId(), "ko", normalizeDisplayName(korean.displayName()));
        regions.upsertTranslation(region.getId(), "en", normalizeDisplayName(english.displayName()));
        return region;
    }

    private Region ensureGoogleSearchText(Region region, String placeId) {
        if (region.getSearchText() != null && !region.getSearchText().isBlank()) {
            return region;
        }
        GoogleLocationDtos.ResolvedPlace korean = googleLocations.resolvePlace(placeId, "ko");
        GoogleLocationDtos.ResolvedPlace english = googleLocations.resolvePlace(placeId, "en");
        region.updateSearchText(googleSearchText(korean, english));
        regions.upsertTranslation(region.getId(), "ko", normalizeDisplayName(korean.displayName()));
        regions.upsertTranslation(region.getId(), "en", normalizeDisplayName(english.displayName()));
        return region;
    }

    private Region ensureGoogleSearchText(Region region) {
        String placeId = region.getGooglePlaceId();
        return placeId == null || placeId.isBlank()
                ? region
                : ensureGoogleSearchText(region, placeId);
    }

    private Region registerMissing(String code, String countryCode, String displayName) {
        if (displayName == null || displayName.isBlank()) {
            throw new DomainException(
                    HttpStatus.NOT_FOUND,
                    "REGION_NOT_FOUND",
                    "지역을 찾을 수 없습니다.");
        }
        if (!code.matches("[A-Z0-9-]{2,50}")) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REGION_CODE",
                    "올바르지 않은 지역 코드입니다.");
        }

        String normalizedName = normalizeDisplayName(displayName);
        regions.insertIfMissing(
                code,
                countryCode,
                normalizedName,
                joinSearchText(normalizedName, code, countryCode, countryAliases(countryCode)));
        return regions.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "REGION_REGISTRATION_FAILED",
                        "지역을 등록하지 못했습니다."));
    }

    private String normalizeDisplayName(String displayName) {
        String normalized = displayName.trim().replaceAll("\\s+", " ");
        if (normalized.length() > 100) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "REGION_NAME_TOO_LONG",
                    "지역 이름은 100자 이하로 선택해 주세요.");
        }
        return normalized;
    }

    private String countryCodeOf(String code) {
        return code.matches("[A-Z]{2}-.*") ? code.substring(0, 2) : "ZZ";
    }

    private String customCode(String displayName) {
        String source = displayName.toLowerCase(Locale.ROOT);
        String value = UUID.nameUUIDFromBytes(source.getBytes(StandardCharsets.UTF_8))
                .toString()
                .replace("-", "")
                .substring(0, 16)
                .toUpperCase(Locale.ROOT);
        return "CUSTOM-" + value;
    }

    private String googleCode(String placeId) {
        String value = UUID.nameUUIDFromBytes(placeId.getBytes(StandardCharsets.UTF_8))
                .toString()
                .replace("-", "")
                .substring(0, 16)
                .toUpperCase(Locale.ROOT);
        return "GOOGLE-" + value;
    }

    public Region requireByCode(String code) {
        if (code == null || code.isBlank()) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "REGION_REQUIRED",
                    "지역 코드는 필수입니다.");
        }
        return regions.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "REGION_NOT_FOUND",
                        "지역을 찾을 수 없습니다."));
    }

    public RegionDtos.View view(Region region) {
        Double latitude = region.getCenter() == null ? null : region.getCenter().getY();
        Double longitude = region.getCenter() == null ? null : region.getCenter().getX();
        return new RegionDtos.View(
                region.getId(),
                region.getCode(),
                region.getCountryCode(),
                region.getDisplayName(),
                latitude,
                longitude,
                region.getGooglePlaceId(),
                localizedNames(region),
                searchText(region));
    }

    public String searchText(Region region) {
        return joinSearchText(
                region.getSearchText(),
                region.getDisplayName(),
                region.getCode(),
                region.getCountryCode(),
                countryAliases(region.getCountryCode()));
    }

    public String countryCodeForSearch(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = value.trim();
        String upper = normalized.toUpperCase(Locale.ROOT);
        if (ISO_COUNTRY_CODES.contains(upper)) {
            return upper;
        }
        return ISO_COUNTRY_CODES.stream()
                .filter(code -> countryAliases(code).stream()
                        .anyMatch(name -> name.equalsIgnoreCase(normalized)))
                .findFirst()
                .orElse("");
    }

    public Map<String, String> localizedNames(Region region) {
        return regions.findTranslations(region.getId()).stream()
                .collect(Collectors.toUnmodifiableMap(
                        RegionTranslationProjection::getLanguageCode,
                        RegionTranslationProjection::getDisplayName,
                        (first, ignored) -> first));
    }

    private String googleSearchText(
            GoogleLocationDtos.ResolvedPlace korean,
            GoogleLocationDtos.ResolvedPlace english) {
        return joinSearchText(
                korean.displayName(),
                korean.formattedAddress(),
                korean.addressComponentNames(),
                english.displayName(),
                english.formattedAddress(),
                english.addressComponentNames(),
                english.countryCode(),
                countryAliases(english.countryCode()));
    }

    private List<String> countryAliases(String countryCode) {
        if (countryCode == null) {
            return List.of();
        }
        String normalized = countryCode.trim().toUpperCase(Locale.ROOT);
        if (!ISO_COUNTRY_CODES.contains(normalized)) {
            return List.of();
        }
        Locale country = Locale.of("", normalized);
        return List.of(
                country.getDisplayCountry(Locale.KOREAN),
                country.getDisplayCountry(Locale.ENGLISH));
    }

    private String joinSearchText(Object... values) {
        LinkedHashSet<String> parts = new LinkedHashSet<>();
        for (Object value : values) {
            if (value instanceof Iterable<?> iterable) {
                for (Object item : iterable) {
                    addSearchPart(parts, item);
                }
            } else {
                addSearchPart(parts, value);
            }
        }
        return String.join(" ", parts);
    }

    private void addSearchPart(Set<String> parts, Object value) {
        if (value == null) {
            return;
        }
        String normalized = value.toString().trim().replaceAll("\\s+", " ");
        if (!normalized.isBlank()) {
            parts.add(normalized);
        }
    }

    private void validateCoordinates(double latitude, double longitude) {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_COORDINATES",
                    "위도 또는 경도 범위가 올바르지 않습니다.");
        }
    }
}
