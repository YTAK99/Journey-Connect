package com.jc.backend.recommendation.p1;

import com.jc.recommendation.model.event.EventType;
import com.jc.recommendation.model.feature.PreferenceKind;
import com.jc.recommendation.p1.profile.BehaviorProfileEvent;
import com.jc.recommendation.p1.profile.ExplicitPreference;
import com.jc.recommendation.p1.profile.P1FeatureVocabulary;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RecommendationP1ProfileSource {
    private final JdbcTemplate jdbcTemplate;

    public RecommendationP1ProfileSource(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<ExplicitPreference> findExplicitPreferences(long userId) {
        return jdbcTemplate.query(
                """
                select feature_id, preference_kind, strength
                from public.recommendation_user_preference
                where user_id = ? and active = true
                order by feature_id
                """,
                (resultSet, rowNumber) -> new ExplicitPreference(
                        resultSet.getString("feature_id"),
                        PreferenceKind.valueOf(resultSet.getString("preference_kind")
                                .toUpperCase(Locale.ROOT)),
                        resultSet.getDouble("strength")),
                userId);
    }

    @Transactional(readOnly = true)
    public List<BehaviorProfileEvent> findBehaviorEvents(
            long userId,
            Instant fromInclusive,
            Instant toInclusive,
            int limit) {
        return jdbcTemplate.query(
                """
                with events as (
                  select b.event_id, b.event_type, b.occurred_at,
                         lower(r.code) region_slug,
                         coalesce(
                           string_agg(
                             coalesce(post_tag.normalized_name, crew_tag.normalized_name),
                             ',' order by
                               coalesce(pt.sort_order, ct.sort_order),
                               coalesce(post_tag.normalized_name, crew_tag.normalized_name)
                           ) filter (where coalesce(post_tag.normalized_name, crew_tag.normalized_name) is not null),
                           ''
                         ) tag_slugs
                  from public.recommendation_behavior_event b
                  left join public.journey_post p
                    on p.id = b.source_entity_id and b.entity_type = 'post'
                  left join public.crew c
                    on c.id = b.source_entity_id and b.entity_type = 'crew'
                  left join public.region r on r.id = coalesce(p.region_id, c.region_id)
                  left join public.post_tag pt on pt.post_id = p.id
                  left join public.tag post_tag on post_tag.id = pt.tag_id
                  left join public.crew_tag ct on ct.crew_id = c.id
                  left join public.tag crew_tag on crew_tag.id = ct.tag_id
                  where b.user_id = ?
                    and b.occurred_at >= ?
                    and b.occurred_at <= ?
                  group by b.event_id, b.event_type, b.occurred_at, r.code
                  order by b.occurred_at desc, b.event_id desc
                  limit ?
                )
                select * from events order by occurred_at, event_id
                """,
                (resultSet, rowNumber) -> new BehaviorProfileEvent(
                        resultSet.getString("event_id"),
                        EventType.valueOf(resultSet.getString("event_type").toUpperCase(Locale.ROOT)),
                        resultSet.getTimestamp("occurred_at").toInstant(),
                        features(resultSet.getString("region_slug"), resultSet.getString("tag_slugs"))),
                userId,
                Timestamp.from(fromInclusive),
                Timestamp.from(toInclusive),
                limit);
    }

    private static List<String> features(String regionSlug, String tagSlugs) {
        Set<String> result = new LinkedHashSet<>();
        String region = regionFeature(regionSlug);
        if (region != null) {
            result.add(region);
        }
        if (tagSlugs != null) {
            for (String rawTag : tagSlugs.split(",")) {
                String feature = tagFeature(rawTag.trim());
                if (feature != null && P1FeatureVocabulary.isRegistered(feature)) {
                    result.add(feature);
                }
            }
        }
        return List.copyOf(result);
    }

    private static String regionFeature(String slug) {
        if (slug == null) {
            return null;
        }
        if (slug.equals("kr-seoul") || slug.startsWith("kr-seoul-")) {
            return "region:seoul";
        }
        if (slug.equals("kr-busan") || slug.startsWith("kr-busan-")) {
            return "region:busan";
        }
        if (slug.equals("kr-jeju") || slug.startsWith("kr-jeju-")) {
            return "region:jeju";
        }
        if (slug.equals("kr-gangwon") || slug.startsWith("kr-gangwon-")) {
            return "region:gangwon";
        }
        if (slug.equals("kr-gyeongju") || slug.startsWith("kr-gyeongju-")) {
            return "region:gyeongju";
        }
        return null;
    }

    private static String tagFeature(String tag) {
        return switch (tag) {
            case "food" -> "theme:food";
            case "cafe" -> "theme:cafe";
            case "nature" -> "theme:nature";
            case "history" -> "theme:history";
            case "adventure" -> "theme:adventure";
            case "wellness" -> "theme:wellness";
            case "running" -> "activity:running";
            case "plogging" -> "activity:plogging";
            case "pilgrimage" -> "activity:pilgrimage";
            case "cycling" -> "activity:cycling";
            case "solo-travel" -> "companion:solo";
            case "couple-trip" -> "companion:couple";
            case "family-trip" -> "companion:family";
            default -> null;
        };
    }
}
