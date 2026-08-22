package com.jc.backend.crew;

import com.jc.backend.recommendation.application.RecommendationCanonicalPayload;
import com.jc.backend.recommendation.persistence.RecommendationBehaviorStore;
import com.jc.backend.recommendation.persistence.RecommendationBehaviorStore.BehaviorEventType;
import com.jc.backend.recommendation.persistence.RecommendationBehaviorStore.BehaviorWrite;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** 실제 APPROVED 전환만 크루 추천의 positive feedback으로 기록합니다. */
@Service
public class CrewRecommendationFeedbackService {

    private static final String SCHEMA_VERSION = "crew-recommendation-feedback-v1";
    private static final String POLICY_VERSION = "crew-join-positive-only-v1";

    private final RecommendationCanonicalPayload canonicalPayload;
    private final RecommendationBehaviorStore behaviorStore;
    private final JdbcTemplate jdbcTemplate;

    public CrewRecommendationFeedbackService(
            RecommendationCanonicalPayload canonicalPayload,
            RecommendationBehaviorStore behaviorStore,
            JdbcTemplate jdbcTemplate) {
        this.canonicalPayload = canonicalPayload;
        this.behaviorStore = behaviorStore;
        this.jdbcTemplate = jdbcTemplate;
    }

    public void recordApprovedJoin(long userId, long crewId) {
        if (userId <= 0 || crewId <= 0) {
            throw new IllegalArgumentException("crew recommendation feedback IDs must be positive");
        }

        String eventId = eventId(userId, crewId);
        if (eventExists(eventId)) {
            return;
        }

        String sessionId = "crew-feedback-v1:" + userId;
        Instant occurredAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
        Map<String, Object> metadata = Map.of(
                "feedbackPolicyVersion", POLICY_VERSION,
                "signal", "approved_join");
        CanonicalCrewJoinEventV1 event = new CanonicalCrewJoinEventV1(
                eventId,
                eventId,
                SCHEMA_VERSION,
                userId,
                sessionId,
                "crew_join",
                "crew",
                "crew:" + crewId,
                crewId,
                occurredAt.toString(),
                metadata);
        RecommendationCanonicalPayload.Encoded encoded = canonicalPayload.encode(event);

        behaviorStore.store(new BehaviorWrite(
                eventId,
                eventId,
                SCHEMA_VERSION,
                encoded.bytes(),
                userId,
                sessionId,
                null,
                BehaviorEventType.CREW_JOIN,
                "crew",
                crewId,
                occurredAt,
                metadata));
    }

    private boolean eventExists(String eventId) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from public.recommendation_behavior_event where event_id = ?",
                Integer.class,
                eventId);
        return count != null && count > 0;
    }

    private static String eventId(long userId, long crewId) {
        return "crew-join-v1:" + userId + ":" + crewId;
    }

    private record CanonicalCrewJoinEventV1(
            String eventId,
            String idempotencyKey,
            String schemaVersion,
            long userId,
            String sessionId,
            String eventType,
            String entityType,
            String entityKey,
            long sourceEntityId,
            String occurredAt,
            Map<String, Object> metadata) {}
}
