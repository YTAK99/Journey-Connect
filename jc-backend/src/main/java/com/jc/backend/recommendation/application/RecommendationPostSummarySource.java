package com.jc.backend.recommendation.application;

import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostSummaryAssembler;
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
    private final PostSummaryAssembler summaryAssembler;

    public RecommendationPostSummarySource(
            JourneyPostRepository posts,
            PostSummaryAssembler summaryAssembler) {
        this.posts = posts;
        this.summaryAssembler = summaryAssembler;
    }

    public List<PostDtos.Summary> findVisibleByOrderedIds(List<Long> orderedIds) {
        return findVisibleByOrderedIds(orderedIds, null);
    }

    public List<PostDtos.Summary> findVisibleByOrderedIds(
            List<Long> orderedIds, Long viewerId) {
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
        return summaryAssembler.summaries(ordered, viewerId);
    }

    private boolean isVisible(JourneyPost post) {
        return post.isPublished()
                && post.isModerationVisible()
                && post.getAuthor() != null
                && post.getAuthor().isActive();
    }
}
