package com.jc.backend.crew;

import com.jc.backend.common.DomainException;
import com.jc.backend.crew.CrewRecommendationCandidateSource.Candidate;
import com.jc.backend.crew.CrewRecommendationCandidateSource.TagValue;
import com.jc.backend.recommendation.p1.RecommendationP1ProfileSource;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import com.jc.recommendation.p1.profile.BehaviorProfileBuilder;
import com.jc.recommendation.p1.profile.BehaviorProfilePolicies;
import com.jc.recommendation.p1.profile.BehaviorProfilePolicy;
import com.jc.recommendation.p1.profile.BehaviorProfileSnapshot;
import com.jc.recommendation.p1.profile.BuildBehaviorProfileInput;
import com.jc.recommendation.p1.profile.P1FeatureSignal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 게시글 행동으로 형성된 P1 취향을 모집 가능한 크루 랭킹에 재사용합니다. */
@Service
@Transactional(readOnly = true)
public class CrewRecommendationService {

    private final CrewRecommendationCandidateSource candidateSource;
    private final CrewRecommendationScorer scorer;
    private final RecommendationP1ProfileSource profileSource;
    private final UserRepository users;
    private final BehaviorProfileBuilder profileBuilder = new BehaviorProfileBuilder();

    public CrewRecommendationService(
            CrewRecommendationCandidateSource candidateSource,
            CrewRecommendationScorer scorer,
            RecommendationP1ProfileSource profileSource,
            UserRepository users) {
        this.candidateSource = candidateSource;
        this.scorer = scorer;
        this.profileSource = profileSource;
        this.users = users;
    }

    public List<CrewRecommendationDtos.Item> recommend(long userId, int size) {
        validateSize(size);
        requireActiveUser(userId);

        Instant referenceInstant = Instant.now();
        ZoneId zone = ZoneId.systemDefault();
        LocalDate today = LocalDate.ofInstant(referenceInstant, zone);
        LocalDateTime referenceTime = LocalDateTime.ofInstant(referenceInstant, zone);

        List<Candidate> candidates = candidateSource.findEligible(
                userId,
                today,
                CrewRecommendationPolicy.RETRIEVAL_LIMIT);
        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<String, P1FeatureSignal> signals = signalMap(profile(userId, referenceInstant));
        List<Ranked> ranked = candidates.stream()
                .map(candidate -> new Ranked(
                        candidate,
                        scorer.score(candidate, signals, referenceTime)))
                .sorted(Comparator
                        .comparingDouble((Ranked rankedCandidate) -> rankedCandidate.score().value())
                        .reversed()
                        .thenComparing(
                                rankedCandidate -> rankedCandidate.candidate().createdAt(),
                                Comparator.reverseOrder())
                        .thenComparing(
                                rankedCandidate -> rankedCandidate.candidate().id(),
                                Comparator.reverseOrder()))
                .limit(size)
                .toList();

        return ranked.stream()
                .map(item -> new CrewRecommendationDtos.Item(
                        view(item.candidate()),
                        item.score().value(),
                        item.score().reasons(),
                        CrewRecommendationPolicy.VERSION))
                .toList();
    }

    private BehaviorProfileSnapshot profile(long userId, Instant referenceTime) {
        BehaviorProfilePolicy policy = BehaviorProfilePolicies.V1;
        return profileBuilder.build(new BuildBehaviorProfileInput(
                Long.toString(userId),
                referenceTime,
                profileSource.findExplicitPreferences(userId),
                profileSource.findBehaviorEvents(
                        userId,
                        referenceTime.minusSeconds((long) policy.lookbackDays() * 86_400L),
                        referenceTime,
                        policy.maximumEvents()),
                policy));
    }

    private Map<String, P1FeatureSignal> signalMap(BehaviorProfileSnapshot profile) {
        return profile.signals().stream().collect(Collectors.toUnmodifiableMap(
                P1FeatureSignal::featureId,
                Function.identity()));
    }

    private CrewDtos.View view(Candidate candidate) {
        List<String> tags = candidate.tags().stream().map(TagValue::name).toList();
        CrewDtos.Viewer viewer = new CrewDtos.Viewer(
                candidate.viewerStatus(),
                false,
                true,
                false,
                false,
                false);
        return new CrewDtos.View(
                candidate.id(),
                candidate.title(),
                candidate.regionCode(),
                candidate.regionName(),
                candidate.description(),
                candidate.coverImageUrl(),
                null,
                tags,
                candidate.travelDate(),
                candidate.capacity(),
                candidate.memberCount(),
                candidate.pendingApplicationCount(),
                true,
                candidate.approvalRequired(),
                candidate.ownerId(),
                candidate.ownerNickname(),
                candidate.createdAt(),
                viewer);
    }

    private void requireActiveUser(long userId) {
        UserAccount user = users.findById(userId)
                .orElseThrow(this::userNotFound);
        if (!user.isActive()) {
            throw userNotFound();
        }
    }

    private void validateSize(int size) {
        if (size < 1 || size > CrewRecommendationPolicy.MAX_SIZE) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "CREW_RECOMMENDATION_SIZE_INVALID",
                    "추천 크루 개수는 1개 이상 20개 이하여야 합니다.");
        }
    }

    private DomainException userNotFound() {
        return new DomainException(
                HttpStatus.NOT_FOUND,
                "USER_NOT_FOUND",
                "사용자를 찾을 수 없습니다.");
    }

    private record Ranked(Candidate candidate, CrewRecommendationScorer.Score score) {}
}
