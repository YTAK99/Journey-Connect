package com.jc.backend.post;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.CursorPageResponse;
import com.jc.backend.common.DomainException;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

@SpringBootTest
@Transactional
class FeedCursorIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostService postService;
    @Autowired private EntityManager entityManager;

    @Test
    void cursorFeedReturnsEveryPostOnceWithoutOffsetCountQueryContract() {
        String fixtureId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        UserAccount author = users.save(new UserAccount(
                "cursor-" + fixtureId + "@example.com",
                "hash",
                "cursor-" + fixtureId));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");

        List<JourneyPost> createdPosts = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            createdPosts.add(posts.save(new JourneyPost(
                    author,
                    seoul,
                    "cursor-" + fixtureId + "-" + i,
                    "content-" + i
            )));
        }

        posts.flush();
        entityManager.clear();

        List<Long> expectedIds = posts
                .findByPublishedTrueAndModerationStatusOrderByCreatedAtDescIdDesc(
                        "visible",
                        PageRequest.of(0, 1000))
                .getContent()
                .stream()
                .map(JourneyPost::getId)
                .toList();

        List<Long> collected = new ArrayList<>();
        String cursor = null;
        boolean hasNext;

        do {
            CursorPageResponse<PostDtos.Summary> page = postService.feed(cursor, 2);
            collected.addAll(page.items().stream()
                    .map(PostDtos.Summary::id)
                    .toList());
            cursor = page.nextCursor();
            hasNext = page.hasNext();
        } while (hasNext);

        assertThat(collected).containsExactlyElementsOf(expectedIds);
        assertThat(new HashSet<>(collected)).hasSameSizeAs(collected);
    }

    @Test
    void regionCursorFiltersBeforePaginationAndUsesIdTieBreakForSameTimestamp() {
        String fixtureId = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        UserAccount author = users.save(new UserAccount(
                "region-cursor-" + fixtureId + "@example.com",
                "hash",
                "region-cursor-" + fixtureId));
        Region target = regions.save(new Region("KR-FEED-A-" + fixtureId, "KR", "Feed A " + fixtureId, null));
        Region other = regions.save(new Region("KR-FEED-B-" + fixtureId, "KR", "Feed B " + fixtureId, null));

        List<JourneyPost> targetPosts = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            targetPosts.add(posts.save(new JourneyPost(author, target, "target-" + i, "content")));
        }
        for (int i = 1; i <= 3; i++) {
            posts.save(new JourneyPost(author, other, "other-" + i, "content"));
        }
        posts.flush();

        LocalDateTime tiedAt = LocalDateTime.of(2026, 9, 3, 12, 0);
        for (JourneyPost post : targetPosts) {
            entityManager.createNativeQuery("update journey_post set created_at = :createdAt where id = :id")
                    .setParameter("createdAt", Timestamp.valueOf(tiedAt))
                    .setParameter("id", post.getId())
                    .executeUpdate();
        }
        entityManager.clear();

        List<Long> expected = targetPosts.stream()
                .map(JourneyPost::getId)
                .sorted(java.util.Comparator.reverseOrder())
                .toList();
        List<Long> collected = new ArrayList<>();
        String cursor = null;
        boolean hasNext;
        do {
            CursorPageResponse<PostDtos.Summary> page = postService.feed(cursor, 2, target.getCode(), null);
            collected.addAll(page.items().stream().map(PostDtos.Summary::id).toList());
            cursor = page.nextCursor();
            hasNext = page.hasNext();
        } while (hasNext);

        assertThat(collected).containsExactlyElementsOf(expected);
        assertThat(new HashSet<>(collected)).hasSameSizeAs(collected);
        assertThat(collected).doesNotContainAnyElementsOf(
                posts.findFeedByRegionCode(other.getCode(), PageRequest.of(0, 100)).stream()
                        .map(JourneyPost::getId)
                        .toList());
    }

    @Test
    void invalidRegionIsRejectedInsteadOfReturningAnEmptyFeed() {
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> postService.feed(null, 20, "ZZ-NOT-FOUND", null))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo("REGION_NOT_FOUND");
                    assertThat(exception.getStatus().value()).isEqualTo(404);
                });
    }
}
