package com.jc.backend.admin;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.Collections;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminPostIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private AdminService adminService;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void permanentDeleteRequiresHiddenStateAndMatchingPostId() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "admin-post-author-" + suffix + "@example.com", "hash", "post-author-" + suffix));
        UserAccount admin = users.save(new UserAccount(
                "admin-post-admin-" + suffix + "@example.com", "hash", "post-admin-" + suffix));
        jdbc.update("update user_account set role='admin', account_status='active' where id=?", admin.getId());
        authenticate(admin.getId());

        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        JourneyPost post = posts.save(new JourneyPost(author, seoul, "관리 대상", "<p>전체 본문</p>"));
        long postId = post.getId();

        assertThatThrownBy(() -> adminService.permanentDelete(
                postId, new AdminDtos.PermanentDeleteRequest("잘못된 즉시 삭제 시도", String.valueOf(postId))))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(409);
                    assertThat(exception.getCode()).isEqualTo("ADMIN_STATE_CONFLICT");
                });

        adminService.hide(postId, new AdminDtos.CommandRequest("운영 정책 검토"));
        assertThatThrownBy(() -> adminService.permanentDelete(
                postId, new AdminDtos.PermanentDeleteRequest("확인 값 불일치", "999999")))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getStatus().value()).isEqualTo(400));

        AdminDtos.CommandResult result = adminService.permanentDelete(
                postId, new AdminDtos.PermanentDeleteRequest("최종 영구 삭제", String.valueOf(postId)));

        assertThat(result.state()).isEqualTo("deleted");
        assertThat(posts.findById(postId)).isEmpty();
        assertThat(jdbc.queryForObject(
                "select count(*) from admin_audit_log where action_type='post_permanent_delete' and target_id=?",
                Long.class,
                postId)).isEqualTo(1L);
    }

    @Test
    void adminListIncludesVisibleAndHiddenPostsAndReturnsFullPlainText() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "admin-list-author-" + suffix + "@example.com", "hash", "list-author-" + suffix));
        UserAccount admin = users.save(new UserAccount(
                "admin-list-admin-" + suffix + "@example.com", "hash", "list-admin-" + suffix));
        jdbc.update("update user_account set role='admin', account_status='active' where id=?", admin.getId());
        authenticate(admin.getId());
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        JourneyPost visible = posts.save(new JourneyPost(author, seoul, "보이는 글 " + suffix, "<p>본문</p>"));
        JourneyPost hidden = posts.save(new JourneyPost(author, seoul, "숨긴 글 " + suffix, "<p>긴 본문 내용</p>"));
        adminService.hide(hidden.getId(), new AdminDtos.CommandRequest("목록 테스트"));

        var page = adminService.posts(null, null, suffix, "title_asc", 0, 20);

        assertThat(page.items()).extracting(AdminDtos.PostSummary::postId)
                .contains(visible.getId(), hidden.getId());
        AdminDtos.PostDetail detail = adminService.post(hidden.getId());
        assertThat(detail.contentPreview()).isEqualTo("긴 본문 내용");
        assertThat(detail.contentTruncated()).isFalse();
    }

    private void authenticate(long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        String.valueOf(userId), "n/a", Collections.emptyList()));
    }
}
