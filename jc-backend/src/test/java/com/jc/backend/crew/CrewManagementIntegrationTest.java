package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CrewManagementIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;

    @Test
    void ownerCanUpdateCrewButCannotShrinkCapacityBelowActiveMembers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = user("manage-owner-" + suffix, "manage-owner-" + suffix);
        UserAccount firstMember = user("manage-member1-" + suffix, "manage-member1-" + suffix);
        UserAccount secondMember = user("manage-member2-" + suffix, "manage-member2-" + suffix);
        UserAccount outsider = user("manage-outsider-" + suffix, "manage-outsider-" + suffix);
        region(regions, "KR-SEOUL", "KR", "Seoul");
        region(regions, "KR-BUSAN", "KR", "Busan");

        CrewDtos.View created = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "before title",
                "KR-SEOUL",
                null,
                "before description",
                LocalDate.now().plusDays(10),
                4,
                false,
                "https://example.com/before.jpg",
                List.of("before")));
        crewService.join(firstMember.getId(), created.id());
        crewService.join(secondMember.getId(), created.id());

        CrewDtos.UpdateRequest tooSmall = new CrewDtos.UpdateRequest(
                null, null, null, null, null, 2, null, null);
        assertThatThrownBy(() -> crewService.update(owner.getId(), created.id(), tooSmall))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("CREW_CAPACITY_BELOW_ACTIVE_MEMBERS"));

        CrewDtos.UpdateRequest outsiderUpdate = new CrewDtos.UpdateRequest(
                "blocked", null, null, null, null, null, null, null);
        assertThatThrownBy(() -> crewService.update(outsider.getId(), created.id(), outsiderUpdate))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("CREW_OWNER_REQUIRED"));

        LocalDate changedDate = LocalDate.now().plusDays(20);
        CrewDtos.View updated = crewService.update(owner.getId(), created.id(), new CrewDtos.UpdateRequest(
                "after title",
                "KR-BUSAN",
                null,
                "after description",
                changedDate,
                5,
                "https://example.com/after.jpg",
                List.of("food", "photo")));

        assertThat(updated.title()).isEqualTo("after title");
        assertThat(updated.regionCode()).isEqualTo("KR-BUSAN");
        assertThat(updated.regionName()).isEqualTo("Busan");
        assertThat(updated.description()).isEqualTo("after description");
        assertThat(updated.travelDate()).isEqualTo(changedDate);
        assertThat(updated.capacity()).isEqualTo(5);
        assertThat(updated.coverImageUrl()).isEqualTo("https://example.com/after.jpg");
        assertThat(updated.tags()).containsExactly("food", "photo");
        assertThat(updated.memberCount()).isEqualTo(3);
        assertThat(updated.approvalRequired()).isFalse();
        assertThat(updated.viewer().owner()).isTrue();
    }

    @Test
    void closeAndReopenRespectCapacityAndTravelDatePolicies() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = user("lifecycle-owner-" + suffix, "lifecycle-owner-" + suffix);
        UserAccount member = user("lifecycle-member-" + suffix, "lifecycle-member-" + suffix);
        region(regions, "KR-SEOUL", "KR", "Seoul");

        CrewDtos.View fullCrew = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "full crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(5),
                2,
                false));
        crewService.join(member.getId(), fullCrew.id());
        assertThat(crewService.closeRecruitment(owner.getId(), fullCrew.id()).recruiting()).isFalse();
        assertThatThrownBy(() -> crewService.reopenRecruitment(owner.getId(), fullCrew.id()))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("CREW_FULL"));

        CrewDtos.View datedCrew = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "dated crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(5),
                3,
                true));
        crewService.closeRecruitment(owner.getId(), datedCrew.id());
        crewService.update(owner.getId(), datedCrew.id(), new CrewDtos.UpdateRequest(
                null,
                null,
                null,
                null,
                LocalDate.now().minusDays(1),
                null,
                null,
                null));

        assertThatThrownBy(() -> crewService.reopenRecruitment(owner.getId(), datedCrew.id()))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("CREW_TRAVEL_DATE_PASSED"));

        CrewDtos.View outsiderView = crewService.detail(member.getId(), datedCrew.id());
        assertThat(outsiderView.viewer().canJoin()).isFalse();
    }

    private UserAccount user(String emailPrefix, String nickname) {
        return users.save(new UserAccount(emailPrefix + "@example.com", "hash", nickname));
    }
}
