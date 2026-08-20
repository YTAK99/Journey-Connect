package com.jc.backend.notification;

import com.jc.backend.common.DomainException;
import com.jc.backend.common.PageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NotificationService {
    private static final int MAX_PAGE_SIZE = 100;
    private final JdbcTemplate jdbc;

    public NotificationService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public PageResponse<NotificationDtos.Item> list(long recipientId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        long offset = (long) safePage * safeSize;
        Long totalValue = jdbc.queryForObject(
                "select count(*) from user_notification where recipient_id = ?",
                Long.class,
                recipientId);
        long total = totalValue == null ? 0L : totalValue;
        List<NotificationDtos.Item> items = jdbc.query(
                """
                select n.id, n.type, n.target_type, n.target_id, n.read_at, n.created_at,
                       a.id actor_id, a.nickname actor_nickname,
                       a.profile_image_url actor_profile_image_url
                from user_notification n
                left join user_account a on a.id = n.actor_id
                where n.recipient_id = ?
                order by n.created_at desc, n.id desc
                limit ? offset ?
                """,
                (rs, rowNum) -> item(rs),
                recipientId,
                safeSize,
                offset);
        int totalPages = total == 0 ? 0 : (int) Math.ceil(total / (double) safeSize);
        boolean last = totalPages == 0 || safePage + 1 >= totalPages;
        return new PageResponse<>(items, safePage, safeSize, total, totalPages, last);
    }

    public NotificationDtos.UnreadCount unreadCount(long recipientId) {
        Long count = jdbc.queryForObject(
                "select count(*) from user_notification where recipient_id = ? and read_at is null",
                Long.class,
                recipientId);
        return new NotificationDtos.UnreadCount(count == null ? 0L : count);
    }

    @Transactional
    public NotificationDtos.UpdateResult markRead(long recipientId, long notificationId) {
        int updated = jdbc.update(
                """
                update user_notification
                set read_at = coalesce(read_at, current_timestamp)
                where id = ? and recipient_id = ?
                """,
                notificationId,
                recipientId);
        if (updated == 0) {
            throw new DomainException(
                    HttpStatus.NOT_FOUND,
                    "NOTIFICATION_NOT_FOUND",
                    "알림을 찾을 수 없습니다.");
        }
        return new NotificationDtos.UpdateResult(updated);
    }

    @Transactional
    public NotificationDtos.UpdateResult markAllRead(long recipientId) {
        int updated = jdbc.update(
                """
                update user_notification
                set read_at = current_timestamp
                where recipient_id = ? and read_at is null
                """,
                recipientId);
        return new NotificationDtos.UpdateResult(updated);
    }

    @Transactional
    public void postLiked(long actorId, long recipientId, long postId) {
        if (actorId == recipientId) return;
        insert(recipientId, actorId, "post_like", "post", postId,
                "post_like:" + postId + ":" + actorId);
    }

    @Transactional
    public void postCommented(long actorId, long recipientId, long postId, long commentId) {
        if (actorId == recipientId) return;
        insert(recipientId, actorId, "post_comment", "post", postId,
                "post_comment:" + commentId);
    }

    @Transactional
    public void reportHandled(long reportId, String state) {
        String type = switch (state) {
            case "resolved" -> "report_resolved";
            case "rejected" -> "report_rejected";
            default -> null;
        };
        if (type == null) return;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "select reporter_id, target_id from admin_report where id = ? and target_type = 'post'",
                reportId);
        if (rows.isEmpty()) return;
        Map<String, Object> row = rows.get(0);
        Object reporterValue = row.get("reporter_id");
        Object targetValue = row.get("target_id");
        if (!(reporterValue instanceof Number reporterNumber)
                || !(targetValue instanceof Number targetNumber)) return;
        insert(reporterNumber.longValue(), null, type, "post", targetNumber.longValue(),
                "report:" + reportId + ":" + state);
    }

    private void insert(long recipientId, Long actorId, String type,
                        String targetType, long targetId, String dedupeKey) {
        jdbc.update(
                """
                insert into user_notification(
                    recipient_id, actor_id, type, target_type, target_id, dedupe_key
                ) values (?, ?, ?, ?, ?, ?)
                on conflict (dedupe_key) do nothing
                """,
                recipientId, actorId, type, targetType, targetId, dedupeKey);
    }

    private NotificationDtos.Item item(ResultSet rs) throws SQLException {
        Object actorIdValue = rs.getObject("actor_id");
        NotificationDtos.Actor actor = null;
        if (actorIdValue instanceof Number actorId) {
            actor = new NotificationDtos.Actor(
                    actorId.longValue(),
                    rs.getString("actor_nickname"),
                    rs.getString("actor_profile_image_url"));
        }
        return new NotificationDtos.Item(
                rs.getLong("id"), rs.getString("type"), rs.getString("target_type"),
                rs.getLong("target_id"), actor,
                instant(rs, "read_at"), instant(rs, "created_at"));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
