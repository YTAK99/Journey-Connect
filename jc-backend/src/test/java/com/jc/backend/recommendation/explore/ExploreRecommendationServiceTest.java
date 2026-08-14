package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jc.backend.common.DomainException;
import com.jc.backend.common.PageResponse;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostService;
import com.jc.backend.region.RegionService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

class ExploreRecommendationServiceTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef";

    @Test
    void legacyModeServesLegacyWithoutRunningDiscoveryRanking() {
        ExploreCandidateSource candidateSource = mock(ExploreCandidateSource.class);
        PostService postService = mock(PostService.class);
        RegionService regionService = mock(RegionService.class);
        ExploreRecommendationService service = service(
                candidateSource, postService, regionService, ExploreRolloutMode.LEGACY);
        when(postService.explore(eq(""), eq("서울"), any(Pageable.class))).thenReturn(
                new PageResponse<>(List.of(summary(99L)), 0, 20, 1, 1, true));

        var response = service.discovery(null, "서울", 20, null);

        assertThat(response.items()).extracting(PostDtos.Summary::id).containsExactly(99L);
        assertThat(response.hasNext()).isFalse();
        assertThat(response.nextCursor()).isNull();
        verify(candidateSource, never()).findCandidates(any());
    }

    @Test
    void shadowModeServesLegacyWhileEvaluatingDiscoveryRanking() {
        ExploreCandidateSource candidateSource = mock(ExploreCandidateSource.class);
        PostService postService = mock(PostService.class);
        RegionService regionService = mock(RegionService.class);
        ExploreRecommendationService service = service(
                candidateSource, postService, regionService, ExploreRolloutMode.SHADOW);
        when(postService.explore(eq(""), eq(null), any(Pageable.class))).thenReturn(
                new PageResponse<>(List.of(summary(99L)), 0, 20, 1, 1, true));
        when(regionService.countryCodeForSearch(null)).thenReturn("");
        when(candidateSource.findCandidates(any())).thenReturn(List.of(
                candidate(1L, 10L, 1L, 0L),
                candidate(2L, 20L, 0L, 1L)));
        when(postService.visibleSummariesByIds(anyList())).thenAnswer(invocation ->
                ((List<Long>) invocation.getArgument(0)).stream()
                        .map(ExploreRecommendationServiceTest::summary)
                        .toList());

        var response = service.discovery(null, null, 20, null);

        assertThat(response.items()).extracting(PostDtos.Summary::id).containsExactly(99L);
        assertThat(response.hasNext()).isFalse();
        assertThat(response.nextCursor()).isNull();
        verify(candidateSource).findCandidates(any());
    }

    @Test
    void anonymousFirstPageUsesDiscoveryRankingAndReturnsCursorInActiveMode() {
        ExploreCandidateSource candidateSource = mock(ExploreCandidateSource.class);
        PostService postService = mock(PostService.class);
        RegionService regionService = mock(RegionService.class);
        ExploreRecommendationService service = service(
                candidateSource, postService, regionService, ExploreRolloutMode.ACTIVE);

        when(regionService.countryCodeForSearch("서울")).thenReturn("KR");
        when(candidateSource.findCandidates(any())).thenReturn(List.of(
                candidate(1L, 10L, 1L, 0L),
                candidate(2L, 20L, 0L, 1L),
                candidate(3L, 30L, 0L, 0L)));
        when(postService.visibleSummariesByIds(anyList())).thenAnswer(invocation ->
                ((List<Long>) invocation.getArgument(0)).stream().map(ExploreRecommendationServiceTest::summary).toList());

        var response = service.discovery(null, "서울", 2, null);

        assertThat(response.items()).hasSize(2);
        assertThat(response.hasNext()).isTrue();
        assertThat(response.nextCursor()).isNotBlank();
        verify(postService, never()).explore(any(), any(), any(Pageable.class));
    }

    @Test
    void activeFirstPageRankingFailureFailsOpenToLegacyRecencyOnly() {
        ExploreCandidateSource candidateSource = mock(ExploreCandidateSource.class);
        PostService postService = mock(PostService.class);
        RegionService regionService = mock(RegionService.class);
        ExploreRecommendationService service = service(
                candidateSource, postService, regionService, ExploreRolloutMode.ACTIVE);

        when(regionService.countryCodeForSearch(null)).thenReturn("");
        when(candidateSource.findCandidates(any())).thenThrow(new IllegalStateException("ranking unavailable"));
        when(postService.explore(eq(""), eq(null), any(Pageable.class))).thenReturn(
                new PageResponse<>(List.of(summary(99L)), 0, 20, 1, 1, true));

        var response = service.discovery(null, null, 20, null);

        assertThat(response.items()).extracting(PostDtos.Summary::id).containsExactly(99L);
        assertThat(response.hasNext()).isFalse();
        assertThat(response.nextCursor()).isNull();
    }

    @Test
    void continuationFilterMismatchFailsClosedWithoutLegacyMixingInActiveMode() {
        ExploreCandidateSource candidateSource = mock(ExploreCandidateSource.class);
        PostService postService = mock(PostService.class);
        RegionService regionService = mock(RegionService.class);
        ExploreRecommendationService service = service(
                candidateSource, postService, regionService, ExploreRolloutMode.ACTIVE);

        when(regionService.countryCodeForSearch("서울")).thenReturn("KR");
        when(candidateSource.findCandidates(any())).thenReturn(List.of(
                candidate(1L, 10L, 1L, 0L),
                candidate(2L, 20L, 0L, 1L),
                candidate(3L, 30L, 0L, 0L)));
        when(postService.visibleSummariesByIds(anyList())).thenAnswer(invocation ->
                ((List<Long>) invocation.getArgument(0)).stream().map(ExploreRecommendationServiceTest::summary).toList());

        var first = service.discovery(null, "서울", 1, 7L);

        assertThatThrownBy(() -> service.discovery(first.nextCursor(), "부산", 1, 7L))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("EXPLORE_CURSOR_FILTER_MISMATCH"));
        verify(postService, never()).explore(any(), any(), any(Pageable.class));
    }

    @Test
    void nonActiveModeRejectsExistingCursorInsteadOfMixingLegacyOrdering() {
        ExploreCandidateSource candidateSource = mock(ExploreCandidateSource.class);
        PostService postService = mock(PostService.class);
        RegionService regionService = mock(RegionService.class);
        ExploreRecommendationService service = service(
                candidateSource, postService, regionService, ExploreRolloutMode.LEGACY);

        assertThatThrownBy(() -> service.discovery("old-active-cursor", null, 20, null))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("EXPLORE_CURSOR_MODE_MISMATCH"));
        verify(postService, never()).explore(any(), any(), any(Pageable.class));
        verify(candidateSource, never()).findCandidates(any());
    }

    private static ExploreRecommendationService service(
            ExploreCandidateSource candidateSource,
            PostService postService,
            RegionService regionService,
            ExploreRolloutMode mode) {
        return new ExploreRecommendationService(
                candidateSource,
                postService,
                regionService,
                SECRET,
                mode.name());
    }

    private static ExploreCandidateRow candidate(long id, long author, long likes, long bookmarks) {
        return new ExploreCandidateRow(
                id,
                author,
                "kr-11",
                Instant.now().minusSeconds(id * 60),
                0,
                likes,
                bookmarks,
                0,
                List.of("cafe"));
    }

    private static PostDtos.Summary summary(long id) {
        return new PostDtos.Summary(
                id,
                "post-" + id,
                "KR-11",
                null,
                "서울",
                Map.of(),
                "서울",
                null,
                List.of("cafe"),
                0,
                0,
                0,
                new PostDtos.Author(1L, "author", null),
                LocalDateTime.of(2026, 8, 14, 9, 0));
    }
}
