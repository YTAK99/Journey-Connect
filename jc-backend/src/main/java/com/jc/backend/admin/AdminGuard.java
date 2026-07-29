package com.jc.backend.admin;

import com.jc.backend.common.DomainException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class AdminGuard {
    private final JdbcTemplate jdbc;

    public AdminGuard(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Actor requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new DomainException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
        }
        final long userId;
        try { userId = Long.parseLong(authentication.getName()); }
        catch (NumberFormatException exception) {
            throw new DomainException(HttpStatus.UNAUTHORIZED, "INVALID_AUTHENTICATION", "인증 정보를 확인할 수 없습니다.");
        }
        final Map<String, Object> row;
        try {
            row = jdbc.queryForMap(
                    "select email, nickname, role, account_status from user_account where id = ?", userId);
        } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
            throw new DomainException(HttpStatus.UNAUTHORIZED, "INVALID_AUTHENTICATION", "인증 사용자를 찾을 수 없습니다.");
        }
        String role = String.valueOf(row.get("role"));
        String status = String.valueOf(row.get("account_status"));
        if (!"admin".equals(role) || !"active".equals(status)) {
            throw new DomainException(HttpStatus.FORBIDDEN, "ADMIN_ACCESS_DENIED", "관리자 권한이 없습니다.");
        }
        return new Actor(userId, String.valueOf(row.get("email")), String.valueOf(row.get("nickname")));
    }

    public record Actor(long userId, String username, String displayName) {}
}
