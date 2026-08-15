package com.jc.backend.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class UserProfileIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private UserService userService;
    @Autowired private EntityManager entityManager;

    @Test
    @Transactional
    void nicknameBioAndProfileImagePersistAndReadBack() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount user = users.save(new UserAccount(
                "profile-" + suffix + "@example.com", "hash", "before-" + suffix));

        userService.updateProfile(
                user.getId(),
                new UserDtos.UpdateProfileRequest(
                        "after-" + suffix,
                        "traveler bio",
                        "/uploads/profile-" + suffix + ".webp"));

        entityManager.flush();
        entityManager.clear();

        var reloaded = userService.me(user.getId());
        assertThat(reloaded.nickname()).isEqualTo("after-" + suffix);
        assertThat(reloaded.bio()).isEqualTo("traveler bio");
        assertThat(reloaded.profileImageUrl())
                .isEqualTo("/uploads/profile-" + suffix + ".webp");
    }

    @Test
    void duplicateNicknameIsRejected() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        users.save(new UserAccount(
                "profile-owner-" + suffix + "@example.com", "hash", "taken-" + suffix));
        UserAccount user = users.save(new UserAccount(
                "profile-target-" + suffix + "@example.com", "hash", "target-" + suffix));

        assertThatThrownBy(() -> userService.updateProfile(
                user.getId(),
                new UserDtos.UpdateProfileRequest("taken-" + suffix, null, null)))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(409);
                    assertThat(exception.getCode()).isEqualTo("NICKNAME_ALREADY_USED");
                });
    }
}
