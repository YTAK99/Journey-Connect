package com.jc.backend.auth;

import com.jc.backend.common.DomainException;
import java.time.Instant;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class GoogleIdentityTokenVerifier implements GoogleIdentityVerifier {

    private static final String GOOGLE_JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> GOOGLE_ISSUERS = Set.of(
            "accounts.google.com",
            "https://accounts.google.com");

    private final JwtDecoder decoder;
    private final String clientId;

    public GoogleIdentityTokenVerifier(
            @Value("${app.google.oauth-client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWK_SET_URI).build();
    }

    @Override
    public GoogleIdentity verify(String idToken) {
        if (clientId.isBlank()) {
            throw new DomainException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "GOOGLE_LOGIN_NOT_CONFIGURED",
                    "Google 로그인 설정이 완료되지 않았습니다.");
        }

        try {
            Jwt jwt = decoder.decode(idToken);
            String issuer = jwt.getClaimAsString("iss");
            if (!GOOGLE_ISSUERS.contains(issuer)
                    || jwt.getAudience() == null
                    || !jwt.getAudience().contains(clientId)
                    || jwt.getExpiresAt() == null
                    || jwt.getExpiresAt().isBefore(Instant.now())) {
                throw invalidGoogleToken();
            }

            String subject = jwt.getSubject();
            String email = jwt.getClaimAsString("email");
            Object verifiedClaim = jwt.getClaims().get("email_verified");
            boolean emailVerified = Boolean.TRUE.equals(verifiedClaim)
                    || "true".equalsIgnoreCase(String.valueOf(verifiedClaim));
            if (subject == null || subject.isBlank()
                    || email == null || email.isBlank()
                    || !emailVerified) {
                throw invalidGoogleToken();
            }

            return new GoogleIdentity(
                    subject,
                    email,
                    jwt.getClaimAsString("name"),
                    jwt.getClaimAsString("picture"),
                    jwt.getClaimAsString("hd"));
        } catch (DomainException exception) {
            throw exception;
        } catch (JwtException | IllegalArgumentException exception) {
            throw invalidGoogleToken();
        }
    }

    private DomainException invalidGoogleToken() {
        return new DomainException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_GOOGLE_ID_TOKEN",
                "Google ID 토큰이 유효하지 않습니다.");
    }
}
