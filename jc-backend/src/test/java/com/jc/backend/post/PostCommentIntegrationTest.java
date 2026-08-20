package com.jc.backend.post;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PostCommentIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private CommentRepository comments;
    @Autowired private PostService postService;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void commentsAreListedAndOnlyAuthorCanDelete() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "comment-author-" + suffix + "@example.com", "hash", "comment-author-" + suffix));
        UserAccount commenter = users.save(new UserAccount(
                "commenter-" + suffix + "@example.com", "hash", "commenter-" + suffix));
        UserAccount other = users.save(new UserAccount(
                "comment-other-" + suffix + "@example.com", "hash", "comment-other-" + suffix));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        JourneyPost post = posts.save(new JourneyPost(author, seoul, "post", "content"));

        PostDtos.CommentView created =
                postService.addComment(commenter.getId(), post.getId(), "  hello  ");

        var page = postService.comments(
                post.getId(), null, PageRequest.of(0, 20));
        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.items()).singleElement().satisfies(comment -> {
            assertThat(comment.id()).isEqualTo(created.id());
            assertThat(comment.content()).isEqualTo("hello");
            assertThat(comment.author().id()).isEqualTo(commenter.getId());
        });

        assertThatThrownBy(() -> postService.deleteComment(other.getId(), created.id()))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(403);
                    assertThat(exception.getCode()).isEqualTo("COMMENT_FORBIDDEN");
                });
        assertThat(comments.existsById(created.id())).isTrue();

        postService.deleteComment(commenter.getId(), created.id());
        assertThat(comments.existsById(created.id())).isFalse();
    }
    @Test
    void hiddenPostCommentsAreNotReadableOrWritable() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "hidden-comment-author-" + suffix + "@example.com",
                "hash",
                "hidden-comment-author-" + suffix));
        UserAccount commenter = users.save(new UserAccount(
                "hidden-commenter-" + suffix + "@example.com",
                "hash",
                "hidden-commenter-" + suffix));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        JourneyPost post = posts.save(new JourneyPost(author, seoul, "hidden", "content"));
        posts.flush();
        jdbc.update(
                "update journey_post set moderation_status='hidden' where id=?",
                post.getId());

        assertThatThrownBy(() -> postService.comments(
                post.getId(), null, PageRequest.of(0, 20)))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(404);
                    assertThat(exception.getCode()).isEqualTo("POST_NOT_FOUND");
                });
        assertThatThrownBy(() -> postService.addComment(
                commenter.getId(), post.getId(), "hidden comment"))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(404);
                    assertThat(exception.getCode()).isEqualTo("POST_NOT_FOUND");
                });
    }

}
