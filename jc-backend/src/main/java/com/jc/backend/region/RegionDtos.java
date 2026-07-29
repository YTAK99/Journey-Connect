package com.jc.backend.region;

import java.util.Map;

public final class RegionDtos {

    private RegionDtos() {}

    public record View(
            Long id,
            String code,
            String countryCode,
            String displayName,
            Double latitude,
            Double longitude,
            String googlePlaceId,
            Map<String, String> localizedNames,
            String searchText) {}
}
