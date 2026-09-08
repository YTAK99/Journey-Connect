package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.hamcrest.Matchers.hasItems;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CrewMyMembershipIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;

    @Test
    void myCrewsReturnsOwnerApprovedAndPendingMemberships() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = users.save(new UserAccount(
                "my-crew-owner-" + suffix + "@example.com",
                "hash",
                "my-crew-owner-" + suffix));
        UserAccount member = users.save(new UserAccount(
                "my-crew-member-" + suffix + "@example.com",
                "hash",
                "my-crew-member-" + suffix));
        region(regions, "KR-SEOUL", "KR", "Seoul");

        CrewDtos.View pendingCrew = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "pending crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(10),
                4,
                true));
        CrewDtos.View immediateCrew = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "immediate crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(11),
                4,
                false));

        crewService.join(member.getId(), pendingCrew.id());
        crewService.join(member.getId(), immediateCrew.id());

        mockMvc.perform(get("/api/v1/users/me/crews")
                        .with(jwt().jwt(token -> token.subject(member.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[*].membershipStatus")
                        .value(hasItems("PENDING", "APPROVED")))
                .andExpect(jsonPath("$.data.items[*].crew.viewer.membershipStatus")
                        .value(hasItems("PENDING", "APPROVED")));

        mockMvc.perform(get("/api/v1/users/me/crews")
                        .with(jwt().jwt(token -> token.subject(owner.getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[*].membershipStatus")
                        .value(hasItems("OWNER")));

        mockMvc.perform(get("/api/v1/users/me/crews"))
                .andExpect(status().isUnauthorized());
    }
}
