package com.jc.backend.recommendation.application;

import com.jc.backend.common.CursorPageResponse;
import com.jc.backend.common.DomainException;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostService;
import com.jc.backend.region.RegionService;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Chooses legacy, SHADOW, or CANARY feed paths while preserving a fail-open first page. */
@Service
public class RecommendationFeedService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationFeedService.class);

    private final PostService postService;
    private final RecommendationModeDecider modeDecider;
    private final RecommendationShadowService shadowService;
    private final RecommendationCanaryService canaryService;
    private final RegionService regionService;

    public RecommendationFeedService(
            PostService postService,
            RecommendationModeDecider modeDecider,
            RecommendationShadowService shadowService,
            RecommendationCanaryService canaryService,
            RegionService regionService) {
        this.postService = postService;
        this.modeDecider = modeDecider;
        this.shadowService = shadowService;
        this.canaryService = canaryService;
        this.regionService = regionService;
    }

    public CursorPageResponse<PostDtos.Summary> feed(
            String cursor, int size, Long userId, String tokenId) {
        return feed(cursor, size, null, userId, tokenId);
    }

    public CursorPageResponse<PostDtos.Summary> feed(
            String cursor, int size, String region, Long userId, String tokenId) {
        String regionCode = canonicalRegionCode(region);
        if (canaryService.isRecommendationCursor(cursor)) {
            if (!modeDecider.isCanaryMode() || userId == null || userId <= 0) {
                throw expiredCursor();
            }
            try {
                return canaryService.nextPage(cursor, userId, tokenId, size, regionCode);
            } catch (DomainException exception) {
                throw exception;
            } catch (RuntimeException exception) {
                log.warn("Recommendation CANARY continuation failed closed: {}",
                        exception.getClass().getSimpleName(), exception);
                throw expiredCursor();
            }
        }

        if (cursor == null && userId != null && userId > 0
                && modeDecider.shouldServeHomeCanary(userId)) {
            try {
                Optional<CursorPageResponse<PostDtos.Summary>> response =
                        canaryService.firstPage(userId, tokenId, size, regionCode);
                if (response.isPresent()) {
                    return response.get();
                }
            } catch (RuntimeException exception) {
                log.warn("Recommendation CANARY first page failed open for user {}: {}",
                        userId, exception.getClass().getSimpleName(), exception);
            }
        }

        CursorPageResponse<PostDtos.Summary> legacy = postService.feed(cursor, size, regionCode, userId);
        shadowService.observeHomeFeed(userId, tokenId, cursor == null, regionCode);
        return CursorPageResponse.contextual(
                legacy.items(), legacy.nextCursor(), legacy.hasNext(), "home");
    }

    private String canonicalRegionCode(String region) {
        if (region == null || region.isBlank()) {
            return null;
        }
        return regionService.requireByCode(region).getCode();
    }

    private DomainException expiredCursor() {
        return new DomainException(
                HttpStatus.CONFLICT,
                "RECOMMENDATION_CURSOR_EXPIRED",
                "추천 피드가 변경되었습니다. 첫 페이지부터 다시 요청해 주세요.");
    }
}
