package com.jc.backend.google;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class GoogleLocationPresetFallbackTest {

    @Test
    void returnsPresetSummaryWithoutGoogleApiKey() {
        GoogleLocationService service = new GoogleLocationService(RestClient.builder(), "");

        GoogleLocationDtos.LocationSummary summary = service.lookup("Seoul KR", "ko");

        assertThat(summary.place().name()).isEqualTo("서울");
        assertThat(summary.place().latitude()).isEqualTo(37.5665);
        assertThat(summary.timeZone().id()).isEqualTo("Asia/Seoul");
        assertThat(summary.timeZone().localTime()).matches("\\d{2}:\\d{2}");
        assertThat(summary.flight()).isNotNull();
    }

    @Test
    void resolvesEveryFrontendPresetAlias() {
        GoogleLocationService service = new GoogleLocationService(RestClient.builder(), "");

        assertThat(new String[] {"Busan KR", "Jeju KR", "Gangneung KR", "Tokyo JP",
                "Osaka JP", "Paris FR", "New York US", "Bali ID"})
                .allSatisfy(query -> assertThat(service.lookup(query, "en").place()).isNotNull());
    }

    @Test
    void buildsSummaryFromBrowserSelectedCoordinatesWithoutPlacesLookup() {
        GoogleLocationService service = new GoogleLocationService(RestClient.builder(), "");

        GoogleLocationDtos.LocationSummary summary = service.lookupCoordinates(
                "London", "London, UK", 51.5072, -0.1276, "en");

        assertThat(summary.place().name()).isEqualTo("London");
        assertThat(summary.place().formattedAddress()).isEqualTo("London, UK");
        assertThat(summary.place().latitude()).isEqualTo(51.5072);
        assertThat(summary.timeZone().id()).isEqualTo("UTC");
        assertThat(summary.flight()).isNotNull();
    }
}
