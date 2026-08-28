package com.jc.backend.post;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.common.DomainException;
import com.jc.backend.notification.NotificationDtos;
import com.jc.backend.notification.NotificationService;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class PostReplyIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private CommentRepository comments;
    @Autowired private PostService postService;
    @Autowired private NotificationService notifications;

    private UserAccount postAuthor;
    private UserAccount rootAuthor;
    private UserAccount replier;
    private JourneyPost post;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        postAuthor = user("reply-post-author-" + suffix, "post-author-" + suffix);
        rootAuthor = user("reply-root-author-" + suffix, "root-author-" + suffix);
        replier = user("reply-replier-" + suffix, "replier-" + suffix);
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        post = posts.save(new JourneyPost(postAuthor, seoul, "reply post", "reply content"));
    }

    @Test
    void replyApiCreatesOneDepthReplyAndNotifiesParentAuthor() throws Exception {
        PostDtos.CommentView root = postService.addComment(
                rootAuthor.getId(), post.getId(), "root comment");

        mockMvc.perform(post("/api/v1/posts/{postId}/comments", post.getId())
                        .with(jwt().jwt(token -> token.subject(replier.getId().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"reply comment","parentCommentId":%d}
                                """.formatted(root.id())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.content").value("reply comment"))
                .andExpect(jsonPath("$.data.parentCommentId").value(root.id()));

        mockMvc.perform(get("/api/v1/posts/{postId}/comments", post.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].parentCommentId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.items[1].parentCommentId").value(root.id()));

        NotificationDtos.Item replyNotification = notifications.list(rootAuthor.getId(), 0, 20)
                .items().stream()
                .filter(item -> item.type().equals("comment_reply"))
                .findFirst()
                .orElseThrow();
        assertThat(replyNotification.targetType()).isEqualTo("post");
        assertThat(replyNotification.targetId()).isEqualTo(post.getId());
        assertThat(replyNotification.actor().id()).isEqualTo(replier.getId());
    }

    @Test
    void replyRejectsAnotherPostParentAndSecondDepth() {
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        JourneyPost anotherPost = posts.save(new JourneyPost(
                postAuthor, seoul, "another post", "another content"));
        PostDtos.CommentView root = postService.addComment(
                rootAuthor.getId(), post.getId(), "root comment");

        assertThatThrownBy(() -> postService.addComment(
                replier.getId(), anotherPost.getId(), "wrong post", root.id()))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("COMMENT_PARENT_POST_MISMATCH"));

        PostDtos.CommentView reply = postService.addComment(
                replier.getId(), post.getId(), "first reply", root.id());
        assertThatThrownBy(() -> postService.addComment(
                postAuthor.getId(), post.getId(), "second depth", reply.id()))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("COMMENT_REPLY_DEPTH_EXCEEDED"));
    }

    @Test
    void deletingRootCommentCascadesItsReplies() {
        PostDtos.CommentView root = postService.addComment(
                rootAuthor.getId(), post.getId(), "root comment");
        PostDtos.CommentView reply = postService.addComment(
                replier.getId(), post.getId(), "reply comment", root.id());

        postService.deleteComment(rootAuthor.getId(), root.id());

        assertThat(comments.existsById(root.id())).isFalse();
        assertThat(comments.existsById(reply.id())).isFalse();
    }

    private UserAccount user(String emailPrefix, String nickname) {
        return users.save(new UserAccount(emailPrefix + "@example.com", "hash", nickname));
    }
}
