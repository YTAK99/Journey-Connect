package com.jc.backend.post;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jc.backend.recommendation.application.RecommendationFeedService;
import com.jc.backend.recommendation.application.RecommendationPostInteractionService;
import com.jc.backend.recommendation.explore.ExploreRecommendationService;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore.Action;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore.Result;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class PostControllerLikeNotificationTest {

    @Test
    void newlyAppliedLikeNotifiesThePostAuthor() {
        PostService postService = mock(PostService.class);
        RecommendationPostInteractionService interactions =
                mock(RecommendationPostInteractionService.class);
        PostController controller = new PostController(
                postService,
                mock(RecommendationFeedService.class),
                interactions,
                mock(ExploreRecommendationService.class));
        Jwt token = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("27")
                .claim("jti", "like-event")
                .build();
        when(interactions.apply(
                eq(27L), eq("like-event"), eq(91L), eq(Action.LIKE), any()))
                .thenReturn(Result.APPLIED);

        controller.like(token, 91L, null, null, null, null, null);

        verify(postService).notifyPostLiked(27L, 91L);
    }
}
