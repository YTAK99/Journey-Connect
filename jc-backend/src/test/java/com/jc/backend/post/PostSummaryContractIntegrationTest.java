package com.jc.backend.post;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.PageResponse;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PostSummaryContractIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostLikeRepository likes;
    @Autowired private BookmarkRepository bookmarks;
    @Autowired private CommentRepository comments;
    @Autowired private PostService postService;
    @Autowired private EntityManager entityManager;

    @Test
    void summaryContainsPreviewCountsAndViewerReactionState() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "summary-author-" + suffix + "@example.com", "hash", "summary-author-" + suffix));
        UserAccount viewer = users.save(new UserAccount(
                "summary-viewer-" + suffix + "@example.com", "hash", "summary-viewer-" + suffix));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        JourneyPost post = posts.save(new JourneyPost(
                author,
                seoul,
                "summary-contract-" + suffix,
                "<p>Hello <strong>Seoul</strong></p>"));
        likes.save(new PostLike(post, viewer));
        bookmarks.save(new Bookmark(post, viewer));
        comments.save(new Comment(post, viewer, "좋아요"));

        entityManager.flush();
        entityManager.clear();

        PageResponse<PostDtos.Summary> authenticated =
                postService.feed(PageRequest.of(0, 100), viewer.getId());
        PostDtos.Summary item = authenticated.items().stream()
                .filter(summary -> summary.id().equals(post.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(item.content()).contains("Hello");
        assertThat(item.contentPreview()).isEqualTo("Hello Seoul");
        assertThat(item.likeCount()).isEqualTo(1);
        assertThat(item.bookmarkCount()).isEqualTo(1);
        assertThat(item.commentCount()).isEqualTo(1);
        assertThat(item.liked()).isTrue();
        assertThat(item.bookmarked()).isTrue();

        PostDtos.Summary anonymous = postService.feed(PageRequest.of(0, 100), null).items().stream()
                .filter(summary -> summary.id().equals(post.getId()))
                .findFirst()
                .orElseThrow();
        assertThat(anonymous.liked()).isFalse();
        assertThat(anonymous.bookmarked()).isFalse();
    }
}
