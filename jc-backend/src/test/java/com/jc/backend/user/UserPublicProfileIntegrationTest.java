package com.jc.backend.user;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class UserPublicProfileIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void publicProfileExposesOnlyPublicFieldsVisiblePostCountAndViewerState() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount target = users.save(new UserAccount(
                "public-profile-target-" + suffix + "@example.com",
                "hash",
                "public-target-" + suffix));
        target.updateProfile(
                target.getNickname(),
                "public bio " + suffix,
                "https://example.com/profile/" + suffix + ".jpg");
        users.save(target);
        UserAccount viewer = users.save(new UserAccount(
                "public-profile-viewer-" + suffix + "@example.com",
                "hash",
                "public-viewer-" + suffix));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");

        posts.save(new JourneyPost(target, seoul, "public-1-" + suffix, "content"));
        posts.save(new JourneyPost(target, seoul, "public-2-" + suffix, "content"));
        JourneyPost draft = new JourneyPost(target, seoul, "draft-" + suffix, "content");
        draft.update(null, null, null, false);
        posts.save(draft);

        mockMvc.perform(get("/api/v1/users/{userId}", target.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(target.getId()))
                .andExpect(jsonPath("$.data.nickname").value(target.getNickname()))
                .andExpect(jsonPath("$.data.bio").value("public bio " + suffix))
                .andExpect(jsonPath("$.data.profileImageUrl")
                        .value("https://example.com/profile/" + suffix + ".jpg"))
                .andExpect(jsonPath("$.data.postCount").value(2))
                .andExpect(jsonPath("$.data.viewer").value(nullValue()))
                .andExpect(jsonPath("$.data.email").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.role").doesNotExist())
                .andExpect(jsonPath("$.data.accountStatus").doesNotExist());

        mockMvc.perform(get("/api/v1/users/{userId}", target.getId())
                        .with(jwt().jwt(token -> token.subject(viewer.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewer.self").value(false));

        mockMvc.perform(get("/api/v1/users/{userId}", target.getId())
                        .with(jwt().jwt(token -> token.subject(target.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewer.self").value(true));
    }

    @Test
    void inactiveUserIsHiddenFromProfileAndPublicPosts() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount target = users.save(new UserAccount(
                "inactive-public-profile-" + suffix + "@example.com",
                "hash",
                "inactive-public-" + suffix));
        jdbc.update(
                "update user_account set account_status = 'suspended', suspended_at = current_timestamp where id = ?",
                target.getId());

        mockMvc.perform(get("/api/v1/users/{userId}", target.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));

        mockMvc.perform(get("/api/v1/users/{userId}/posts", target.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }
}
