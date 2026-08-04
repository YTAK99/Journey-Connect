package com.jc.backend.recommendation.application;

import com.jc.backend.post.BookmarkRepository;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.PostCountProjection;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostLikeRepository;
import com.jc.backend.post.Tag;
import com.jc.backend.region.RegionService;
import com.jc.backend.user.UserAccount;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Maps persisted CANARY post IDs to the target backend's existing summary DTO contract. */
@Repository
@Transactional(readOnly = true)
public class RecommendationPostSummarySource {

    private final JourneyPostRepository posts;
    private final PostLikeRepository likes;
    private final BookmarkRepository bookmarks;
    private final RegionService regionService;

    public RecommendationPostSummarySource(
            JourneyPostRepository posts,
            PostLikeRepository likes,
            BookmarkRepository bookmarks,
            RegionService regionService) {
        this.posts = posts;
        this.likes = likes;
        this.bookmarks = bookmarks;
        this.regionService = regionService;
    }

    public List<PostDtos.Summary> findVisibleByOrderedIds(List<Long> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) {
            return List.of();
        }
        if (orderedIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("ordered post IDs must be positive");
        }
        List<Long> distinctIds = orderedIds.stream().distinct().toList();
        if (distinctIds.size() != orderedIds.size()) {
            throw new IllegalArgumentException("ordered post IDs must be unique");
        }

        Map<Long, JourneyPost> visibleById = StreamSupport.stream(
                        posts.findAllById(distinctIds).spliterator(), false)
                .filter(this::isVisible)
                .collect(Collectors.toMap(JourneyPost::getId, Function.identity()));
        List<JourneyPost> ordered = orderedIds.stream()
                .map(visibleById::get)
                .filter(Objects::nonNull)
                .toList();
        if (ordered.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> likeCounts = countMap(likes.countByPostIds(distinctIds));
        Map<Long, Long> bookmarkCounts = countMap(bookmarks.countByPostIds(distinctIds));
        return ordered.stream()
                .map(post -> summary(post, likeCounts, bookmarkCounts))
                .toList();
    }

    private boolean isVisible(JourneyPost post) {
        return post.isPublished()
                && post.isModerationVisible()
                && post.getAuthor() != null
                && post.getAuthor().isActive();
    }

    private Map<Long, Long> countMap(List<PostCountProjection> counts) {
        if (counts.isEmpty()) {
            return Collections.emptyMap();
        }
        return counts.stream().collect(Collectors.toUnmodifiableMap(
                PostCountProjection::getPostId,
                PostCountProjection::getTotal,
                (existing, ignored) -> existing));
    }

    private PostDtos.Summary summary(
            JourneyPost post,
            Map<Long, Long> likeCounts,
            Map<Long, Long> bookmarkCounts) {
        return new PostDtos.Summary(
                post.getId(),
                post.getTitle(),
                post.getRegion().getCode(),
                post.getRegion().getGooglePlaceId(),
                post.getRegionName(),
                regionService.localizedNames(post.getRegion()),
                regionService.searchText(post.getRegion()),
                post.getCoverImageUrl(),
                post.getTags().stream().map(Tag::getName).toList(),
                post.getViewCount(),
                likeCounts.getOrDefault(post.getId(), 0L),
                bookmarkCounts.getOrDefault(post.getId(), 0L),
                author(post.getAuthor()),
                post.getCreatedAt());
    }

    private PostDtos.Author author(UserAccount user) {
        return new PostDtos.Author(user.getId(), user.getNickname(), user.getProfileImageUrl());
    }
}
