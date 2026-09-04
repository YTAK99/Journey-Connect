package com.jc.backend.google;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jc.backend.common.DomainException;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;

class GoogleLocationServiceTest {

    private static final String API_KEY = "unit-test-google-key";

    private MockRestServiceServer server;
    private GoogleLocationService service;
    private Logger serviceLogger;
    private ListAppender<ILoggingEvent> logAppender;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new GoogleLocationService(builder, new ObjectMapper(), API_KEY);

        serviceLogger = (Logger) LoggerFactory.getLogger(GoogleLocationService.class);
        logAppender = new ListAppender<>();
        logAppender.start();
        serviceLogger.addAppender(logAppender);
    }

    @AfterEach
    void tearDown() {
        serviceLogger.detachAppender(logAppender);
        logAppender.stop();
    }

    @Test
    void lookupReturnsLocationSummaryWhenGoogleResponsesAreOk() {
        enqueue(textSearchOk());
        enqueue(weatherOk());
        enqueue(timeZoneOk());

        GoogleLocationDtos.LocationSummary summary = service.lookup("New York US", "ko");

        assertThat(summary.place().name()).isEqualTo("New York");
        assertThat(summary.weather().temperatureDegrees()).isEqualTo(21.5);
        assertThat(summary.timeZone().id()).isEqualTo("America/New_York");
        server.verify();
    }

    @Test
    void zeroResultsMapsToPlaceNotFound() {
        enqueue(legacyError("ZERO_RESULTS", ""));

        assertDomainError(() -> service.lookup("missing", "ko"),
                HttpStatus.NOT_FOUND, "PLACE_NOT_FOUND");
    }

    @Test
    void requestDeniedMapsToRequestDenied() {
        enqueue(legacyError("REQUEST_DENIED", "Places API is disabled"));

        assertDomainError(() -> service.lookup("New York", "ko"),
                HttpStatus.BAD_GATEWAY, "GOOGLE_API_REQUEST_DENIED");
    }

    @Test
    void overQueryLimitMapsToQuotaExceeded() {
        enqueue(legacyError("OVER_QUERY_LIMIT", "Quota exceeded"));

        assertDomainError(() -> service.lookup("New York", "ko"),
                HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_API_QUOTA_EXCEEDED");
    }

    @Test
    void unknownErrorMapsToTemporaryError() {
        enqueue(legacyError("UNKNOWN_ERROR", "Try again"));

        assertDomainError(() -> service.lookup("New York", "ko"),
                HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_API_TEMPORARY_ERROR");
    }

    @Test
    void invalidRequestMapsToInvalidGoogleRequest() {
        enqueue(legacyError("INVALID_REQUEST", "Missing upstream parameter"));

        assertDomainError(() -> service.lookup("New York", "ko"),
                HttpStatus.BAD_GATEWAY, "GOOGLE_API_INVALID_REQUEST");
    }

    @Test
    void upstreamErrorLogRedactsTheApiKeyAndResponseDoesNotExposeRawMessage() {
        enqueue(legacyError("REQUEST_DENIED", "credential=" + API_KEY + " must not be logged"));

        assertThatThrownBy(() -> service.lookup("New York", "ko"))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getMessage()).doesNotContain(API_KEY, "must not be logged");
                });

        String logs = logAppender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .reduce("", (left, right) -> left + "\n" + right);
        assertThat(logs)
                .contains("REQUEST_DENIED", "[REDACTED]")
                .doesNotContain(API_KEY);
    }

    @Test
    void transportFailureLogDoesNotExposeTheGoogleUriOrQueryString() {
        server.expect(once(), anything())
                .andExpect(method(GET))
                .andRespond(request -> {
                    throw new ResourceAccessException(
                            "I/O error on https://maps.googleapis.com/maps/api/place/textsearch/json?key=" + API_KEY);
                });

        assertDomainError(() -> service.lookup("New York", "ko"),
                HttpStatus.BAD_GATEWAY, "GOOGLE_API_ERROR");

        String logs = logAppender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .reduce("", (left, right) -> left + "\n" + right);
        assertThat(logs)
                .contains("ResourceAccessException")
                .doesNotContain("maps.googleapis.com", "?key=", API_KEY);
    }

    @Test
    void autocompleteReturnsEmptyForZeroResultsAndClassifiesFailures() {
        enqueue(legacyError("ZERO_RESULTS", ""));
        enqueue(legacyError("REQUEST_DENIED", "Autocomplete API disabled"));

        assertThat(service.suggest("zz", "en")).isEmpty();
        assertDomainError(() -> service.suggest("New", "en"),
                HttpStatus.BAD_GATEWAY, "GOOGLE_API_REQUEST_DENIED");
    }

    @Test
    void placeDetailsUsesSharedErrorSemantics() {
        enqueue(legacyError("OVER_QUERY_LIMIT", "Details quota exhausted"));

        assertDomainError(() -> service.resolvePlace("place-id", "ko"),
                HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_API_QUOTA_EXCEEDED");
    }

    @Test
    void timeZoneUsesSharedErrorSemantics() {
        enqueue(textSearchOk());
        enqueue(weatherOk());
        enqueue(legacyError("REQUEST_DENIED", "Time Zone API disabled"));

        assertDomainError(() -> service.lookup("New York", "ko"),
                HttpStatus.BAD_GATEWAY, "GOOGLE_API_REQUEST_DENIED");
    }

    @Test
    void timeZoneZeroResultsIsNotMisreportedAsPlaceNotFound() {
        enqueue(textSearchOk());
        enqueue(weatherOk());
        enqueue("{\"status\":\"ZERO_RESULTS\",\"errorMessage\":\"No time zone data\"}");

        assertDomainError(() -> service.lookup("New York", "ko"),
                HttpStatus.BAD_GATEWAY, "GOOGLE_TIME_ZONE_NOT_FOUND");
    }

    @Test
    void weatherHttpCanonicalStatusIsClassifiedWithoutBreakingLocationSummary() {
        enqueue(textSearchOk());
        server.expect(once(), anything())
                .andExpect(method(GET))
                .andRespond(withStatus(HttpStatus.FORBIDDEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":403,\"message\":\"Weather API disabled\",\"status\":\"PERMISSION_DENIED\"}}"));
        enqueue(timeZoneOk());

        GoogleLocationDtos.LocationSummary summary = service.lookup("New York", "ko");

        assertThat(summary.weather().errorMessage()).contains("요청이 거부");
        assertThat(summary.timeZone().id()).isEqualTo("America/New_York");
        server.verify();
    }

    @Test
    void autocompleteAndPlaceDetailsStillReturnNormalResults() {
        enqueue("""
                {"status":"OK","predictions":[{"place_id":"p1","description":"Seoul, Korea",
                "structured_formatting":{"main_text":"Seoul","secondary_text":"Korea"}}]}
                """);
        enqueue("""
                {"status":"OK","result":{"place_id":"p1","name":"Seoul","formatted_address":"Seoul, Korea",
                "address_components":[{"long_name":"South Korea","short_name":"KR","types":["country"]}],
                "geometry":{"location":{"lat":37.5665,"lng":126.9780}}}}
                """);

        List<GoogleLocationDtos.LocationSuggestion> suggestions = service.suggest("Se", "en");
        assertThat(suggestions).singleElement().satisfies(suggestion ->
                assertThat(suggestion.placeId()).isEqualTo("p1"));
        GoogleLocationDtos.ResolvedPlace place = service.resolvePlace("p1", "en");
        assertThat(place.countryCode()).isEqualTo("KR");
        server.verify();
    }

    private void enqueue(String body) {
        server.expect(once(), anything())
                .andExpect(method(GET))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    private String legacyError(String status, String errorMessage) {
        return "{\"status\":\"" + status + "\",\"error_message\":\"" + errorMessage + "\"}";
    }

    private String textSearchOk() {
        return """
                {"status":"OK","results":[{"name":"New York","formatted_address":"New York, NY, USA",
                "geometry":{"location":{"lat":40.7128,"lng":-74.0060}}}]}
                """;
    }

    private String weatherOk() {
        return """
                {"temperature":{"degrees":21.5,"unit":"CELSIUS"},
                "weatherCondition":{"description":{"text":"Clear"}},"isDaytime":true}
                """;
    }

    private String timeZoneOk() {
        return """
                {"status":"OK","timeZoneId":"America/New_York","timeZoneName":"Eastern Time",
                "rawOffset":-18000,"dstOffset":3600}
                """;
    }

    private void assertDomainError(ThrowingCall call, HttpStatus status, String code) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(status);
                    assertThat(exception.getCode()).isEqualTo(code);
                });
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run();
    }
}
