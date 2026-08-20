package com.jc.backend.recommendation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.jc.backend.common.DomainException;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore.Action;
import com.jc.backend.recommendation.persistence.RecommendationRunStore;
import com.jc.backend.recommendation.persistence.RecommendationRunStore.DeliveryContext;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecommendationPostInteractionSurfaceTest {

    @Mock private RecommendationCanonicalPayload canonicalPayload;
    @Mock private RecommendationPostInteractionStore interactionStore;
    @Mock private RecommendationRunStore runStore;

    private RecommendationPostInteractionService service;

    @BeforeEach
    void setUp() {
        service = new RecommendationPostInteractionService(
                canonicalPayload,
                interactionStore,
                runStore);
    }

    @Test
    void runBoundInteractionRejectsSurfaceMismatch() {
        when(runStore.requireDeliveryContext("run-1"))
                .thenReturn(context(7L, "token-1", "home"));

        assertThatThrownBy(() -> service.apply(
                7L,
                "token-1",
                10L,
                Action.LIKE,
                new RecommendationPostInteractionService.TrackingContext(
                        "run-1", "search", null, null, null)))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode())
                                .isEqualTo("RECOMMENDATION_INTERACTION_BINDING_INVALID"));

        verifyNoInteractions(canonicalPayload, interactionStore);
    }

    @Test
    void runBoundInteractionRejectsAnotherUserRun() {
        when(runStore.requireDeliveryContext("run-2"))
                .thenReturn(context(8L, "token-2", "home"));

        assertThatThrownBy(() -> service.apply(
                7L,
                "token-1",
                10L,
                Action.SAVE,
                new RecommendationPostInteractionService.TrackingContext(
                        "run-2", "home", null, null, null)))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode())
                                .isEqualTo("RECOMMENDATION_INTERACTION_BINDING_INVALID"));

        verifyNoInteractions(canonicalPayload, interactionStore);
    }

    private DeliveryContext context(long userId, String sessionId, String surface) {
        return new DeliveryContext(
                "run-ignored",
                "canary",
                "succeeded",
                userId,
                sessionId,
                "ctx",
                surface,
                Instant.parse("2026-08-14T00:00:00Z"),
                1);
    }
}
