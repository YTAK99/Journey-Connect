package com.jc.backend.post;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.CursorPageResponse;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
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
}
