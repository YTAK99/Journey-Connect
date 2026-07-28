package com.jc.backend.region;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jc.backend.google.GoogleLocationService;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RegionServiceTest {

    private RegionRepository repository;
    private RegionService service;
    private Map<String, Region> stored;

    @BeforeEach
    void setUp() {
        repository = mock(RegionRepository.class);
        service = new RegionService(repository, mock(GoogleLocationService.class));
        stored = new HashMap<>();

        when(repository.findByCodeIgnoreCase(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(stored.get(invocation.getArgument(0))));
        when(repository.findFirstByDisplayNameIgnoreCase(anyString()))
                .thenAnswer(invocation -> stored.values().stream()
                        .filter(region -> region.getDisplayName().equalsIgnoreCase(invocation.getArgument(0)))
                        .findFirst());
        doAnswer(invocation -> {
            String code = invocation.getArgument(0);
            stored.putIfAbsent(code, new Region(
                    code,
                    invocation.getArgument(1),
                    invocation.getArgument(2),
                    null));
            return 1;
        }).when(repository).insertIfMissing(anyString(), anyString(), anyString());
    }

    @Test
    void registersMissingPresetRegionWithProvidedCode() {
        Region region = service.require("US-HAWAII", "하와이");

        assertThat(region.getCode()).isEqualTo("US-HAWAII");
        assertThat(region.getCountryCode()).isEqualTo("US");
        assertThat(region.getDisplayName()).isEqualTo("하와이");
        verify(repository).insertIfMissing("US-HAWAII", "US", "하와이");
    }

    @Test
    void reusesDeterministicCustomRegionForGoogleSuggestion() {
        Region first = service.require(null, "미국 하와이");
        Region second = service.require(null, "미국  하와이");

        assertThat(second.getCode()).isEqualTo(first.getCode());
        assertThat(second.getDisplayName()).isEqualTo("미국 하와이");
    }
}
