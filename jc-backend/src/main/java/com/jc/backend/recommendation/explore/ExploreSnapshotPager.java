package com.jc.backend.recommendation.explore;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.LongPredicate;

/**
 * frozen cursor ordering을 재계산 없이 소비합니다.
 * visibility predicate가 false인 ID는 건너뛰고 offset을 전진시켜 이후 페이지에서 재노출하지 않습니다.
 */
public final class ExploreSnapshotPager {

    public Page page(
            ExploreCursorCodec.Snapshot snapshot,
            int size,
            LongPredicate isCurrentlyVisible) {
        Objects.requireNonNull(snapshot, "snapshot");
        Objects.requireNonNull(isCurrentlyVisible, "isCurrentlyVisible");
        if (size <= 0) {
            throw new IllegalArgumentException("size must be positive");
        }

        List<Long> result = new ArrayList<>(Math.min(size, snapshot.orderedPostIds().size()));
        int offset = snapshot.nextOffset();

        while (offset < snapshot.orderedPostIds().size() && result.size() < size) {
            long postId = snapshot.orderedPostIds().get(offset);
            offset++;
            if (isCurrentlyVisible.test(postId)) {
                result.add(postId);
            }
        }

        boolean hasNext = offset < snapshot.orderedPostIds().size();
        return new Page(List.copyOf(result), offset, hasNext);
    }

    public record Page(List<Long> postIds, int nextOffset, boolean hasNext) {
        public Page {
            postIds = postIds == null ? List.of() : List.copyOf(postIds);
            if (nextOffset < 0) {
                throw new IllegalArgumentException("nextOffset must not be negative");
            }
        }
    }
}
