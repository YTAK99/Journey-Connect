package com.jc.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.common.DomainException;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(GoogleAuthIntegrationTest.GoogleVerifierTestConfig.class)
@Transactional
class GoogleAuthIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private UserExternalIdentityRepository externalIdentities;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void googleLoginCreatesAccountAndUsesSubjectForRepeatLogin() throws Exception {
        String suffix = fixtureId();
        String idToken = "new-google:" + suffix;
        String email = "new-google-" + suffix + "@gmail.com";
        String subject = "sub-new-google-" + suffix;

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.email").value(email));

        UserAccount created = users.findByEmail(email).orElseThrow();
        assertThat(externalIdentities
                .findByProviderAndProviderSubject("google", subject)
                .orElseThrow()
                .getUser()
                .getId()).isEqualTo(created.getId());

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.id").value(created.getId()));
    }

    @Test
    void authoritativeGoogleEmailCanAutoLinkExistingLocalAccount() throws Exception {
        String suffix = fixtureId();
        String idToken = "existing-gmail:" + suffix;
        String email = "existing-google-" + suffix + "@gmail.com";
        String subject = "sub-existing-gmail-" + suffix;
        UserAccount existing = users.save(new UserAccount(
                email,
                passwordEncoder.encode("password123"),
                "existing-google-user-" + suffix));

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.id").value(existing.getId()));

        assertThat(externalIdentities
                .findByProviderAndProviderSubject("google", subject)
                .orElseThrow()
                .getUser()
                .getId()).isEqualTo(existing.getId());
    }

    @Test
    void nonAuthoritativeEmailRequiresAuthenticatedExplicitLink() throws Exception {
        String suffix = fixtureId();
        String idToken = "legacy-google:" + suffix;
        String email = "legacy-google-" + suffix + "@example.com";
        UserAccount existing = users.save(new UserAccount(
                email,
                passwordEncoder.encode("password123"),
                "legacy-google-user-" + suffix));

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("GOOGLE_ACCOUNT_LINK_REQUIRED"));

        mockMvc.perform(post("/api/v1/auth/google/link")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/google/link")
                        .with(jwt().jwt(token -> token.subject(existing.getId().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(existing.getId()));

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"" + idToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.id").value(existing.getId()));
    }

    @TestConfiguration
    static class GoogleVerifierTestConfig {

        @Bean
        @Primary
        GoogleIdentityVerifier googleIdentityVerifier() {
            return idToken -> {
                if (idToken.startsWith("new-google:")) {
                    String suffix = tokenSuffix(idToken);
                    return new GoogleIdentity(
                            "sub-new-google-" + suffix,
                            "new-google-" + suffix + "@gmail.com",
                            "New Google",
                            "https://example.com/google.png",
                            null);
                }
                if (idToken.startsWith("existing-gmail:")) {
                    String suffix = tokenSuffix(idToken);
                    return new GoogleIdentity(
                            "sub-existing-gmail-" + suffix,
                            "existing-google-" + suffix + "@gmail.com",
                            "Existing Google",
                            null,
                            null);
                }
                if (idToken.startsWith("legacy-google:")) {
                    String suffix = tokenSuffix(idToken);
                    return new GoogleIdentity(
                            "sub-legacy-google-" + suffix,
                            "legacy-google-" + suffix + "@example.com",
                            "Legacy Google",
                            null,
                            null);
                }
                throw new DomainException(
                        HttpStatus.UNAUTHORIZED,
                        "INVALID_GOOGLE_ID_TOKEN",
                        "Google ID 토큰이 유효하지 않습니다.");
            };
        }

        private String tokenSuffix(String idToken) {
            int separator = idToken.indexOf(':');
            return separator < 0 ? "" : idToken.substring(separator + 1);
        }
    }

    private String fixtureId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
