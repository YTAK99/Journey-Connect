package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CrewViewerStateIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;

    @Test
    void crewDetailExposesServerCalculatedViewerCapabilities() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = users.save(new UserAccount(
                "crew-view-owner-" + suffix + "@example.com",
                "hash",
                "crew-view-owner-" + suffix));
        UserAccount applicant = users.save(new UserAccount(
                "crew-view-applicant-" + suffix + "@example.com",
                "hash",
                "crew-view-applicant-" + suffix));
        UserAccount outsider = users.save(new UserAccount(
                "crew-view-outsider-" + suffix + "@example.com",
                "hash",
                "crew-view-outsider-" + suffix));
        region(regions, "KR-SEOUL", "KR", "Seoul");

        CrewDtos.View crew = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "viewer crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(10),
                4,
                true));
        crewService.join(applicant.getId(), crew.id());

        assertThat(crewService.detail(crew.id()).viewer()).isNull();
        CrewDtos.View listed = crewService.list(applicant.getId(), PageRequest.of(0, 100)).items().stream()
                .filter(item -> item.id().equals(crew.id()))
                .findFirst()
                .orElseThrow();
        assertThat(listed.viewer().membershipStatus()).isEqualTo(CrewMemberStatus.PENDING);
        assertThat(listed.viewer().canCancel()).isTrue();

        mockMvc.perform(get("/api/v1/crews/{crewId}", crew.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewer").value(nullValue()));

        mockMvc.perform(get("/api/v1/crews/{crewId}", crew.id())
                        .with(jwt().jwt(token -> token.subject(applicant.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewer.membershipStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.viewer.owner").value(false))
                .andExpect(jsonPath("$.data.viewer.canJoin").value(false))
                .andExpect(jsonPath("$.data.viewer.canCancel").value(true))
                .andExpect(jsonPath("$.data.viewer.canManageApplications").value(false));

        mockMvc.perform(get("/api/v1/crews/{crewId}", crew.id())
                        .with(jwt().jwt(token -> token.subject(outsider.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewer.membershipStatus").value(nullValue()))
                .andExpect(jsonPath("$.data.viewer.owner").value(false))
                .andExpect(jsonPath("$.data.viewer.canJoin").value(true))
                .andExpect(jsonPath("$.data.viewer.canCancel").value(false));

        mockMvc.perform(get("/api/v1/crews/{crewId}", crew.id())
                        .with(jwt().jwt(token -> token.subject(owner.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewer.membershipStatus").value("OWNER"))
                .andExpect(jsonPath("$.data.viewer.owner").value(true))
                .andExpect(jsonPath("$.data.viewer.canJoin").value(false))
                .andExpect(jsonPath("$.data.viewer.canManageApplications").value(true));
    }
}
