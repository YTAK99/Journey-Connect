package com.jc.backend.crew;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.PageResponse;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CrewApprovalIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;

    @Test
    void approvalRequiredCrewKeepsApplicantPendingUntilOwnerApproves() {
        UserAccount owner = users.save(new UserAccount("approval-owner@example.com", "hash", "approval-owner"));
        UserAccount applicant = users.save(new UserAccount("approval-user@example.com", "hash", "approval-user"));
        regions.save(new Region("KR-SEOUL", "KR", "Seoul", null));

        CrewDtos.View crew = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "approval crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(10),
                4,
                true));

        CrewDtos.ApplicationView pending = crewService.join(applicant.getId(), crew.id());
        assertThat(pending.status()).isEqualTo(CrewMemberStatus.PENDING);

        PageResponse<CrewDtos.ApplicationView> applications =
                crewService.applications(owner.getId(), crew.id(), PageRequest.of(0, 20));
        assertThat(applications.items()).extracting(CrewDtos.ApplicationView::id)
                .containsExactly(pending.id());

        CrewDtos.ApplicationView approved = crewService.review(
                owner.getId(),
                crew.id(),
                pending.id(),
                new CrewDtos.ReviewRequest(CrewMemberStatus.APPROVED));
        assertThat(approved.status()).isEqualTo(CrewMemberStatus.APPROVED);
        assertThat(crewService.detail(crew.id()).memberCount()).isEqualTo(2);
    }
}
