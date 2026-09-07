package com.jc.backend.admin;

import com.jc.backend.common.DomainException;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminAccountService {

    private final JdbcTemplate jdbc;
    private final AdminGuard guard;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountService(JdbcTemplate jdbc, AdminGuard guard, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.guard = guard;
        this.passwordEncoder = passwordEncoder;
    }

    public AdminAccountDtos.AccountView current() {
        AdminGuard.Actor actor = guard.requireAdmin();
        return account(actor.userId());
    }

    @Transactional
    public AdminAccountDtos.AccountView changeEmail(AdminAccountDtos.ChangeEmailRequest request) {
        AdminGuard.Actor actor = guard.requireAdmin();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        Map<String, Object> current = jdbc.queryForMap(
                "select email from user_account where id=? for update", actor.userId());
        if (email.equals(current.get("email"))) {
            return account(actor.userId());
        }
        Long duplicates = jdbc.queryForObject(
                "select count(*) from user_account where lower(email)=? and id<>?",
                Long.class,
                email,
                actor.userId());
        if (duplicates != null && duplicates > 0) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_USED",
                    "이미 사용 중인 이메일입니다.");
        }
        jdbc.update(
                "update user_account set email=?, updated_at=current_timestamp where id=?",
                email,
                actor.userId());
        audit(actor, "admin_email_change", "관리자 로그인 이메일 변경");
        return account(actor.userId());
    }

    @Transactional
    public AdminAccountDtos.ChangeResult changePassword(
            AdminAccountDtos.ChangePasswordRequest request) {
        AdminGuard.Actor actor = guard.requireAdmin();
        String passwordHash = passwordEncoder.encode(request.newPassword());
        jdbc.update(
                "update user_account set password_hash=?, updated_at=current_timestamp where id=?",
                passwordHash,
                actor.userId());
        jdbc.update(
                "update refresh_token set revoked_at=current_timestamp, updated_at=current_timestamp "
                        + "where user_id=? and revoked_at is null",
                actor.userId());
        audit(actor, "admin_password_change", "관리자 비밀번호 변경 및 세션 폐기");
        return new AdminAccountDtos.ChangeResult(true);
    }

    private AdminAccountDtos.AccountView account(long userId) {
        return jdbc.queryForObject(
                "select id, email, nickname, role, account_status from user_account where id=?",
                (rs, rowNum) -> new AdminAccountDtos.AccountView(
                        rs.getLong("id"),
                        rs.getString("email"),
                        rs.getString("nickname"),
                        rs.getString("role"),
                        rs.getString("account_status")),
                userId);
    }

    private void audit(AdminGuard.Actor actor, String action, String reason) {
        jdbc.update(
                "insert into admin_audit_log(actor_id,actor_username,action_type,target_type,target_id,reason) "
                        + "values(?,?,?,?,?,?)",
                actor.userId(),
                actor.username(),
                action,
                "user",
                actor.userId(),
                reason);
    }
}
