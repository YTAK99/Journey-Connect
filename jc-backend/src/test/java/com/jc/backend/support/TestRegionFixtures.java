package com.jc.backend.support;

import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;

public final class TestRegionFixtures {

    private TestRegionFixtures() {}

    public static Region region(
            RegionRepository regions,
            String code,
            String countryCode,
            String displayName) {
        return regions.findByCodeIgnoreCase(code)
                .orElseGet(() -> regions.save(new Region(code, countryCode, displayName, null)));
    }
}
