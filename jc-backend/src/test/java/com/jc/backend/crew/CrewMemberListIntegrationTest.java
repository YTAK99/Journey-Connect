package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.hamcrest.Matchers.notNullValue;
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
class CrewMemberListIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;

    @Test
    void memberListExposesOnlyOwnerAndApprovedMembers() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        UserAccount owner = users.save(new UserAccount(
                "crew-members-owner-" + suffix + "@example.com",
                "hash",
                "crew-members-owner-" + suffix));
        UserAccount approvedUser = users.save(new UserAccount(
                "crew-members-approved-" + suffix + "@example.com",
                "hash",
                "crew-members-approved-" + suffix));
        approvedUser.updateProfile(
                approvedUser.getNickname(),
                null,
                "https://cdn.example.com/" + suffix + "/profile.jpg");
        UserAccount pendingUser = users.save(new UserAccount(
                "crew-members-pending-" + suffix + "@example.com",
                "hash",
                "crew-members-pending-" + suffix));
        region(regions, "T-MEMBER-" + suffix, "KR", "MemberRegion-" + suffix);

        CrewDtos.View crew = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "member list crew " + suffix,
                "T-MEMBER-" + suffix,
                null,
                "description",
                LocalDate.now().plusDays(10),
                5,
                true));

        CrewDtos.ApplicationView approvedApplication =
                crewService.join(approvedUser.getId(), crew.id());
        crewService.review(
                owner.getId(),
                crew.id(),
                approvedApplication.id(),
                new CrewDtos.ReviewRequest(CrewMemberStatus.APPROVED));
        crewService.join(pendingUser.getId(), crew.id());

        mockMvc.perform(get("/api/v1/crews/{crewId}/members", crew.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].userId").value(owner.getId()))
                .andExpect(jsonPath("$.data.items[0].role").value("OWNER"))
                .andExpect(jsonPath("$.data.items[0].joinedAt").value(notNullValue()))
                .andExpect(jsonPath("$.data.items[1].userId").value(approvedUser.getId()))
                .andExpect(jsonPath("$.data.items[1].role").value("MEMBER"))
                .andExpect(jsonPath("$.data.items[1].profileImageUrl")
                        .value("https://cdn.example.com/" + suffix + "/profile.jpg"))
                .andExpect(jsonPath("$.data.items[1].joinedAt").value(notNullValue()));
    }

    @Test
    void memberListReturnsNotFoundForUnknownCrew() throws Exception {
        mockMvc.perform(get("/api/v1/crews/{crewId}/members", Long.MAX_VALUE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CREW_NOT_FOUND"));
    }
}
