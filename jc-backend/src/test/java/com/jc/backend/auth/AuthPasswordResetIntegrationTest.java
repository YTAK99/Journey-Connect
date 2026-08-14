package com.jc.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest(properties = "app.security.password-reset-expose-token=true")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AuthPasswordResetIntegrationTest {

    @Autowired private AuthService authService;

    @Test
    void resetTokenChangesPasswordRevokesRefreshTokensAndIsSingleUse() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "reset-" + suffix + "@example.com";
        String oldPassword = "password1234";
        String newPassword = "changed-password-1234";

        AuthDtos.TokenResponse issued = authService.signup(new AuthDtos.SignupRequest(
                email, oldPassword, "reset-" + suffix));
        AuthDtos.PasswordResetRequestResponse reset = authService.requestPasswordReset(
                new AuthDtos.PasswordResetRequest(email));

        assertThat(reset.accepted()).isTrue();
        assertThat(reset.resetToken()).isNotBlank();

        authService.confirmPasswordReset(new AuthDtos.PasswordResetConfirmRequest(
                reset.resetToken(), newPassword));

        assertThatThrownBy(() -> authService.login(new AuthDtos.LoginRequest(email, oldPassword)))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("INVALID_CREDENTIALS"));
        assertThat(authService.login(new AuthDtos.LoginRequest(email, newPassword)).user().email())
                .isEqualTo(email);
        assertThatThrownBy(() -> authService.refresh(new AuthDtos.RefreshRequest(issued.refreshToken())))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("INVALID_REFRESH_TOKEN"));
        assertThatThrownBy(() -> authService.confirmPasswordReset(
                new AuthDtos.PasswordResetConfirmRequest(reset.resetToken(), "another-password-1234")))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("INVALID_PASSWORD_RESET_TOKEN"));
    }

    @Test
    void unknownEmailDoesNotRevealWhetherAccountExists() {
        AuthDtos.PasswordResetRequestResponse response = authService.requestPasswordReset(
                new AuthDtos.PasswordResetRequest("missing-" + UUID.randomUUID() + "@example.com"));

        assertThat(response.accepted()).isTrue();
        assertThat(response.resetToken()).isNull();
    }
}
