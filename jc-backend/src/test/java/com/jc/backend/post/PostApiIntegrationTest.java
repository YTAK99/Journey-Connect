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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
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
        // 공통 Region 픽스처를 재사용해 테스트마다 동일 지역 데이터가 중복 생성되는 것을 방지하고,
        // 기존 seed 및 다른 통합 테스트의 외래키 참조에 영향을 주지 않도록 합니다.
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

    @Test
    void cityPostIsFoundByStateAndCountryNames() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String postTitle = "island trip " + suffix;
        Region honolulu = regions.save(new Region(
                "GOOGLE-HONOLULU-" + suffix,
                "US",
                "Honolulu",
                null,
                "honolulu-place-" + suffix,
                "호놀룰루 하와이 Honolulu Hawaii"));
        posts.save(new JourneyPost(owner, honolulu, postTitle, "ocean story"));

        for (String keyword : new String[] {"하와이", "Hawaii", "미국", "United States"}) {
            mockMvc.perform(get("/api/v1/explore").param("keyword", keyword))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.items[*].title").value(
                            org.hamcrest.Matchers.hasItem(postTitle)));
        }

        mockMvc.perform(get("/api/v1/explore").param("keyword", "일본"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].title").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem(postTitle))));
    }

    @Test
    void feedRegionWorksForAnonymousAndAuthenticatedCallers() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Region other = regions.save(new Region(
                "ZZ-FEED-OTHER-" + suffix,
                "ZZ",
                "Other " + suffix,
                null));
        String otherTitle = "other-region-" + suffix;
        posts.save(new JourneyPost(owner, other, otherTitle, "content"));

        mockMvc.perform(get("/api/v1/feed").param("region", "KR-SEOUL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].title").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem(otherTitle))));

        mockMvc.perform(get("/api/v1/feed")
                        .param("region", "KR-SEOUL")
                        .with(jwt().jwt(token -> token.subject(reactor.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].title").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem(otherTitle))));
    }

    @Test
    void feedRegionValidationAndSizeBoundariesStayStable() throws Exception {
        mockMvc.perform(get("/api/v1/feed").param("region", " "))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/feed").param("region", "ZZ-NOT-FOUND"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("REGION_NOT_FOUND"));

        mockMvc.perform(get("/api/v1/feed").param("size", "0"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/feed").param("size", "101"))
                .andExpect(status().isBadRequest());
    }
}
