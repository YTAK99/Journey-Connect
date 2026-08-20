package com.jc.backend.notification;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.admin.AdminDtos;
import com.jc.backend.admin.AdminService;
import com.jc.backend.admin.UserReportDtos;
import com.jc.backend.admin.UserReportService;
import com.jc.backend.common.DomainException;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.PostService;
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
class NotificationIntegrationTest {
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostService postService;
    @Autowired private NotificationService notifications;
    @Autowired private UserReportService reports;
    @Autowired private AdminService adminService;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void clearSecurityContext() { SecurityContextHolder.clearContext(); }

    @Test
    void likeAndCommentCreateDeduplicatedInboxNotifications() {
        Fixture f = fixture();
        postService.like(f.actor().getId(), f.post().getId());
        postService.like(f.actor().getId(), f.post().getId());
        postService.addComment(f.actor().getId(), f.post().getId(), "notification comment");
        postService.like(f.author().getId(), f.post().getId());

        var page = notifications.list(f.author().getId(), 0, 20);
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.items()).extracting(NotificationDtos.Item::type)
                .containsExactlyInAnyOrder("post_like", "post_comment");
        assertThat(page.items()).allSatisfy(item -> {
            assertThat(item.targetType()).isEqualTo("post");
            assertThat(item.targetId()).isEqualTo(f.post().getId());
            assertThat(item.actor()).isNotNull();
            assertThat(item.actor().id()).isEqualTo(f.actor().getId());
            assertThat(item.read()).isFalse();
        });
        assertThat(notifications.unreadCount(f.author().getId()).count()).isEqualTo(2);

        long firstId = page.items().get(0).id();
        notifications.markRead(f.author().getId(), firstId);
        assertThat(notifications.unreadCount(f.author().getId()).count()).isEqualTo(1);
        assertThatThrownBy(() -> notifications.markRead(f.actor().getId(), firstId))
                .isInstanceOfSatisfying(DomainException.class, e -> {
                    assertThat(e.getStatus().value()).isEqualTo(404);
                    assertThat(e.getCode()).isEqualTo("NOTIFICATION_NOT_FOUND");
                });
        assertThat(notifications.markAllRead(f.author().getId()).updatedCount()).isEqualTo(1);
        assertThat(notifications.unreadCount(f.author().getId()).count()).isZero();
    }

    @Test
    void resolvedReportCreatesReporterNotificationOnce() {
        Fixture f = fixture();
        UserReportDtos.CreateResult report = reports.reportPost(
                f.actor().getId(), f.post().getId(),
                new UserReportDtos.CreateRequest("spam", "review this"));
        UserAccount admin = users.save(new UserAccount(
                "notification-admin-" + f.suffix() + "@example.com", "hash",
                "notification-admin-" + f.suffix()));
        jdbc.update("update user_account set role='admin', account_status='active' where id=?", admin.getId());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        String.valueOf(admin.getId()), "n/a", Collections.emptyList()));

        AdminDtos.CommandResult first = adminService.resolve(
                report.reportId(), new AdminDtos.CommandRequest("reviewed"));
        AdminDtos.CommandResult second = adminService.resolve(
                report.reportId(), new AdminDtos.CommandRequest("reviewed"));
        assertThat(first.changed()).isTrue();
        assertThat(second.changed()).isFalse();

        var page = notifications.list(f.actor().getId(), 0, 20);
        assertThat(page.items()).filteredOn(i -> "report_resolved".equals(i.type()))
                .singleElement().satisfies(item -> {
                    assertThat(item.actor()).isNull();
                    assertThat(item.targetType()).isEqualTo("post");
                    assertThat(item.targetId()).isEqualTo(f.post().getId());
                });
    }

    private Fixture fixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "notification-author-" + suffix + "@example.com", "hash", "notification-author-" + suffix));
        UserAccount actor = users.save(new UserAccount(
                "notification-actor-" + suffix + "@example.com", "hash", "notification-actor-" + suffix));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        JourneyPost post = posts.save(new JourneyPost(author, seoul,
                "notification-post-" + suffix, "content"));
        return new Fixture(suffix, author, actor, post);
    }

    private record Fixture(String suffix, UserAccount author, UserAccount actor, JourneyPost post) {}
}
