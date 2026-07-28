package com.jc.backend.region;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jc.backend.google.GoogleLocationService;
import com.jc.backend.google.GoogleLocationDtos;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RegionServiceTest {

    private RegionRepository repository;
    private GoogleLocationService googleLocations;
    private RegionService service;
    private Map<String, Region> stored;
    private Map<String, Region> storedByPlaceId;

    @BeforeEach
    void setUp() {
        repository = mock(RegionRepository.class);
        googleLocations = mock(GoogleLocationService.class);
        service = new RegionService(repository, googleLocations);
        stored = new HashMap<>();
        storedByPlaceId = new HashMap<>();

        when(repository.findByCodeIgnoreCase(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(stored.get(invocation.getArgument(0))));
        when(repository.findFirstByDisplayNameIgnoreCase(anyString()))
                .thenAnswer(invocation -> stored.values().stream()
                        .filter(region -> region.getDisplayName().equalsIgnoreCase(invocation.getArgument(0)))
                        .findFirst());
        when(repository.findFirstByTranslatedNameIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(repository.findByGooglePlaceId(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(storedByPlaceId.get(invocation.getArgument(0))));
        doAnswer(invocation -> {
            String code = invocation.getArgument(0);
            stored.putIfAbsent(code, new Region(
                    code,
                    invocation.getArgument(1),
                    invocation.getArgument(2),
                    null,
                    null,
                    invocation.getArgument(3)));
            return 1;
        }).when(repository).insertIfMissing(anyString(), anyString(), anyString(), anyString());
        doAnswer(invocation -> {
            String code = invocation.getArgument(0);
            String placeId = invocation.getArgument(3);
            Region region = new Region(
                    code,
                    invocation.getArgument(1),
                    invocation.getArgument(2),
                    null,
                    placeId,
                    invocation.getArgument(4));
            stored.putIfAbsent(code, region);
            storedByPlaceId.putIfAbsent(placeId, region);
            return 1;
        }).when(repository).insertGoogleRegionIfMissing(
                anyString(), anyString(), anyString(), anyString(), anyString(),
                org.mockito.ArgumentMatchers.anyDouble(), org.mockito.ArgumentMatchers.anyDouble());
    }

    @Test
    void registersMissingPresetRegionWithProvidedCode() {
        Region region = service.require("US-HAWAII", "하와이");

        assertThat(region.getCode()).isEqualTo("US-HAWAII");
        assertThat(region.getCountryCode()).isEqualTo("US");
        assertThat(region.getDisplayName()).isEqualTo("하와이");
        verify(repository).insertIfMissing(
                org.mockito.ArgumentMatchers.eq("US-HAWAII"),
                org.mockito.ArgumentMatchers.eq("US"),
                org.mockito.ArgumentMatchers.eq("하와이"),
                argThat(value -> value.contains("하와이") && value.contains("미국") && value.contains("United States")));
    }

    @Test
    void reusesDeterministicCustomRegionForGoogleSuggestion() {
        Region first = service.require(null, "미국 하와이");
        Region second = service.require(null, "미국  하와이");

        assertThat(second.getCode()).isEqualTo(first.getCode());
        assertThat(second.getDisplayName()).isEqualTo("미국 하와이");
    }

    @Test
    void storesBilingualHierarchyForGoogleCity() {
        String placeId = "honolulu-place";
        when(googleLocations.resolvePlace(placeId, "ko"))
                .thenReturn(new GoogleLocationDtos.ResolvedPlace(
                        placeId,
                        "호놀룰루",
                        "미국 HI 호놀룰루",
                        List.of("호놀룰루", "하와이", "미국"),
                        "US",
                        21.3099,
                        -157.8581));
        when(googleLocations.resolvePlace(placeId, "en"))
                .thenReturn(new GoogleLocationDtos.ResolvedPlace(
                        placeId,
                        "Honolulu",
                        "Honolulu, HI, USA",
                        List.of("Honolulu", "Hawaii", "United States"),
                        "US",
                        21.3099,
                        -157.8581));

        Region region = service.require(null, "호놀룰루", placeId);

        assertThat(service.searchText(region))
                .contains("호놀룰루", "하와이", "미국", "Honolulu", "Hawaii", "United States");
    }

    @Test
    void reusesGoogleRegionWhenLegacyNameMatchesTranslation() {
        Region honolulu = new Region(
                "GOOGLE-HONOLULU",
                "US",
                "Honolulu",
                null,
                "honolulu-place",
                "호놀룰루 하와이 미국 Honolulu Hawaii United States");
        when(repository.findFirstByTranslatedNameIgnoreCase("호놀룰루"))
                .thenReturn(Optional.of(honolulu));

        Region region = service.require(null, "호놀룰루", null);

        assertThat(region).isSameAs(honolulu);
        assertThat(region.getCountryCode()).isEqualTo("US");
    }

    @Test
    void resolvesLocalizedCountryNameToCountryCode() {
        assertThat(service.countryCodeForSearch("미국")).isEqualTo("US");
        assertThat(service.countryCodeForSearch("United States")).isEqualTo("US");
        assertThat(service.countryCodeForSearch("US")).isEqualTo("US");
        assertThat(service.countryCodeForSearch("하와이")).isEmpty();
    }
}
