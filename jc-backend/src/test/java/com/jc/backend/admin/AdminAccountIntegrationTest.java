package com.jc.backend.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.auth.RefreshToken;
import com.jc.backend.auth.RefreshTokenRepository;
import com.jc.backend.common.DomainException;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminAccountIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RefreshTokenRepository refreshTokens;
    @Autowired private AdminAccountService service;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void activeAdminCanChangeOwnEmailWithoutChangingIdentity() {
        UserAccount admin = admin("email");
        authenticate(admin.getId());
        String changedEmail = "changed-" + UUID.randomUUID() + "@example.com";

        AdminAccountDtos.AccountView result = service.changeEmail(
                new AdminAccountDtos.ChangeEmailRequest("  " + changedEmail.toUpperCase() + "  "));

        assertThat(result.userId()).isEqualTo(admin.getId());
        assertThat(result.email()).isEqualTo(changedEmail);
        assertThat(jdbc.queryForObject(
                "select count(*) from admin_audit_log where actor_id=? and action_type='admin_email_change'",
                Long.class,
                admin.getId())).isEqualTo(1L);
    }

    @Test
    void duplicateEmailIsRejected() {
        UserAccount admin = admin("duplicate");
        UserAccount existing = users.save(new UserAccount(
                "existing-" + UUID.randomUUID() + "@example.com", "hash", "existing-" + shortId()));
        authenticate(admin.getId());

        assertThatThrownBy(() -> service.changeEmail(
                new AdminAccountDtos.ChangeEmailRequest(existing.getEmail())))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(409);
                    assertThat(exception.getCode()).isEqualTo("EMAIL_ALREADY_USED");
                });
    }

    @Test
    void passwordChangeStoresOnlyHashAndRevokesRefreshTokens() {
        UserAccount admin = admin("password");
        authenticate(admin.getId());
        String tokenHash = "account-test-token-" + UUID.randomUUID();
        refreshTokens.save(new RefreshToken(
                admin,
                tokenHash,
                Instant.now().plus(1, ChronoUnit.DAYS)));
        String newPassword = "new-admin-password-42";

        service.changePassword(new AdminAccountDtos.ChangePasswordRequest(newPassword));

        Map<String, Object> account = jdbc.queryForMap(
                "select password_hash from user_account where id=?", admin.getId());
        assertThat(account.get("password_hash")).isNotEqualTo(newPassword);
        assertThat(passwordEncoder.matches(newPassword, String.valueOf(account.get("password_hash")))).isTrue();
        assertThat(jdbc.queryForObject(
                "select revoked_at is not null from refresh_token where token_hash=?",
                Boolean.class,
                tokenHash)).isTrue();
        assertThat(jdbc.queryForObject(
                "select count(*) from admin_audit_log where actor_id=? and action_type='admin_password_change'",
                Long.class,
                admin.getId())).isEqualTo(1L);
    }

    private UserAccount admin(String prefix) {
        UserAccount admin = users.save(new UserAccount(
                prefix + "-admin-" + UUID.randomUUID() + "@example.com",
                passwordEncoder.encode("original-password"),
                prefix + "-admin-" + shortId()));
        jdbc.update("update user_account set role='admin', account_status='active' where id=?", admin.getId());
        return admin;
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private void authenticate(long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        String.valueOf(userId), "n/a", Collections.emptyList()));
    }
}
