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
@Transactional(readOnly = true) // 조회를 기본값으로 두고 데이터가 바뀌는 메서드만 쓰기 트랜잭션을 엽니다.
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository users;
    private final UserExternalIdentityRepository externalIdentities;
    private final GoogleIdentityVerifier googleIdentityVerifier;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final PasswordResetTokenRepository passwordResetTokens;
    private final PasswordResetMailService passwordResetMailService;
    private final long accessTokenMinutes;
    private final long refreshTokenDays;
    private final long passwordResetMinutes;
    private final boolean exposePasswordResetToken;

    public AuthService(
            UserRepository users,
            UserExternalIdentityRepository externalIdentities,
            GoogleIdentityVerifier googleIdentityVerifier,
            RefreshTokenRepository refreshTokens,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder,
            PasswordResetTokenRepository passwordResetTokens,
            PasswordResetMailService passwordResetMailService,
            @Value("${app.security.access-token-minutes}") long accessTokenMinutes,
            @Value("${app.security.refresh-token-days}") long refreshTokenDays,
            @Value("${app.security.password-reset-minutes:30}") long passwordResetMinutes,
            @Value("${app.security.password-reset-expose-token:false}")
                    boolean exposePasswordResetToken) {
        this.users = users;
        this.externalIdentities = externalIdentities;
        this.googleIdentityVerifier = googleIdentityVerifier;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.passwordResetTokens = passwordResetTokens;
        this.passwordResetMailService = passwordResetMailService;
        this.accessTokenMinutes = accessTokenMinutes;
        this.refreshTokenDays = refreshTokenDays;
        this.passwordResetMinutes = passwordResetMinutes;
        this.exposePasswordResetToken = exposePasswordResetToken;
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
        requireActive(user);
        return issueTokenPair(user);
    }


    @Transactional
    public AuthDtos.TokenResponse googleLogin(AuthDtos.GoogleLoginRequest request) {
        GoogleIdentity identity = googleIdentityVerifier.verify(request.idToken());
        UserExternalIdentity linked = externalIdentities
                .findByProviderAndProviderSubject("google", identity.subject())
                .orElse(null);
        if (linked != null) {
            requireActive(linked.getUser());
            return issueTokenPair(linked.getUser());
        }

        String email = normalizeEmail(identity.email());
        UserAccount user = users.findByEmail(email).orElse(null);
        if (user != null) {
            requireActive(user);
            if (!googleCanAutoLink(identity)) {
                throw new DomainException(
                        HttpStatus.CONFLICT,
                        "GOOGLE_ACCOUNT_LINK_REQUIRED",
                        "기존 계정으로 로그인한 뒤 Google 계정을 연결해주세요.");
            }
            ensureGoogleProviderAvailable(user.getId(), identity.subject());
        } else {
            user = new UserAccount(
                    email,
                    passwordEncoder.encode(randomToken()),
                    googleNickname(identity));
            if (hasText(identity.pictureUrl())) {
                user.updateProfile(null, null, identity.pictureUrl().trim());
            }
            user = users.save(user);
        }

        externalIdentities.save(new UserExternalIdentity(
                user,
                "google",
                identity.subject(),
                email));
        return issueTokenPair(user);
    }

    @Transactional
    public AuthDtos.UserSummary linkGoogle(
            long userId,
            AuthDtos.GoogleLoginRequest request) {
        UserAccount user = users.findById(userId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "사용자를 찾을 수 없습니다."));
        requireActive(user);

        GoogleIdentity identity = googleIdentityVerifier.verify(request.idToken());
        UserExternalIdentity bySubject = externalIdentities
                .findByProviderAndProviderSubject("google", identity.subject())
                .orElse(null);
        if (bySubject != null) {
            if (!bySubject.getUser().getId().equals(userId)) {
                throw new DomainException(
                        HttpStatus.CONFLICT,
                        "GOOGLE_ACCOUNT_ALREADY_LINKED",
                        "이미 다른 계정에 연결된 Google 계정입니다.");
            }
            return summary(user);
        }

        UserExternalIdentity existingForUser = externalIdentities
                .findByUserIdAndProvider(userId, "google")
                .orElse(null);
        if (existingForUser != null) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "GOOGLE_IDENTITY_ALREADY_LINKED",
                    "이미 다른 Google 계정이 연결되어 있습니다.");
        }

        if (!normalizeEmail(user.getEmail()).equals(normalizeEmail(identity.email()))) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "GOOGLE_EMAIL_MISMATCH",
                    "현재 계정과 Google 계정의 이메일이 일치하지 않습니다.");
        }

        externalIdentities.save(new UserExternalIdentity(
                user,
                "google",
                identity.subject(),
                normalizeEmail(identity.email())));
        return summary(user);
    }

    /**
     * Refresh Token 회전 정책에 따라 현재 토큰을 폐기하고 새 토큰 쌍을 발급합니다.
     * 같은 토큰의 동시 재사용은 행 잠금으로 막아 한 요청만 성공하도록 처리합니다.
     */
    @Transactional
    public AuthDtos.TokenResponse refresh(AuthDtos.RefreshRequest request) {
        // 기존 토큰을 잠금 조회·폐기한 뒤 새 토큰 쌍을 발급하는 회전(rotation) 방식입니다.
        Instant now = Instant.now();
        RefreshToken current = refreshTokens.findByTokenHashForUpdate(hash(request.refreshToken()))
                .orElseThrow(this::invalidRefreshToken);
        if (!current.isUsableAt(now)) {
            throw invalidRefreshToken();
        }
        current.revoke(now);
        requireActive(current.getUser());
        return issueTokenPair(current.getUser());
    }

    @Transactional
    public AuthDtos.PasswordResetRequestResponse requestPasswordReset(
            AuthDtos.PasswordResetRequest request) {
        UserAccount user = users.findByEmail(normalizeEmail(request.email())).orElse(null);
        if (user == null || !user.isActive()) {
            return new AuthDtos.PasswordResetRequestResponse(true, null);
        }

        Instant now = Instant.now();
        passwordResetTokens.invalidateAllByUserId(user.getId(), now);
        String rawToken = randomToken();
        passwordResetTokens.save(new PasswordResetToken(
                user,
                hash(rawToken),
                now.plus(Duration.ofMinutes(passwordResetMinutes)),
                now));
        passwordResetMailService.send(user.getEmail(), rawToken);
        return new AuthDtos.PasswordResetRequestResponse(
                true,
                exposePasswordResetToken ? rawToken : null);
    }

    @Transactional
    public void confirmPasswordReset(AuthDtos.PasswordResetConfirmRequest request) {
        Instant now = Instant.now();
        PasswordResetToken token = passwordResetTokens
                .findByTokenHashForUpdate(hash(request.token()))
                .orElseThrow(this::invalidPasswordResetToken);
        if (!token.isUsableAt(now)) {
            throw invalidPasswordResetToken();
        }

        UserAccount user = token.getUser();
        requireActive(user);
        user.changePasswordHash(passwordEncoder.encode(request.newPassword()));
        token.consume(now);
        passwordResetTokens.invalidateOthersByUserId(user.getId(), token.getId(), now);
        refreshTokens.revokeAllByUserId(user.getId(), now);
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
                .claim("role", user.getRole())
                .build();

        JwsHeader headers = JwsHeader.with(MacAlgorithm.HS256)
                .type("JWT")
                .build();
        String accessToken = jwtEncoder
                .encode(JwtEncoderParameters.from(headers, claims))
                .getTokenValue();
        String refreshToken = randomToken();
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
                user.getProfileImageUrl(),
                user.getRole(),
                user.getAccountStatus());
    }

    private String randomToken() {
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


    private boolean googleCanAutoLink(GoogleIdentity identity) {
        String email = normalizeEmail(identity.email());
        return email.endsWith("@gmail.com") || hasText(identity.hostedDomain());
    }

    private void ensureGoogleProviderAvailable(long userId, String subject) {
        UserExternalIdentity existing = externalIdentities
                .findByUserIdAndProvider(userId, "google")
                .orElse(null);
        if (existing != null && !existing.getProviderSubject().equals(subject)) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "GOOGLE_IDENTITY_ALREADY_LINKED",
                    "이미 다른 Google 계정이 연결되어 있습니다.");
        }
    }

    private String googleNickname(GoogleIdentity identity) {
        String base = hasText(identity.name())
                ? identity.name().trim().replaceAll("\\s+", " ")
                : normalizeEmail(identity.email()).split("@", 2)[0];
        if (base.isBlank()) {
            base = "traveler";
        }
        if (base.length() > 30) {
            base = base.substring(0, 30);
        }

        String candidate = base + "-" + hash(identity.subject()).substring(0, 8);
        if (!users.existsByNickname(candidate)) {
            return candidate;
        }
        for (int attempt = 0; attempt < 10; attempt++) {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            candidate = base + "-" + suffix;
            if (!users.existsByNickname(candidate)) {
                return candidate;
            }
        }
        throw new DomainException(
                HttpStatus.CONFLICT,
                "NICKNAME_GENERATION_FAILED",
                "Google 계정용 닉네임을 생성할 수 없습니다.");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeNickname(String nickname) {
        return nickname.trim();
    }

    private void requireActive(UserAccount user) {
        if (!user.isActive()) {
            throw new DomainException(HttpStatus.FORBIDDEN, "ACCOUNT_NOT_ACTIVE", "사용할 수 없는 계정입니다.");
        }
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

    private DomainException invalidPasswordResetToken() {
        return new DomainException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_PASSWORD_RESET_TOKEN",
                "비밀번호 재설정 토큰이 유효하지 않습니다.");
    }
}
