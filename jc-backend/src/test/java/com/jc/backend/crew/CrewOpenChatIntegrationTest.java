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
class CrewOpenChatIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;

    @Test
    void openChatUrlIsVisibleOnlyToOwnerAndApprovedMembers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = user("chat-owner-" + suffix, "chat-owner-" + suffix);
        UserAccount applicant = user("chat-applicant-" + suffix, "chat-applicant-" + suffix);
        UserAccount outsider = user("chat-outsider-" + suffix, "chat-outsider-" + suffix);
        region(regions, "KR-SEOUL", "KR", "Seoul");
        String openChatUrl = "https://open.kakao.com/o/test-" + suffix;

        CrewDtos.View created = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "open chat crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(10),
                4,
                true,
                null,
                openChatUrl,
                List.of()));

        assertThat(created.openChatUrl()).isEqualTo(openChatUrl);
        assertThat(created.viewer().canAccessOpenChat()).isTrue();

        CrewDtos.View anonymousView = crewService.detail(created.id());
        assertThat(anonymousView.openChatUrl()).isNull();
        assertThat(anonymousView.viewer()).isNull();

        CrewDtos.ApplicationView pending = crewService.join(applicant.getId(), created.id());
        assertThat(pending.status()).isEqualTo(CrewMemberStatus.PENDING);
        CrewDtos.View pendingView = crewService.detail(applicant.getId(), created.id());
        assertThat(pendingView.openChatUrl()).isNull();
        assertThat(pendingView.viewer().canAccessOpenChat()).isFalse();

        CrewDtos.View outsiderView = crewService.detail(outsider.getId(), created.id());
        assertThat(outsiderView.openChatUrl()).isNull();
        assertThat(outsiderView.viewer().canAccessOpenChat()).isFalse();

        crewService.review(
                owner.getId(),
                created.id(),
                pending.id(),
                new CrewDtos.ReviewRequest(CrewMemberStatus.APPROVED));

        CrewDtos.View approvedView = crewService.detail(applicant.getId(), created.id());
        assertThat(approvedView.openChatUrl()).isEqualTo(openChatUrl);
        assertThat(approvedView.viewer().canAccessOpenChat()).isTrue();
    }

    @Test
    void ownerCanChangeOrClearOpenChatUrlAndInvalidUrlsAreRejected() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = user("chat-manage-owner-" + suffix, "chat-manage-owner-" + suffix);
        region(regions, "KR-SEOUL", "KR", "Seoul");

        CrewDtos.View created = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "managed chat crew",
                "KR-SEOUL",
                null,
                "description",
                LocalDate.now().plusDays(10),
                4,
                true));

        String updatedUrl = "https://open.kakao.com/o/updated-" + suffix;
        CrewDtos.View updated = crewService.update(owner.getId(), created.id(), new CrewDtos.UpdateRequest(
                null, null, null, null, null, null, null, updatedUrl, null));
        assertThat(updated.openChatUrl()).isEqualTo(updatedUrl);
        assertThat(updated.viewer().canAccessOpenChat()).isTrue();

        assertThatThrownBy(() -> crewService.update(owner.getId(), created.id(), new CrewDtos.UpdateRequest(
                null, null, null, null, null, null, null, "http://open.kakao.com/o/insecure", null)))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("INVALID_CREW_OPEN_CHAT_URL"));

        CrewDtos.View cleared = crewService.update(owner.getId(), created.id(), new CrewDtos.UpdateRequest(
                null, null, null, null, null, null, null, "   ", null));
        assertThat(cleared.openChatUrl()).isNull();
        assertThat(cleared.viewer().canAccessOpenChat()).isFalse();
    }

    private UserAccount user(String emailPrefix, String nickname) {
        return users.save(new UserAccount(emailPrefix + "@example.com", "hash", nickname));
    }
}
