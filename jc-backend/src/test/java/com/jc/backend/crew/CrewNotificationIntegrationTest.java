package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.notification.NotificationService;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CrewNotificationIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;
    @Autowired private NotificationService notifications;

    @Test
    void applicationReviewAndReapplicationCreateEventScopedCrewNotifications() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = users.save(new UserAccount(
                "crew-notification-owner-" + suffix + "@example.com",
                "hash",
                "crew-notification-owner-" + suffix));
        UserAccount applicant = users.save(new UserAccount(
                "crew-notification-applicant-" + suffix + "@example.com",
                "hash",
                "crew-notification-applicant-" + suffix));
        region(regions, "KR-SEOUL", "KR", "Seoul");

        CrewDtos.View crew = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "notification crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(7),
                4,
                true));

        CrewDtos.ApplicationView firstPending = crewService.join(applicant.getId(), crew.id());
        assertThat(firstPending.status()).isEqualTo(CrewMemberStatus.PENDING);
        assertCrewNotifications(owner.getId(), "crew_application", 1, crew.id(), applicant.getId());

        CrewDtos.ApplicationView duplicatePending = crewService.join(applicant.getId(), crew.id());
        assertThat(duplicatePending.id()).isEqualTo(firstPending.id());
        assertCrewNotifications(owner.getId(), "crew_application", 1, crew.id(), applicant.getId());

        CrewDtos.ApplicationView rejected = crewService.review(
                owner.getId(),
                crew.id(),
                firstPending.id(),
                new CrewDtos.ReviewRequest(CrewMemberStatus.REJECTED));
        assertThat(rejected.status()).isEqualTo(CrewMemberStatus.REJECTED);
        assertCrewNotifications(applicant.getId(), "crew_rejected", 1, crew.id(), owner.getId());

        CrewDtos.ApplicationView secondPending = crewService.join(applicant.getId(), crew.id());
        assertThat(secondPending.id()).isEqualTo(firstPending.id());
        assertThat(secondPending.status()).isEqualTo(CrewMemberStatus.PENDING);
        assertCrewNotifications(owner.getId(), "crew_application", 2, crew.id(), applicant.getId());

        CrewDtos.ApplicationView approved = crewService.review(
                owner.getId(),
                crew.id(),
                secondPending.id(),
                new CrewDtos.ReviewRequest(CrewMemberStatus.APPROVED));
        assertThat(approved.status()).isEqualTo(CrewMemberStatus.APPROVED);
        assertCrewNotifications(applicant.getId(), "crew_approved", 1, crew.id(), owner.getId());
    }

    private void assertCrewNotifications(
            long recipientId,
            String type,
            int expectedCount,
            long crewId,
            long actorId) {
        var matching = notifications.list(recipientId, 0, 50).items().stream()
                .filter(item -> type.equals(item.type()))
                .toList();
        assertThat(matching).hasSize(expectedCount);
        assertThat(matching).allSatisfy(item -> {
            assertThat(item.targetType()).isEqualTo("crew");
            assertThat(item.targetId()).isEqualTo(crewId);
            assertThat(item.actor()).isNotNull();
            assertThat(item.actor().id()).isEqualTo(actorId);
            assertThat(item.read()).isFalse();
        });
    }
}
