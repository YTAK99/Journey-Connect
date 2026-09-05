package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.recommendation.p1.RecommendationP1ProfileSource;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import com.jc.recommendation.model.event.EventType;
import com.jc.recommendation.p1.profile.BehaviorProfileEvent;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CrewRecommendationFeedbackIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;
    @Autowired private CrewRecommendationService recommendationService;
    @Autowired private RecommendationP1ProfileSource profileSource;
    @Autowired private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void isolateRecommendationCandidatesFromPersistentTestDatabase() {
        jdbcTemplate.update("update crew set recruiting = false where recruiting = true");
    }

    @Test
    void approvedJoinBecomesCrewPreferenceAndIsRecordedOnlyOnce() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        Region busan = region(regions, "KR-BUSAN", "KR", "Busan");
        UserAccount member = user("crew-feedback-member-" + suffix);
        UserAccount sourceOwner = user("crew-feedback-source-owner-" + suffix);
        UserAccount similarOwner = user("crew-feedback-similar-owner-" + suffix);
        UserAccount otherOwner = user("crew-feedback-other-owner-" + suffix);

        CrewDtos.View source = crew(sourceOwner, seoul, "source-" + suffix, false, List.of("food"));
        CrewDtos.View similar = crew(similarOwner, seoul, "similar-" + suffix, true, List.of("food"));
        crew(otherOwner, busan, "other-" + suffix, true, List.of("cafe"));

        CrewDtos.ApplicationView joined = crewService.join(member.getId(), source.id());
        assertThat(joined.status()).isEqualTo(CrewMemberStatus.APPROVED);
        assertThat(eventCount(member.getId(), source.id(), "crew_join")).isEqualTo(1);
        assertThat(eventCount(member.getId(), source.id(), "crew_leave")).isZero();

        Instant now = Instant.now();
        BehaviorProfileEvent crewJoin = profileSource.findBehaviorEvents(
                        member.getId(), now.minusSeconds(86_400), now.plusSeconds(60), 100)
                .stream()
                .filter(event -> event.eventType() == EventType.CREW_JOIN)
                .findFirst()
                .orElseThrow();
        assertThat(crewJoin.featureIds()).contains("region:seoul", "theme:food");

        List<CrewRecommendationDtos.Item> recommendations = recommendationService.recommend(member.getId(), 10);
        assertThat(recommendations).isNotEmpty();
        assertThat(recommendations.get(0).crew().id()).isEqualTo(similar.id());
        assertThat(recommendations.get(0).reasons()).contains(
                CrewRecommendationReason.REGION_MATCH,
                CrewRecommendationReason.TAG_MATCH);

        crewService.cancelJoin(member.getId(), source.id());
        crewService.join(member.getId(), source.id());
        assertThat(eventCount(member.getId(), source.id(), "crew_join")).isEqualTo(1);
        assertThat(eventCount(member.getId(), source.id(), "crew_leave")).isZero();
    }

    @Test
    void pendingAndRejectedApplicationsDoNotCreatePreferenceSignalsUntilApproval() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Region seoul = region(regions, "KR-SEOUL", "KR", "Seoul");
        UserAccount owner = user("crew-feedback-review-owner-" + suffix);
        UserAccount approvedUser = user("crew-feedback-approved-" + suffix);
        UserAccount rejectedUser = user("crew-feedback-rejected-" + suffix);
        CrewDtos.View crew = crew(owner, seoul, "review-" + suffix, true, List.of("nature"));

        CrewDtos.ApplicationView pending = crewService.join(approvedUser.getId(), crew.id());
        assertThat(pending.status()).isEqualTo(CrewMemberStatus.PENDING);
        assertThat(eventCount(approvedUser.getId(), crew.id(), "crew_join")).isZero();

        crewService.review(
                owner.getId(),
                crew.id(),
                pending.id(),
                new CrewDtos.ReviewRequest(CrewMemberStatus.APPROVED));
        assertThat(eventCount(approvedUser.getId(), crew.id(), "crew_join")).isEqualTo(1);

        CrewDtos.ApplicationView rejected = crewService.join(rejectedUser.getId(), crew.id());
        crewService.review(
                owner.getId(),
                crew.id(),
                rejected.id(),
                new CrewDtos.ReviewRequest(CrewMemberStatus.REJECTED));
        assertThat(eventCount(rejectedUser.getId(), crew.id(), "crew_join")).isZero();
        assertThat(eventCount(rejectedUser.getId(), crew.id(), "crew_leave")).isZero();
    }

    private UserAccount user(String prefix) {
        return users.save(new UserAccount(
                prefix + "@example.com",
                "hash",
                prefix));
    }

    private CrewDtos.View crew(
            UserAccount owner,
            Region region,
            String title,
            boolean approvalRequired,
            List<String> tags) {
        return crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                title,
                region.getCode(),
                null,
                "crew recommendation feedback test",
                null,
                6,
                approvalRequired,
                null,
                tags));
    }

    private int eventCount(long userId, long crewId, String eventType) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from public.recommendation_behavior_event
                where user_id = ?
                  and event_type = ?
                  and entity_type = 'crew'
                  and source_entity_id = ?
                """,
                Integer.class,
                userId,
                eventType,
                crewId);
        return count == null ? 0 : count;
    }
}
