package com.jc.backend.user;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.PageResponse;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostLike;
import com.jc.backend.post.PostLikeRepository;
import com.jc.backend.post.PostService;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class UserLikedPostsIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostLikeRepository likes;
    @Autowired private PostService postService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    @Test
    void myLikesPreservesVisibilityAndActiveAuthorRulesWithPagination() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount viewer = users.save(new UserAccount(
                "likes-viewer-" + suffix + "@example.com", "hash", "likes-viewer-" + suffix));
        UserAccount author = users.save(new UserAccount(
                "likes-author-" + suffix + "@example.com", "hash", "likes-author-" + suffix));
        UserAccount inactiveAuthor = users.save(new UserAccount(
                "likes-inactive-" + suffix + "@example.com", "hash", "likes-inactive-" + suffix));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");

        JourneyPost firstVisible = posts.save(new JourneyPost(author, seoul, "first", "content"));
        JourneyPost hidden = posts.save(new JourneyPost(author, seoul, "hidden", "content"));
        JourneyPost draft = posts.save(new JourneyPost(author, seoul, "draft", "content"));
        draft.update(null, null, null, false);
        JourneyPost inactive = posts.save(new JourneyPost(
                inactiveAuthor, seoul, "inactive", "content"));
        JourneyPost latestVisible = posts.save(new JourneyPost(author, seoul, "latest", "content"));
        posts.flush();

        likes.save(new PostLike(firstVisible, viewer));
        likes.save(new PostLike(hidden, viewer));
        likes.save(new PostLike(draft, viewer));
        likes.save(new PostLike(inactive, viewer));
        likes.save(new PostLike(latestVisible, viewer));
        likes.flush();

        jdbc.update(
                "update journey_post set moderation_status='hidden' where id=?",
                hidden.getId());
        jdbc.update(
                "update user_account set account_status='suspended' where id=?",
                inactiveAuthor.getId());

        PageResponse<PostDtos.Summary> firstPage =
                postService.myLikes(viewer.getId(), PageRequest.of(0, 1));
        PageResponse<PostDtos.Summary> secondPage =
                postService.myLikes(viewer.getId(), PageRequest.of(1, 1));

        assertThat(firstPage.totalElements()).isEqualTo(2);
        assertThat(firstPage.last()).isFalse();
        assertThat(firstPage.items()).singleElement().satisfies(summary -> {
            assertThat(summary.id()).isEqualTo(latestVisible.getId());
            assertThat(summary.liked()).isTrue();
        });
        assertThat(secondPage.items()).singleElement().satisfies(summary -> {
            assertThat(summary.id()).isEqualTo(firstVisible.getId());
            assertThat(summary.liked()).isTrue();
        });
    }
    @Test
    void myLikesUsesFixedQueryBudgetForMultiplePosts() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount viewer = users.save(new UserAccount(
                "likes-budget-viewer-" + suffix + "@example.com",
                "hash",
                "likes-budget-viewer-" + suffix));
        UserAccount author = users.save(new UserAccount(
                "likes-budget-author-" + suffix + "@example.com",
                "hash",
                "likes-budget-author-" + suffix));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        List<JourneyPost> likedPosts = posts.saveAll(List.of(
                new JourneyPost(author, seoul, "liked-1", "content"),
                new JourneyPost(author, seoul, "liked-2", "content"),
                new JourneyPost(author, seoul, "liked-3", "content")));
        likedPosts.forEach(post -> likes.save(new PostLike(post, viewer)));

        entityManager.flush();
        entityManager.clear();

        Statistics statistics = entityManager.getEntityManagerFactory()
                .unwrap(SessionFactory.class)
                .getStatistics();
        statistics.clear();

        PageResponse<PostDtos.Summary> result =
                postService.myLikes(viewer.getId(), PageRequest.of(0, 20));

        assertThat(result.items()).hasSizeGreaterThanOrEqualTo(3);
        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(6);
    }

}
