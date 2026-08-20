package com.jc.backend.recommendation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** canonical 공개 정책을 통과한 posts만 사용자별 추천 후보로 읽습니다. */
@Repository
@Transactional(readOnly = true)
public class RecommendationCandidateSource {

    private static final String FIND_ELIGIBLE = """
            select p.id,
                   p.author_id,
                   lower(r.code) as region_slug,
                   'public' as visibility,
                   p.created_at,
                   p.created_at as published_at,
                   p.view_count,
                   (select count(*) from public.post_like pl where pl.post_id = p.id) as like_count,
                   (select count(*) from public.bookmark b where b.post_id = p.id) as bookmark_count,
                   (select count(*)
                      from public.recommendation_exposure_candidate ec
                      join public.recommendation_exposure_event ee
                        on ee.event_id = ec.exposure_event_id
                     where ec.source_entity_id = p.id
                       and ee.user_id = ?
                       and ee.served_at >= current_timestamp - interval '30 days'
                   ) as recent_exposure_count,
                   coalesce((
                       select string_agg(t.normalized_name, ',' order by pt.sort_order, t.normalized_name)
                       from public.post_tag pt
                       join public.tag t on t.id = pt.tag_id
                       where pt.post_id = p.id
                   ), '') as tag_slugs
            from public.journey_post p
            join public.user_account author on author.id = p.author_id
            join public.region r on r.id = p.region_id
            where p.published = true
              and p.moderation_status = 'visible'
              and author.account_status = 'active'
            order by p.created_at desc, p.id desc
            limit ?
            """;

    private final JdbcTemplate jdbcTemplate;

    public RecommendationCandidateSource(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<RecommendationCandidateRow> findEligible(long viewerId, int limit) {
        if (viewerId <= 0) {
            throw new IllegalArgumentException("viewerId must be positive");
        }
        int safeLimit = Math.min(Math.max(limit, 1), 5_000);
        return jdbcTemplate.query(FIND_ELIGIBLE, this::map, viewerId, safeLimit);
    }

    private RecommendationCandidateRow map(ResultSet resultSet, int rowNumber) throws SQLException {
        String tags = resultSet.getString("tag_slugs");
        List<String> tagSlugs = tags == null || tags.isBlank()
                ? List.of()
                : Arrays.stream(tags.split(","))
                        .map(String::trim)
                        .filter(value -> !value.isEmpty())
                        .toList();
        long recentExposureCount = resultSet.getLong("recent_exposure_count");
        return new RecommendationCandidateRow(
                resultSet.getLong("id"),
                resultSet.getLong("author_id"),
                resultSet.getString("region_slug"),
                resultSet.getString("visibility"),
                resultSet.getTimestamp("created_at").toInstant(),
                resultSet.getTimestamp("published_at").toInstant(),
                resultSet.getLong("view_count"),
                resultSet.getLong("like_count"),
                resultSet.getLong("bookmark_count"),
                (int) Math.min(recentExposureCount, Integer.MAX_VALUE),
                tagSlugs);
    }
}
