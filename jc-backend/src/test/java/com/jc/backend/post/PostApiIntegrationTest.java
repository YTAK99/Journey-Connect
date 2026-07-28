package com.jc.backend.post;

import static com.jc.backend.support.TestRegionFixtures.region;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostApiIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostLikeRepository likes;

    private UserAccount owner;
    private UserAccount reactor;
    private JourneyPost published;

    @BeforeEach
    void setUp() {
        String fixtureId = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        owner = users.save(new UserAccount(
                "api-owner-" + fixtureId + "@example.com",
                "hash",
                "api-owner-" + fixtureId));
        reactor = users.save(new UserAccount(
                "api-reactor-" + fixtureId + "@example.com",
                "hash",
                "api-reactor-" + fixtureId));
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");

        JourneyPost draft = new JourneyPost(owner, seoul, "draft", "private");
        draft.update(null, null, null, false);
        // Repository save 트랜잭션 밖에서 변경한 detached 엔티티이므로 다시 저장해야 공개 상태가 DB에 반영됩니다.
        posts.save(draft);
        published = posts.save(new JourneyPost(owner, seoul, "public", "visible"));
    }

    @Test
    void publicAndOwnerPostEndpointsKeepDifferentVisibilityRules() throws Exception {
        mockMvc.perform(get("/api/v1/users/{userId}/posts", owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].title").value("public"));

        mockMvc.perform(get("/api/v1/users/me/posts")
                        .with(jwt().jwt(token -> token.subject(owner.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(2));
    }

    @Test
    void repeatedLikeApiCallsRemainIdempotent() throws Exception {
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/posts/{postId}/likes", published.getId())
                            .with(jwt().jwt(token -> token.subject(reactor.getId().toString()))))
                    .andExpect(status().isNoContent());
        }

        org.assertj.core.api.Assertions.assertThat(likes.countByPostId(published.getId()))
                .isEqualTo(1);
    }
}
