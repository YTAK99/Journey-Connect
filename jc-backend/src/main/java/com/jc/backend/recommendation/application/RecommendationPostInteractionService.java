package com.jc.backend.recommendation.application;

import com.jc.backend.common.DomainException;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore.Action;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore.InteractionBindingException;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore.InteractionWrite;
import com.jc.backend.recommendation.persistence.RecommendationRunStore;
import com.jc.backend.recommendation.persistence.RecommendationRunStore.DeliveryContext;
import com.jc.backend.recommendation.persistence.RecommendationStorageTypes.Surface;
import com.jc.backend.recommendation.persistence.RecommendationPostInteractionStore.Result;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Creates canonical interaction events and delegates the atomic state/event write to PostgreSQL. */
@Service
public final class RecommendationPostInteractionService {

    private static final String SCHEMA_VERSION = "recommendation-behavior-event-v1";
    private static final Pattern EVENT_ID = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$");
    private static final Pattern RUN_ID = EVENT_ID;
    private static final Duration MAX_FUTURE_SKEW = Duration.ofMinutes(5);
    private static final Duration MAX_EVENT_AGE = Duration.ofDays(30);

    private final RecommendationCanonicalPayload canonicalPayload;
    private final RecommendationPostInteractionStore interactionStore;
    private final RecommendationRunStore runStore;

    public RecommendationPostInteractionService(
            RecommendationCanonicalPayload canonicalPayload,
            RecommendationPostInteractionStore interactionStore,
            RecommendationRunStore runStore) {
        this.canonicalPayload = canonicalPayload;
        this.interactionStore = interactionStore;
        this.runStore = runStore;
    }

    public void apply(
            long userId,
            String tokenId,
            long postId,
            Action action,
            TrackingContext tracking) {
        if (userId <= 0 || postId <= 0) {
            throw badRequest("RECOMMENDATION_INTERACTION_INVALID", "사용자 또는 게시물 정보가 올바르지 않습니다.");
        }
        TrackingContext safeTracking = tracking == null ? TrackingContext.empty() : tracking;
        String runId = blankToNull(safeTracking.runId());
        if (runId != null && !RUN_ID.matcher(runId).matches()) {
            throw badRequest(
                    "RECOMMENDATION_INTERACTION_RUN_ID_INVALID",
                    "추천 실행 ID 형식이 올바르지 않습니다.");
        }
        ClientIdentity identity = resolveClientIdentity(safeTracking);
        String sessionId = RecommendationSessionIds.fromJwt(userId, tokenId);
        String surface = resolveSurface(runId, safeTracking.surface(), userId, sessionId);
        Instant occurredAt = (safeTracking.occurredAt() == null
                ? Instant.now()
                : safeTracking.occurredAt()).truncatedTo(ChronoUnit.MICROS);
        validateOccurredAt(occurredAt);
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("action", action.value());
        metadata.put("runBound", runId != null);
        metadata.put("source", "post-interaction-api");
        if (surface != null) {
            metadata.put("surface", surface);
        }

        CanonicalPostInteractionV1 canonical = new CanonicalPostInteractionV1(
                identity.eventId(),
                identity.idempotencyKey(),
                SCHEMA_VERSION,
                userId,
                sessionId,
                runId,
                action.value(),
                "post",
                "post:" + postId,
                postId,
                occurredAt.toString(),
                metadata);
        RecommendationCanonicalPayload.Encoded encoded = canonicalPayload.encode(canonical);

        try {
            Result result = interactionStore.apply(new InteractionWrite(
                    userId,
                    postId,
                    action,
                    identity.eventId(),
                    identity.idempotencyKey(),
                    SCHEMA_VERSION,
                    encoded.bytes(),
                    sessionId,
                    runId,
                    occurredAt,
                    metadata));
            if (result == Result.IDEMPOTENCY_CONFLICT) {
                throw new DomainException(
                        HttpStatus.CONFLICT,
                        "IDEMPOTENCY_CONFLICT",
                        "같은 멱등키가 다른 게시물 행동에 이미 사용되었습니다.");
            }
        } catch (InteractionBindingException exception) {
            throw new DomainException(
                    HttpStatus.FORBIDDEN,
                    "RECOMMENDATION_INTERACTION_BINDING_INVALID",
                    "추천 실행과 사용자·세션·게시물 연결이 올바르지 않습니다.");
        }
    }

