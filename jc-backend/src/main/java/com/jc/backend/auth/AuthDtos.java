package com.jc.backend.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 인증 API의 요청·응답 스키마를 한곳에 모아 컨트롤러와 프론트의 계약을 명확히 합니다. */
public final class AuthDtos {

    private AuthDtos() {}

    // @Valid가 이 record를 검사할 때 아래 제약을 위반하면 서비스 호출 전에 400 응답이 됩니다.
    public record SignupRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 40) String nickname) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record LogoutRequest(@NotBlank String refreshToken) {}

    public record PasswordResetRequest(@Email @NotBlank String email) {}

    public record PasswordResetConfirmRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 72) String newPassword) {}

    public record PasswordResetRequestResponse(
            boolean accepted,
            @JsonInclude(JsonInclude.Include.NON_NULL) String resetToken) {}

    public record TokenResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            long expiresInSeconds,
            long refreshExpiresInSeconds,
            UserSummary user) {}

    public record UserSummary(
            Long id,
            String email,
            String nickname,
            String bio,
            String profileImageUrl,
            String role,
            String accountStatus) {}
}
