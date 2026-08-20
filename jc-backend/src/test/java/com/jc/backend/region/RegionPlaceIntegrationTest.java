package com.jc.backend.region;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RegionPlaceIntegrationTest {

    @Autowired private RegionRepository regions;

    @Test
    void storesOneGoogleRegionWithKoreanAndEnglishNames() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        String code = "GOOGLE-" + suffix;
        String placeId = "place-" + suffix;

        String searchText = "호놀룰루 하와이 미국 Honolulu Hawaii United States";
        regions.insertGoogleRegionIfMissing(code, "US", "Honolulu", placeId, searchText, 21.3099, -157.8581);
        regions.insertGoogleRegionIfMissing(code, "US", "Honolulu", placeId, searchText, 21.3099, -157.8581);
        Region region = regions.findByGooglePlaceId(placeId).orElseThrow();
        regions.upsertTranslation(region.getId(), "ko", "호놀룰루");
        regions.upsertTranslation(region.getId(), "en", "Honolulu");

        Map<String, String> names = regions.findTranslations(region.getId()).stream()
                .collect(Collectors.toMap(
                        RegionTranslationProjection::getLanguageCode,
                        RegionTranslationProjection::getDisplayName));

        assertThat(regions.findAll().stream()
                .filter(item -> placeId.equals(item.getGooglePlaceId())))
                .hasSize(1);
        assertThat(names).containsEntry("ko", "호놀룰루").containsEntry("en", "Honolulu");
        assertThat(region.getSearchText()).contains("하와이", "Hawaii", "United States");
    }
}
