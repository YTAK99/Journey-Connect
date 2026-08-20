package com.jc.backend.admin;

import com.jc.backend.common.DomainException;
import java.util.Locale;
import java.util.Set;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 일반 사용자의 신고 접수를 기존 admin_report 운영 흐름으로 연결합니다.
 *
 * <p>이번 사용자 진입점은 게시글 신고만 노출하지만 저장 계약은 기존 admin_report를 그대로 사용합니다.
 */
@Service
@Transactional(readOnly = true)
public class UserReportService {

    private static final Set<String> POST_REASON_CATEGORIES = Set.of(
            "spam",
            "harassment",
            "inappropriate_content",
            "other");

    private final JdbcTemplate jdbc;

    public UserReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public UserReportDtos.CreateResult reportPost(
            long reporterId,
            long postId,
            UserReportDtos.CreateRequest request) {
        String reasonCategory = normalizeReasonCategory(request.reasonCategory());
        String reasonDetail = normalizeDetail(request.reasonDetail());
        long authorId = reportablePostAuthor(postId);

        if (authorId == reporterId) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "SELF_REPORT_NOT_ALLOWED",
                    "본인 게시물은 신고할 수 없습니다.");
        }
        if (hasActiveDuplicate(reporterId, postId)) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "REPORT_ALREADY_EXISTS",
                    "이미 처리 중인 신고가 있습니다.");
        }

        Long reportId = jdbc.queryForObject(
                """
                insert into admin_report(
                    reporter_id, target_type, target_id, reason_category, reason_detail, status
                ) values (?, 'post', ?, ?, ?, 'pending')
                returning id
                """,
                Long.class,
                reporterId,
                postId,
                reasonCategory,
                reasonDetail);
        if (reportId == null) {
            throw new IllegalStateException("admin_report id was not generated");
        }
        return new UserReportDtos.CreateResult(reportId, "pending");
    }

    private long reportablePostAuthor(long postId) {
        try {
            Long authorId = jdbc.queryForObject(
                    """
                    select p.author_id
                    from journey_post p
                    join user_account u on u.id = p.author_id
                    where p.id = ?
                      and p.published = true
                      and p.moderation_status = 'visible'
                      and u.account_status = 'active'
                    """,
                    Long.class,
                    postId);
            return authorId == null ? -1L : authorId;
        } catch (EmptyResultDataAccessException exception) {
            throw new DomainException(
                    HttpStatus.NOT_FOUND,
                    "POST_NOT_FOUND",
                    "게시물을 찾을 수 없습니다.");
        }
    }

    private boolean hasActiveDuplicate(long reporterId, long postId) {
        Long count = jdbc.queryForObject(
                """
                select count(*)
                from admin_report
                where reporter_id = ?
                  and target_type = 'post'
                  and target_id = ?
                  and status in ('pending', 'in_review')
                """,
                Long.class,
                reporterId,
                postId);
        return count != null && count > 0;
    }

    private String normalizeReasonCategory(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!POST_REASON_CATEGORIES.contains(normalized)) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REPORT_REASON",
                    "지원하지 않는 신고 사유입니다.");
        }
        return normalized;
    }

    private String normalizeDetail(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
