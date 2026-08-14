package com.jc.backend.post;

import com.jc.backend.region.RegionService;
import com.jc.backend.user.UserAccount;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Post Summary DTO의 데이터 계약을 한 곳에서 조립해 Feed/Explore/CANARY 간 필드 드리프트를 막습니다. */
@Component
public final class PostSummaryAssembler {

    private static final int PREVIEW_MAX_LENGTH = 240;

    private final PostSummaryMetricsRepository metricsRepository;
    private final RegionService regionService;

    public PostSummaryAssembler(
            PostSummaryMetricsRepository metricsRepository,
            RegionService regionService) {
        this.metricsRepository = metricsRepository;
        this.regionService = regionService;
    }

    public List<PostDtos.Summary> summaries(List<JourneyPost> posts, Long viewerId) {
        if (posts == null || posts.isEmpty()) {
            return List.of();
        }

        List<Long> postIds = posts.stream().map(JourneyPost::getId).toList();
        Map<Long, PostSummaryMetricsProjection> metricsByPostId = metricsRepository
                .findByPostIds(postIds, viewerId)
                .stream()
                .collect(Collectors.toUnmodifiableMap(
                        PostSummaryMetricsProjection::getPostId,
                        value -> value,
                        (left, right) -> left));
        Map<Long, Map<String, String>> regionNamesById = regionService.localizedNamesByRegionIds(
                posts.stream()
                        .map(post -> post.getRegion().getId())
                        .distinct()
                        .toList());

        return posts.stream()
                .map(post -> summary(
                        post,
                        metricsByPostId.get(post.getId()),
                        regionNamesById.getOrDefault(post.getRegion().getId(), Map.of())))
                .toList();
    }

    private PostDtos.Summary summary(
            JourneyPost post,
            PostSummaryMetricsProjection metrics,
            Map<String, String> localizedRegionNames) {
        long likeCount = metrics == null ? 0L : metrics.getLikeCount();
        long bookmarkCount = metrics == null ? 0L : metrics.getBookmarkCount();
        long commentCount = metrics == null ? 0L : metrics.getCommentCount();
        boolean liked = metrics != null && Boolean.TRUE.equals(metrics.getLiked());
        boolean bookmarked = metrics != null && Boolean.TRUE.equals(metrics.getBookmarked());

        return new PostDtos.Summary(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                preview(post.getContent()),
                post.getRegion().getCode(),
                post.getRegion().getGooglePlaceId(),
                post.getRegionName(),
                localizedRegionNames,
                regionService.searchText(post.getRegion()),
                post.getCoverImageUrl(),
                post.getTags().stream().map(Tag::getName).toList(),
                post.getViewCount(),
                likeCount,
                bookmarkCount,
                commentCount,
                liked,
                bookmarked,
                author(post.getAuthor()),
                post.getCreatedAt());
    }

    private static PostDtos.Author author(UserAccount user) {
        return new PostDtos.Author(user.getId(), user.getNickname(), user.getProfileImageUrl());
    }

    private static String preview(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        String plain = html
                .replaceAll("(?s)<[^>]*>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replaceAll("\\s+", " ")
                .trim();
        if (plain.length() <= PREVIEW_MAX_LENGTH) {
            return plain;
        }
        return plain.substring(0, PREVIEW_MAX_LENGTH).stripTrailing() + "…";
    }
}
