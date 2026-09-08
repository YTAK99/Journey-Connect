package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CrewRecommendationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;
    @Autowired private CrewRecommendationService recommendationService;
    @Autowired private CrewRecommendationCandidateSource candidateSource;
    @Autowired private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void isolateRecommendationCandidatesFromPersistentTestDatabase() {
        jdbcTemplate.update("update crew set recruiting = false where recruiting = true");
    }

    @Test
    void authenticatedRecommendationUsesP1PreferencesAndAllowsUndecidedTravelDate() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        UserAccount viewer = user("crew-rec-viewer-" + suffix);
        UserAccount seoulOwner = user("crew-rec-seoul-owner-" + suffix);
        UserAccount busanOwner = user("crew-rec-busan-owner-" + suffix);
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        Region busan = region(regions, "KR-BUSAN", "KR", "Busan");

        CrewDtos.View preferred = crewService.create(seoulOwner.getId(), new CrewDtos.CreateRequest(
                "서울 푸드 크루 " + suffix,
                seoul.getCode(),
                null,
                "서울 맛집을 함께 찾습니다.",
                null,
                10,
                true,
                null,
                List.of("food")));
        crewService.create(busanOwner.getId(), new CrewDtos.CreateRequest(
                "부산 자연 크루 " + suffix,
                busan.getCode(),
                null,
                "부산 자연 여행을 함께합니다.",
                null,
                10,
                true,
                null,
                List.of("nature")));

        preference(viewer.getId(), "region:seoul");
        preference(viewer.getId(), "theme:food");

        mockMvc.perform(get("/api/v1/crews/recommended")
                        .param("size", "2")
                        .with(jwt().jwt(token -> token.subject(viewer.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].crew.id").value(preferred.id()))
                .andExpect(jsonPath("$.data[0].crew.travelDate").value(nullValue()))
                .andExpect(jsonPath("$.data[0].reasons", hasItem("REGION_MATCH")))
                .andExpect(jsonPath("$.data[0].reasons", hasItem("TAG_MATCH")))
                .andExpect(jsonPath("$.data[0].policyVersion").value("crew-recommendation-v1"));

        mockMvc.perform(get("/api/v1/crews/recommended"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cancelledMembershipCanReturnButRejectedMembershipIsExcluded() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        UserAccount viewer = user("crew-rec-state-viewer-" + suffix);
        UserAccount cancelledOwner = user("crew-rec-cancel-owner-" + suffix);
        UserAccount rejectedOwner = user("crew-rec-reject-owner-" + suffix);
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");

        CrewDtos.View cancelledCrew = crewService.create(
                cancelledOwner.getId(),
                request("cancelled-" + suffix, seoul));
        crewService.join(viewer.getId(), cancelledCrew.id());
        crewService.cancelJoin(viewer.getId(), cancelledCrew.id());

        CrewDtos.View rejectedCrew = crewService.create(
                rejectedOwner.getId(),
                request("rejected-" + suffix, seoul));
        CrewDtos.ApplicationView rejectedApplication = crewService.join(viewer.getId(), rejectedCrew.id());
        crewService.review(
                rejectedOwner.getId(),
                rejectedCrew.id(),
                rejectedApplication.id(),
                new CrewDtos.ReviewRequest(CrewMemberStatus.REJECTED));

        Set<Long> candidateIds = candidateSource.findEligible(
                        viewer.getId(),
                        LocalDate.now(),
                        CrewRecommendationPolicy.RETRIEVAL_LIMIT)
                .stream()
                .map(CrewRecommendationCandidateSource.Candidate::id)
                .collect(Collectors.toSet());

        org.assertj.core.api.Assertions.assertThat(candidateIds)
                .contains(cancelledCrew.id())
                .doesNotContain(rejectedCrew.id());

        Set<Long> recommendedIds = recommendationService.recommend(viewer.getId(), 20).stream()
                .map(item -> item.crew().id())
                .collect(Collectors.toSet());
        org.assertj.core.api.Assertions.assertThat(recommendedIds).contains(cancelledCrew.id());
    }

    private UserAccount user(String name) {
        return users.save(new UserAccount(name + "@example.com", "hash", name));
    }

    private CrewDtos.CreateRequest request(String title, Region region) {
        return new CrewDtos.CreateRequest(
                title,
                region.getCode(),
                null,
                "description",
                LocalDate.now().plusDays(30),
                10,
                true);
    }

    private void preference(long userId, String featureId) {
        jdbcTemplate.update(
                """
                insert into recommendation_user_preference (
                    user_id, feature_id, preference_kind, strength, active)
                values (?, ?, 'prefer', 1.0, true)
                """,
                userId,
                featureId);
    }
}
