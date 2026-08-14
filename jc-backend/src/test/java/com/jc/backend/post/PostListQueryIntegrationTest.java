package com.jc.backend.post;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.PageResponse;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PostListQueryIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostLikeRepository likes;
    @Autowired private BookmarkRepository bookmarks;
    @Autowired private PostService postService;
    @Autowired private EntityManager entityManager;

    @Test
    void feedLoadsAuthorRegionAndReactionCountsWithFixedNumberOfQueries() {
        String fixtureId = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        UserAccount firstAuthor = users.save(new UserAccount("post-list-a1-" + fixtureId + "@example.com", "hash", "post-list-a1-" + fixtureId));
        UserAccount secondAuthor = users.save(new UserAccount("post-list-a2-" + fixtureId + "@example.com", "hash", "post-list-a2-" + fixtureId));
        UserAccount thirdAuthor = users.save(new UserAccount("post-list-a3-" + fixtureId + "@example.com", "hash", "post-list-a3-" + fixtureId));
        UserAccount reactor = users.save(new UserAccount("post-list-r-" + fixtureId + "@example.com", "hash", "post-list-r-" + fixtureId));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        Region busan = region(regions, "KR-BUSAN", "KR", "Busan");
        Region jeju = region(regions, "KR-JEJU", "KR", "Jeju");

        List<JourneyPost> savedPosts = posts.saveAll(List.of(
                new JourneyPost(firstAuthor, seoul, "post-1-" + fixtureId, "content"),
                new JourneyPost(secondAuthor, busan, "post-2-" + fixtureId, "content"),
                new JourneyPost(thirdAuthor, jeju, "post-3-" + fixtureId, "content")));
        likes.save(new PostLike(savedPosts.get(0), reactor));
        bookmarks.save(new Bookmark(savedPosts.get(0), reactor));

        entityManager.flush();
        entityManager.clear();

        int feedPageSize = Math.toIntExact(posts.count() + 32L);

        Statistics statistics = entityManager.getEntityManagerFactory()
                .unwrap(SessionFactory.class)
                .getStatistics();
        statistics.clear();

        PageResponse<PostDtos.Summary> result = postService.feed(PageRequest.of(0, feedPageSize));

        Set<Long> createdIds = savedPosts.stream()
                .map(JourneyPost::getId)
                .collect(Collectors.toSet());

        assertThat(result.items())
                .filteredOn(item -> createdIds.contains(item.id()))
                .hasSize(3);

        assertThat(result.items())
                .filteredOn(item -> item.id().equals(savedPosts.get(0).getId()))
                .singleElement()
                .satisfies(item -> {
                    assertThat(item.likeCount()).isEqualTo(1);
                    assertThat(item.bookmarkCount()).isEqualTo(1);
                    assertThat(item.author().nickname()).isEqualTo("post-list-a1-" + fixtureId);
                    assertThat(item.regionCode()).isEqualTo("KR-SEOUL");
                });

        // page select/count + batched tags + reaction counts + bulk region translations는
        // 반환 카드 수와 무관한 고정 query budget 안에 있어야 합니다.
        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(6);
    }
}