    private void validateOccurredAt(Instant occurredAt) {
        Instant now = Instant.now();
        if (occurredAt.isAfter(now.plus(MAX_FUTURE_SKEW))
                || occurredAt.isBefore(now.minus(MAX_EVENT_AGE))) {
            throw badRequest(
                    "RECOMMENDATION_INTERACTION_TIME_INVALID",
                    "추천 행동 발생 시각이 허용 범위를 벗어났습니다.");
        }
    }

    private String resolveSurface(
            String runId,
            String requestedSurface,
            long userId,
            String sessionId) {
        String normalizedSurface = normalizeSurface(requestedSurface);
        if (runId == null) {
            return normalizedSurface;
        }

        DeliveryContext context;
        try {
            context = runStore.requireDeliveryContext(runId);
        } catch (RuntimeException exception) {
            throw bindingInvalid();
        }
        if (context.userId() != userId || !context.sessionId().equals(sessionId)) {
            throw bindingInvalid();
        }
        if (normalizedSurface != null && !context.surface().equals(normalizedSurface)) {
            throw bindingInvalid();
        }
        return context.surface();
    }

    private String normalizeSurface(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toLowerCase(java.util.Locale.ROOT);
        for (Surface surface : Surface.values()) {
            if (surface.value().equals(normalized)) {
                return normalized;
            }
        }
        throw badRequest(
                "RECOMMENDATION_INTERACTION_SURFACE_INVALID",
                "추천 화면 식별자가 올바르지 않습니다.");
    }

    private DomainException bindingInvalid() {
        return new DomainException(
                HttpStatus.FORBIDDEN,
                "RECOMMENDATION_INTERACTION_BINDING_INVALID",
                "추천 실행과 사용자·세션·화면 연결이 올바르지 않습니다.");
    }

    private ClientIdentity resolveClientIdentity(TrackingContext tracking) {
        String eventId = blankToNull(tracking.eventId());
        String idempotencyKey = blankToNull(tracking.idempotencyKey());
        boolean anyClientIdentity = eventId != null || idempotencyKey != null;
        if (anyClientIdentity
                && (eventId == null || idempotencyKey == null || tracking.occurredAt() == null)) {
            throw badRequest(
                    "RECOMMENDATION_INTERACTION_IDEMPOTENCY_INVALID",
                    "클라이언트 멱등 식별자를 사용할 때는 eventId·idempotencyKey·occurredAt이 모두 필요합니다.");
        }
        if (eventId == null) {
            eventId = "behavior:" + UUID.randomUUID();
            idempotencyKey = eventId;
        }
        if (!EVENT_ID.matcher(eventId).matches()) {
            throw badRequest(
                    "RECOMMENDATION_INTERACTION_EVENT_ID_INVALID",
                    "추천 행동 eventId 형식이 올바르지 않습니다.");
        }
        if (idempotencyKey.isBlank() || idempotencyKey.length() > 160) {
            throw badRequest(
                    "RECOMMENDATION_INTERACTION_IDEMPOTENCY_INVALID",
                    "추천 행동 멱등키 형식이 올바르지 않습니다.");
        }
        return new ClientIdentity(eventId, idempotencyKey);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static DomainException badRequest(String code, String message) {
        return new DomainException(HttpStatus.BAD_REQUEST, code, message);
    }

    public record TrackingContext(
            String runId,
            String surface,
            String eventId,
            String idempotencyKey,
            Instant occurredAt) {

        public TrackingContext(
                String runId,
                String eventId,
                String idempotencyKey,
                Instant occurredAt) {
            this(runId, null, eventId, idempotencyKey, occurredAt);
        }

        public static TrackingContext empty() {
            return new TrackingContext(null, null, null, null, null);
        }
    }

    private record ClientIdentity(String eventId, String idempotencyKey) {
    }

    private record CanonicalPostInteractionV1(
            String eventId,
            String idempotencyKey,
            String schemaVersion,
            long userId,
            String sessionId,
            String runId,
            String eventType,
            String entityType,
            String entityKey,
            long sourceEntityId,
            String occurredAt,
            Map<String, Object> metadata) {
        private CanonicalPostInteractionV1 {
            metadata = Map.copyOf(new LinkedHashMap<>(metadata));
        }
    }
}
