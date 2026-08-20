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
import java.util.Map;
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
class UserReportIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private UserReportService reports;
    @Autowired private AdminService adminService;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void reportCreationFlowsIntoExistingAdminInboxAndBlocksDuplicate() {
        Fixture fixture = fixture();

        UserReportDtos.CreateResult created = reports.reportPost(
                fixture.reporter().getId(),
                fixture.post().getId(),
                new UserReportDtos.CreateRequest("spam", " duplicated promotion "));

        Map<String, Object> stored = jdbc.queryForMap(
                """
                select reporter_id, target_type, target_id, reason_category, reason_detail, status
                from admin_report
                where id = ?
                """,
                created.reportId());
        assertThat(((Number) stored.get("reporter_id")).longValue())
                .isEqualTo(fixture.reporter().getId());
        assertThat(stored.get("target_type")).isEqualTo("post");
        assertThat(((Number) stored.get("target_id")).longValue())
                .isEqualTo(fixture.post().getId());
        assertThat(stored.get("reason_category")).isEqualTo("spam");
        assertThat(stored.get("reason_detail")).isEqualTo("duplicated promotion");
        assertThat(stored.get("status")).isEqualTo("pending");

        UserAccount admin = users.save(new UserAccount(
                "report-admin-" + fixture.suffix() + "@example.com",
                "hash",
                "report-admin-" + fixture.suffix()));
        jdbc.update(
                "update user_account set role='admin', account_status='active' where id=?",
                admin.getId());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        String.valueOf(admin.getId()),
                        "n/a",
                        Collections.emptyList()));

        var adminPage = adminService.reports(
                "pending",
                "post",
                String.valueOf(fixture.post().getId()),
                0,
                20);
        assertThat(adminPage.items())
                .anyMatch(report -> report.reportId() == created.reportId());

        assertThatThrownBy(() -> reports.reportPost(
                fixture.reporter().getId(),
                fixture.post().getId(),
                new UserReportDtos.CreateRequest("other", null)))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(409);
                    assertThat(exception.getCode()).isEqualTo("REPORT_ALREADY_EXISTS");
                });
    }

    @Test
    void selfHiddenAndInvalidReasonReportsAreRejected() {
        Fixture fixture = fixture();

        assertThatThrownBy(() -> reports.reportPost(
                fixture.author().getId(),
                fixture.post().getId(),
                new UserReportDtos.CreateRequest("spam", null)))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(409);
                    assertThat(exception.getCode()).isEqualTo("SELF_REPORT_NOT_ALLOWED");
                });

        assertThatThrownBy(() -> reports.reportPost(
                fixture.reporter().getId(),
                fixture.post().getId(),
                new UserReportDtos.CreateRequest("not-a-category", null)))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(400);
                    assertThat(exception.getCode()).isEqualTo("INVALID_REPORT_REASON");
                });

        jdbc.update(
                "update journey_post set moderation_status='hidden' where id=?",
                fixture.post().getId());
        assertThatThrownBy(() -> reports.reportPost(
                fixture.reporter().getId(),
                fixture.post().getId(),
                new UserReportDtos.CreateRequest("harassment", null)))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(404);
                    assertThat(exception.getCode()).isEqualTo("POST_NOT_FOUND");
                });
    }

    private Fixture fixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "report-author-" + suffix + "@example.com", "hash", "report-author-" + suffix));
        UserAccount reporter = users.save(new UserAccount(
                "reporter-" + suffix + "@example.com", "hash", "reporter-" + suffix));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        JourneyPost post = posts.save(new JourneyPost(author, seoul, "reportable", "content"));
        return new Fixture(suffix, author, reporter, post);
    }

    private record Fixture(
            String suffix,
            UserAccount author,
            UserAccount reporter,
            JourneyPost post) {}
}
