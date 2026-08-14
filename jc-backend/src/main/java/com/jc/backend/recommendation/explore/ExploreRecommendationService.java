package com.jc.backend.recommendation.explore;

import com.jc.backend.common.CursorPageResponse;
import com.jc.backend.common.DomainException;
import com.jc.backend.common.PageResponse;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostService;
import com.jc.backend.region.RegionService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ExploreRecommendationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExploreRecommendationService.class);
    private static final String RECOMMENDATION_SURFACE = "search";

    static final int RECENT_CANDIDATE_LIMIT = 75;
    static final int QUALITY_CANDIDATE_LIMIT = 75;
    static final int SNAPSHOT_CANDIDATE_LIMIT = 100;
    static final Duration FRESHNESS_HALF_LIFE = Duration.ofDays(30);
    static final Duration CURSOR_TTL = Duration.ofMinutes(30);

    private final ExploreCandidateSource candidateSource;
    private final PostService postService;
    private final RegionService regionService;
    private final ExploreFeatureExtractor featureExtractor;
    private final ExploreDiscoveryScorer scorer;
    private final ExploreDiversityReranker diversityReranker;
    private final ExploreSnapshotPager snapshotPager;
    private final ExploreCursorCodec cursorCodec;
    private final ExploreRolloutMode rolloutMode;

    public ExploreRecommendationService(
            ExploreCandidateSource candidateSource,
            PostService postService,
            RegionService regionService,
            @Value("${app.recommendation.explore.cursor-secret:journey-connect-explore-local-dev-secret-32bytes}")
                    String cursorSecret,
            @Value("${app.recommendation.explore.mode:LEGACY}") String rolloutMode) {
        this.candidateSource = candidateSource;
        this.postService = postService;
        this.regionService = regionService;
        this.featureExtractor = new ExploreFeatureExtractor();
        this.scorer = new ExploreDiscoveryScorer();
        this.diversityReranker = new ExploreDiversityReranker();
        this.snapshotPager = new ExploreSnapshotPager();
        this.cursorCodec = new ExploreCursorCodec(cursorSecret.getBytes(StandardCharsets.UTF_8));
        this.rolloutMode = ExploreRolloutMode.parse(rolloutMode);
    }

    public CursorPageResponse<PostDtos.Summary> discovery(
            String cursor,
            String region,
            int size,
            Long userId) {
        int safeSize = Math.min(Math.max(size, 1), 100);

        if (rolloutMode != ExploreRolloutMode.ACTIVE) {
            if (cursor != null && !cursor.isBlank()) {
                throw rolloutCursorError();
            }
            if (rolloutMode == ExploreRolloutMode.LEGACY) {
                return legacyFirstPage(region, safeSize, userId);
            }
            return shadowFirstPage(region, safeSize, userId);
        }

        Instant now = Instant.now();
        ExploreRequestContext context = ExploreRequestContext.resolve(null, region);
        String fingerprint = ExploreCursorCodec.filterFingerprint(context);
        Optional<String> userBinding = opaqueUserBinding(userId);

        if (cursor == null || cursor.isBlank()) {
            try {
                return rankedFirstPage(context, fingerprint, userBinding, userId, safeSize, now).response();
            } catch (RuntimeException exception) {
                return legacyFirstPage(region, safeSize, userId);
            }
        }

        ExploreCursorCodec.Snapshot snapshot;
        try {
            snapshot = cursorCodec.decode(
                    cursor,
                    new ExploreCursorCodec.Expectations(
                            ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                            fingerprint,
                            userBinding),
                    now);
        } catch (ExploreCursorException exception) {
            throw cursorError(exception);
        }
        return pageFromSnapshot(snapshot, safeSize, userId);
    }

    private CursorPageResponse<PostDtos.Summary> shadowFirstPage(
            String region,
            int size,
            Long userId) {
        CursorPageResponse<PostDtos.Summary> legacy = legacyFirstPage(region, size, userId);
        ExploreRequestContext context = ExploreRequestContext.resolve(null, region);
        String fingerprint = ExploreCursorCodec.filterFingerprint(context);
        Optional<String> userBinding = opaqueUserBinding(userId);
        Instant now = Instant.now();
        long startedAt = System.nanoTime();

        try {
            RankedPage discovery = rankedFirstPage(
                    context,
                    fingerprint,
                    userBinding,
                    userId,
                    size,
                    now);
            ExploreShadowObservation observation = ExploreShadowObservation.compare(
                    legacy.items(),
                    discovery.response().items(),
                    discovery.candidateCount(),
                    System.nanoTime() - startedAt,
                    context.hasExplicitRegion());
            logShadowObservation(observation);
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "explore_shadow_failed rankingVersion={} explicitRegion={} errorType={}",
                    ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                    context.hasExplicitRegion(),
                    exception.getClass().getSimpleName());
        }
        return legacy;
    }

    private RankedPage rankedFirstPage(
            ExploreRequestContext context,
            String fingerprint,
            Optional<String> userBinding,
            Long userId,
            int size,
            Instant now) {
        String countryCode = regionService.countryCodeForSearch(context.region());
        List<ExploreCandidateRow> candidates = candidateSource.findCandidates(new ExploreCandidateQuery(
                now,
                context.region(),
                countryCode,
                RECENT_CANDIDATE_LIMIT,
                QUALITY_CANDIDATE_LIMIT));
        if (candidates.isEmpty()) {
            return new RankedPage(
                    CursorPageResponse.contextual(List.of(), null, false, RECOMMENDATION_SURFACE), 0);
        }

        ExploreFeatureSnapshot snapshot = featureExtractor.extract(
                candidates,
                now,
                FRESHNESS_HALF_LIFE);
        List<ExploreDiscoveryScore> baseRanking = scorer.rank(snapshot.candidates());
        List<Long> orderedPostIds = diversityReranker
                .rerank(baseRanking, context.hasExplicitRegion())
                .stream()
                .map(ExploreDiversityReranker.DiversifiedCandidate::postId)
                .limit(SNAPSHOT_CANDIDATE_LIMIT)
                .toList();

        ExploreCursorCodec.Snapshot frozen = new ExploreCursorCodec.Snapshot(
                ExploreRankingPolicy.DISCOVERY_RANKING_VERSION,
                now,
                fingerprint,
                userBinding,
                orderedPostIds,
                0,
                now.plus(CURSOR_TTL));
        return new RankedPage(pageFromSnapshot(frozen, size, userId), candidates.size());
    }

    private CursorPageResponse<PostDtos.Summary> pageFromSnapshot(
            ExploreCursorCodec.Snapshot snapshot,
            int size,
            Long userId) {
        List<Long> remaining = snapshot.orderedPostIds().subList(
                snapshot.nextOffset(),
                snapshot.orderedPostIds().size());
        List<PostDtos.Summary> visibleSummaries = postService.visibleSummariesByIds(remaining, userId);
        Map<Long, PostDtos.Summary> summaryById = visibleSummaries.stream()
                .collect(Collectors.toMap(
                        PostDtos.Summary::id,
                        summary -> summary,
                        (left, right) -> left,
                        LinkedHashMap::new));
        Set<Long> visibleIds = summaryById.keySet();

        ExploreSnapshotPager.Page page = snapshotPager.page(
                snapshot,
                size,
                visibleIds::contains);
        List<PostDtos.Summary> items = page.postIds().stream()
                .map(summaryById::get)
                .filter(Objects::nonNull)
                .toList();

        String nextCursor = page.hasNext()
                ? cursorCodec.encode(snapshot.withNextOffset(page.nextOffset()))
                : null;
        return CursorPageResponse.contextual(
                items, nextCursor, page.hasNext(), RECOMMENDATION_SURFACE);
    }

    private CursorPageResponse<PostDtos.Summary> legacyFirstPage(
            String region, int size, Long userId) {
        PageResponse<PostDtos.Summary> legacy = postService.explore(
                "",
                region,
                PageRequest.of(0, size),
                userId);
        return CursorPageResponse.contextual(
                legacy.items(), null, false, RECOMMENDATION_SURFACE);
    }

    private static void logShadowObservation(ExploreShadowObservation observation) {
        LOGGER.info(
                "explore_shadow rankingVersion={} explicitRegion={} rankingLatencyMs={} candidateCount={} "
                        + "topN={} topNOverlap={} uniqueAuthors={} uniqueRegions={} topAuthorShare={}",
                observation.rankingVersion(),
                observation.explicitRegion(),
                observation.rankingLatencyMs(),
                observation.candidateCount(),
                observation.topN(),
                observation.topNOverlap(),
                observation.uniqueAuthors(),
                observation.uniqueRegions(),
                observation.topAuthorShare());
    }

    private static Optional<String> opaqueUserBinding(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        if (userId <= 0) {
            throw new IllegalArgumentException("userId must be positive");
        }
        return Optional.of("u:" + sha256("user:" + userId));
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte current : digest) {
                hex.append(Character.forDigit((current >>> 4) & 0x0f, 16));
                hex.append(Character.forDigit(current & 0x0f, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static DomainException cursorError(ExploreCursorException exception) {
        String code = switch (exception.reason()) {
            case EXPIRED -> "EXPLORE_CURSOR_EXPIRED";
            case TAMPERED -> "EXPLORE_CURSOR_TAMPERED";
            case RANKING_VERSION_MISMATCH -> "EXPLORE_CURSOR_VERSION_MISMATCH";
            case FILTER_MISMATCH -> "EXPLORE_CURSOR_FILTER_MISMATCH";
            case USER_BINDING_MISMATCH -> "EXPLORE_CURSOR_USER_MISMATCH";
            case INVALID -> "EXPLORE_CURSOR_INVALID";
        };
        return new DomainException(
                HttpStatus.BAD_REQUEST,
                code,
                "탐색 커서가 유효하지 않습니다. 탐색을 처음부터 다시 시도해 주세요.");
    }

    private static DomainException rolloutCursorError() {
        return new DomainException(
                HttpStatus.BAD_REQUEST,
                "EXPLORE_CURSOR_MODE_MISMATCH",
                "현재 탐색 모드에서는 이전 커서를 계속 사용할 수 없습니다. 탐색을 처음부터 다시 시도해 주세요.");
    }

    private record RankedPage(
            CursorPageResponse<PostDtos.Summary> response,
            int candidateCount) {}
}
