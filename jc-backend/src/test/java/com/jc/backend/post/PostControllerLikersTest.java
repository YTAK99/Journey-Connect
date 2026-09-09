package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.jc.backend.recommendation.application.RecommendationFeedService;
import com.jc.backend.recommendation.application.RecommendationPostInteractionService;
import com.jc.backend.recommendation.explore.ExploreRecommendationService;
import java.util.List;
import org.junit.jupiter.api.Test;

class PostControllerLikersTest {

    @Test
    void returnsRecentLikersFromThePostService() {
        PostService postService = mock(PostService.class);
        PostController controller = new PostController(
                postService,
                mock(RecommendationFeedService.class),
                mock(RecommendationPostInteractionService.class),
                mock(ExploreRecommendationService.class));
        var likers = List.of(new PostDtos.Author(7L, "traveler", "/profile.jpg"));
        when(postService.likers(91L)).thenReturn(likers);

        assertThat(controller.likers(91L).data()).isEqualTo(likers);
    }
}
