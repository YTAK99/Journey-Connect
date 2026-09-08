package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

class ExploreCursorCodecTest {

    private static final Instant REFERENCE_TIME = Instant.parse("2026-08-14T00:00:00Z");
    private static final byte[] SECRET =
            "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8);

    private final ExploreCursorCodec codec = new ExploreCursorCodec(SECRET);

    @Test
    void roundTripsFrozenOrderingAndOffset() {
        ExploreCursorCodec.Snapshot snapshot = snapshot(List.of(9L, 7L, 5L), 1, Optional.empty());

        String token = codec.encode(snapshot);
        ExploreCursorCodec.Snapshot decoded = codec.decode(
                token,
                expectations(Optional.empty()),
                REFERENCE_TIME.plus(10, ChronoUnit.MINUTES));

        assertThat(decoded).isEqualTo(snapshot);
    }

    @Test
    void rejectsTamperedCursor() {
        String token = codec.encode(snapshot(List.of(9L, 7L, 5L), 1, Optional.empty()));
        char replacement = token.charAt(5) == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, 5) + replacement + token.substring(6);

        assertThatThrownBy(() -> codec.decode(
                tampered,
                expectations(Optional.empty()),
                REFERENCE_TIME.plusSeconds(1)))
                .isInstanceOfSatisfying(
                        ExploreCursorException.class,
                        exception -> assertThat(exception.reason())
                                .isEqualTo(ExploreCursorException.Reason.TAMPERED));
    }

    @Test
    void rejectsChangedFilterAndRankingVersion() {
        String token = codec.encode(snapshot(List.of(9L, 7L), 0, Optional.empty()));

        ExploreCursorCodec.Expectations wrongFilter = new ExploreCursorCodec.Expectations(
                ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                "different-filter",
                Optional.empty());
        ExploreCursorCodec.Expectations wrongVersion = new ExploreCursorCodec.Expectations(
                "explore-discovery-ranking-v2",
                "filter-a",
                Optional.empty());

        assertThatThrownBy(() -> codec.decode(token, wrongFilter, REFERENCE_TIME.plusSeconds(1)))
                .isInstanceOfSatisfying(
                        ExploreCursorException.class,
                        exception -> assertThat(exception.reason())
                                .isEqualTo(ExploreCursorException.Reason.FILTER_MISMATCH));
        assertThatThrownBy(() -> codec.decode(token, wrongVersion, REFERENCE_TIME.plusSeconds(1)))
                .isInstanceOfSatisfying(
                        ExploreCursorException.class,
                        exception -> assertThat(exception.reason())
                                .isEqualTo(ExploreCursorException.Reason.RANKING_VERSION_MISMATCH));
    }

    @Test
    void rejectsDifferentUserBindingAndExpiredCursor() {
        String token = codec.encode(snapshot(List.of(9L, 7L), 0, Optional.of("user-binding-a")));

        assertThatThrownBy(() -> codec.decode(
                token,
                expectations(Optional.of("user-binding-b")),
                REFERENCE_TIME.plusSeconds(1)))
                .isInstanceOfSatisfying(
                        ExploreCursorException.class,
                        exception -> assertThat(exception.reason())
                                .isEqualTo(ExploreCursorException.Reason.USER_BINDING_MISMATCH));

        assertThatThrownBy(() -> codec.decode(
                token,
                expectations(Optional.of("user-binding-a")),
                REFERENCE_TIME.plus(2, ChronoUnit.HOURS)))
                .isInstanceOfSatisfying(
                        ExploreCursorException.class,
                        exception -> assertThat(exception.reason())
                                .isEqualTo(ExploreCursorException.Reason.EXPIRED));
    }

    @Test
    void filterFingerprintNormalizesEquivalentRequestValues() {
        ExploreRequestContext left = ExploreRequestContext.resolve(null, " KR-11 ");
        ExploreRequestContext right = ExploreRequestContext.resolve(" ", "kr-11");

        assertThat(ExploreCursorCodec.filterFingerprint(left))
                .isEqualTo(ExploreCursorCodec.filterFingerprint(right));
    }

    @Test
    void measuresRepresentativeHundredIdCursorWithoutFixingProductCap() {
        List<Long> ids = LongStream.rangeClosed(
                        9_000_000_000_000_000_001L,
                        9_000_000_000_000_000_100L)
                .boxed()
                .toList();
        String token = codec.encode(snapshot(ids, 20, Optional.empty()));

        int tokenBytes = token.getBytes(StandardCharsets.UTF_8).length;

        assertThat(tokenBytes).isLessThan(2_000);
    }

    @Test
    void rejectsDuplicateFrozenIdsAndWeakSecret() {
        assertThatThrownBy(() -> snapshot(List.of(1L, 1L), 0, Optional.empty()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ExploreCursorCodec("short".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static ExploreCursorCodec.Snapshot snapshot(
            List<Long> ids,
            int offset,
            Optional<String> userBinding) {
        return new ExploreCursorCodec.Snapshot(
                ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                REFERENCE_TIME,
                "filter-a",
                userBinding,
                ids,
                offset,
                REFERENCE_TIME.plus(1, ChronoUnit.HOURS));
    }

    private static ExploreCursorCodec.Expectations expectations(Optional<String> userBinding) {
        return new ExploreCursorCodec.Expectations(
                ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                "filter-a",
                userBinding);
    }
}
