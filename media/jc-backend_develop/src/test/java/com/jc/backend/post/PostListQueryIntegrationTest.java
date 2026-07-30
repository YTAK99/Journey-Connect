package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.PageResponse;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
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
        UserAccount firstAuthor = users.save(new UserAccount("author1@example.com", "hash", "author1"));
        UserAccount secondAuthor = users.save(new UserAccount("author2@example.com", "hash", "author2"));
        UserAccount thirdAuthor = users.save(new UserAccount("author3@example.com", "hash", "author3"));
        UserAccount reactor = users.save(new UserAccount("reactor@example.com", "hash", "reactor"));
        Region seoul = regions.save(new Region("KR-SEOUL", "KR", "Seoul", null));
        Region busan = regions.save(new Region("KR-BUSAN", "KR", "Busan", null));
        Region jeju = regions.save(new Region("KR-JEJU", "KR", "Jeju", null));

        List<JourneyPost> savedPosts = posts.saveAll(List.of(
                new JourneyPost(firstAuthor, seoul, "post-1", "content"),
                new JourneyPost(secondAuthor, busan, "post-2", "content"),
                new JourneyPost(thirdAuthor, jeju, "post-3", "content")));
        likes.save(new PostLike(savedPosts.get(0), reactor));
        bookmarks.save(new Bookmark(savedPosts.get(0), reactor));

        entityManager.flush();
        entityManager.clear();

        Statistics statistics = entityManager.getEntityManagerFactory()
                .unwrap(SessionFactory.class)
                .getStatistics();
        statistics.clear();

        PageResponse<PostDtos.Summary> result = postService.feed(PageRequest.of(0, 20));

        assertThat(result.items()).hasSize(3);
        assertThat(result.items())
                .filteredOn(item -> item.title().equals("post-1"))
                .singleElement()
                .satisfies(item -> {
                    assertThat(item.likeCount()).isEqualTo(1);
                    assertThat(item.bookmarkCount()).isEqualTo(1);
                    assertThat(item.author().nickname()).isEqualTo("author1");
                    assertThat(item.regionCode()).isEqualTo("KR-SEOUL");
                });

        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(4);
    }
}
