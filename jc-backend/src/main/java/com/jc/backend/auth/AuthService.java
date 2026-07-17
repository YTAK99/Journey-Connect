package com.jc.backend.auth;

import com.jc.backend.common.DomainException;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회원가입, 로그인, 토큰 재발급, 로그아웃 흐름을 담당하는 인증 서비스입니다.
 *
 * <p>Access Token은 짧은 수명으로 API 인증에 사용하고, Refresh Token은 해시로 저장한 뒤
 * 재발급 시점에 회전시키고 사용된 토큰은 즉시 폐기해 재사용을 방지합니다.
 */
@Service
@Transactional(readOnly = true)
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final long accessTokenMinutes;
    private final long refreshTokenDays;

    public AuthService(
            UserRepository users,
            RefreshTokenRepository refreshTokens,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder,
            @Value("${app.security.access-token-minutes}") long accessTokenMinutes,
            @Value("${app.security.refresh-token-days}") long refreshTokenDays) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.accessTokenMinutes = accessTokenMinutes;
        this.refreshTokenDays = refreshTokenDays;
    }

    @Transactional
    public AuthDtos.TokenResponse signup(AuthDtos.SignupRequest request) {
        String email = normalizeEmail(request.email());
        String nickname = normalizeNickname(request.nickname());

        if (users.existsByEmail(email)) {
            throw new DomainException(HttpStatus.CONFLICT, "EMAIL_ALREADY_USED", "이미 사용 중인 이메일입니다.");
        }
        if (users.existsByNickname(nickname)) {
            throw new DomainException(HttpStatus.CONFLICT, "NICKNAME_ALREADY_USED", "이미 사용 중인 닉네임입니다.");
        }

        UserAccount user = users.save(
                new UserAccount(email, passwordEncoder.encode(request.password()), nickname));
        return issueTokenPair(user);
    }

    @Transactional
    public AuthDtos.TokenResponse login(AuthDtos.LoginRequest request) {
        UserAccount user = users.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(this::invalidCredentials);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return issueTokenPair(user);
    }

    /**
     * Refresh Token 회전 정책에 따라 현재 토큰을 폐기하고 새 토큰 쌍을 발급합니다.
     * 같은 토큰의 동시 재사용은 행 잠금으로 막아 한 요청만 성공하도록 처리합니다.
     */
    @Transactional
    public AuthDtos.TokenResponse refresh(AuthDtos.RefreshRequest request) {
        Instant now = Instant.now();
        RefreshToken current = refreshTokens.findByTokenHashForUpdate(hash(request.refreshToken()))
                .orElseThrow(this::invalidRefreshToken);
        if (!current.isUsableAt(now)) {
            throw invalidRefreshToken();
        }
        current.revoke(now);
        return issueTokenPair(current.getUser());
    }

    /** 로그아웃은 이미 폐기되었거나 존재하지 않는 토큰도 성공으로 처리하는 멱등 연산입니다. */
    @Transactional
    public void logout(AuthDtos.LogoutRequest request) {
        refreshTokens.findByTokenHashForUpdate(hash(request.refreshToken()))
                .ifPresent(token -> token.revoke(Instant.now()));
    }

    public AuthDtos.UserSummary currentUser(long userId) {
        UserAccount user = users.findById(userId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "사용자를 찾을 수 없습니다."));
        return summary(user);
    }

    /**
     * Access Token과 Refresh Token을 한 번에 발급하고, Refresh Token은 DB에 해시 형태로 저장합니다.
     */
    private AuthDtos.TokenResponse issueTokenPair(UserAccount user) {
        Instant issuedAt = Instant.now();
        Instant accessExpiresAt = issuedAt.plus(Duration.ofMinutes(accessTokenMinutes));
        Instant refreshExpiresAt = issuedAt.plus(Duration.ofDays(refreshTokenDays));

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("journey-connect")
                .id(UUID.randomUUID().toString())
                .issuedAt(issuedAt)
                .expiresAt(accessExpiresAt)
                .subject(user.getId().toString())
                .claim("nickname", user.getNickname())
                .build();

        JwsHeader headers = JwsHeader.with(MacAlgorithm.HS256)
                .type("JWT")
                .build();
        String accessToken = jwtEncoder
                .encode(JwtEncoderParameters.from(headers, claims))
                .getTokenValue();
        String refreshToken = randomRefreshToken();
        refreshTokens.save(new RefreshToken(user, hash(refreshToken), refreshExpiresAt));

        return new AuthDtos.TokenResponse(
                accessToken,
                refreshToken,
                "Bearer",
                Duration.between(issuedAt, accessExpiresAt).toSeconds(),
                Duration.between(issuedAt, refreshExpiresAt).toSeconds(),
                summary(user));
    }

    public static AuthDtos.UserSummary summary(UserAccount user) {
        return new AuthDtos.UserSummary(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getBio(),
                user.getProfileImageUrl());
    }

    private String randomRefreshToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeNickname(String nickname) {
        return nickname.trim();
    }

    private DomainException invalidCredentials() {
        return new DomainException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    private DomainException invalidRefreshToken() {
        return new DomainException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN",
                "리프레시 토큰이 유효하지 않습니다.");
    }
}
