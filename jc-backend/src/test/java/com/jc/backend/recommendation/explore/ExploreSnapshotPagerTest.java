package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ExploreSnapshotPagerTest {

    private static final Instant REFERENCE_TIME = Instant.parse("2026-08-14T00:00:00Z");

    private final ExploreSnapshotPager pager = new ExploreSnapshotPager();

    @Test
    void consumesFrozenOrderAcrossPagesWithoutDuplicates() {
        ExploreCursorCodec.Snapshot first = snapshot(List.of(9L, 8L, 7L, 6L, 5L), 0);

        ExploreSnapshotPager.Page page1 = pager.page(first, 2, ignored -> true);
        ExploreCursorCodec.Snapshot continuation = first.withNextOffset(page1.nextOffset());
        ExploreSnapshotPager.Page page2 = pager.page(continuation, 2, ignored -> true);

        assertThat(page1.postIds()).containsExactly(9L, 8L);
        assertThat(page2.postIds()).containsExactly(7L, 6L);
        assertThat(page1.postIds()).doesNotContainAnyElementsOf(page2.postIds());
    }

    @Test
    void hiddenPostIsSkippedAndNeverReappears() {
        ExploreCursorCodec.Snapshot first = snapshot(List.of(9L, 8L, 7L, 6L), 0);
        Set<Long> hidden = Set.of(8L);

        ExploreSnapshotPager.Page page1 = pager.page(first, 2, postId -> !hidden.contains(postId));
        ExploreCursorCodec.Snapshot continuation = first.withNextOffset(page1.nextOffset());
        ExploreSnapshotPager.Page page2 = pager.page(continuation, 2, postId -> !hidden.contains(postId));

        assertThat(page1.postIds()).containsExactly(9L, 7L);
        assertThat(page2.postIds()).containsExactly(6L);
        assertThat(page1.nextOffset()).isEqualTo(3);
        assertThat(page2.hasNext()).isFalse();
    }

    @Test
    void continuationNeverRecalculatesOrderWhenExternalSignalsChange() {
        ExploreCursorCodec.Snapshot frozen = snapshot(List.of(5L, 4L, 3L), 1);

        ExploreSnapshotPager.Page page = pager.page(frozen, 2, ignored -> true);

        assertThat(page.postIds()).containsExactly(4L, 3L);
    }

    private static ExploreCursorCodec.Snapshot snapshot(List<Long> ids, int offset) {
        return new ExploreCursorCodec.Snapshot(
                ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                REFERENCE_TIME,
                "filter",
                Optional.empty(),
                ids,
                offset,
                REFERENCE_TIME.plus(1, ChronoUnit.HOURS));
    }
}
