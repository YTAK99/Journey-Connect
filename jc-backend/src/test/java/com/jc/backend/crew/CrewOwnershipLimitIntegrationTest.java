package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CrewOwnershipLimitIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewRepository crews;
    @Autowired private CrewService crewService;

    @Test
    void ownerCanHaveAtMostThreeRecruitingCrewsAndClosedCrewReleasesQuota() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = user("crew-limit-owner-" + suffix);
        region(regions, "KR-SEOUL", "KR", "Seoul");

        CrewDtos.View first = crewService.create(owner.getId(), request("first-" + suffix));
        crewService.create(owner.getId(), request("second-" + suffix));
        crewService.create(owner.getId(), request("third-" + suffix));

        assertThat(crews.countRecruitingByOwnerId(owner.getId())).isEqualTo(3);
        assertThatThrownBy(() -> crewService.create(owner.getId(), request("fourth-" + suffix)))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode())
                                .isEqualTo("CREW_OWNER_ACTIVE_LIMIT_EXCEEDED"));

        crewService.closeRecruitment(owner.getId(), first.id());
        assertThat(crews.countRecruitingByOwnerId(owner.getId())).isEqualTo(2);

        crewService.create(owner.getId(), request("replacement-" + suffix));
        assertThat(crews.countRecruitingByOwnerId(owner.getId())).isEqualTo(3);

        assertThatThrownBy(() -> crewService.reopenRecruitment(owner.getId(), first.id()))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode())
                                .isEqualTo("CREW_OWNER_ACTIVE_LIMIT_EXCEEDED"));
        assertThat(crews.countRecruitingByOwnerId(owner.getId())).isEqualTo(3);
    }

    @Test
    void simultaneousCreateRequestsCannotExceedOwnerRecruitingLimit() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = user("crew-limit-race-owner-" + suffix);
        region(regions, "KR-SEOUL", "KR", "Seoul");
        crewService.create(owner.getId(), request("seed-one-" + suffix));
        crewService.create(owner.getId(), request("seed-two-" + suffix));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<String>> results = new ArrayList<>();

        try {
            results.add(submitCreate(
                    executor, ready, start, owner.getId(), "race-one-" + suffix));
            results.add(submitCreate(
                    executor, ready, start, owner.getId(), "race-two-" + suffix));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<String> outcomes = List.of(
                    results.get(0).get(10, TimeUnit.SECONDS),
                    results.get(1).get(10, TimeUnit.SECONDS));
            assertThat(outcomes).containsExactlyInAnyOrder(
                    "CREATED",
                    "CREW_OWNER_ACTIVE_LIMIT_EXCEEDED");
            assertThat(crews.countRecruitingByOwnerId(owner.getId())).isEqualTo(3);
        } finally {
            executor.shutdownNow();
        }
    }

    private Future<String> submitCreate(
            ExecutorService executor,
            CountDownLatch ready,
            CountDownLatch start,
            Long ownerId,
            String title) {
        return executor.submit(() -> {
            ready.countDown();
            start.await();
            try {
                crewService.create(ownerId, request(title));
                return "CREATED";
            } catch (DomainException exception) {
                return exception.getCode();
            }
        });
    }

    private UserAccount user(String prefix) {
        return users.save(new UserAccount(
                prefix + "@example.com",
                "hash",
                prefix));
    }

    private CrewDtos.CreateRequest request(String title) {
        return new CrewDtos.CreateRequest(
                title,
                "KR-SEOUL",
                null,
                "crew ownership limit test",
                LocalDate.now().plusDays(30),
                6,
                true);
    }
}
