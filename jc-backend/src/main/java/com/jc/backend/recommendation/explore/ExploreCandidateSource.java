package com.jc.backend.recommendation.explore;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class ExploreCandidateSource {

    static final String FIND_CANDIDATES = """
            with eligible as (
              select p.id,
                     p.author_id,
                     lower(r.code) as region_code,
                     p.created_at,
                     p.view_count
              from public.journey_post p
              join public.user_account author on author.id = p.author_id
              join public.region r on r.id = p.region_id
              where p.published = true
                and p.moderation_status = 'visible'
                and author.account_status = 'active'
                and p.created_at <= ?
                and (
                      ? = ''
                      or lower(r.code) = lower(?)
                      or lower(coalesce(p.region_name, '')) = lower(?)
                      or lower(coalesce(r.search_text, '')) like lower(concat('%', ?, '%'))
                      or (? <> '' and r.country_code = ?)
                )
            ),
            likes as (
              select post_id, count(*) as count
              from public.post_like
              where post_id in (select id from eligible)
              group by post_id
            ),
            bookmarks as (
              select post_id, count(*) as count
              from public.bookmark
              where post_id in (select id from eligible)
              group by post_id
            ),
            comments as (
              select post_id, count(*) as count
              from public.post_comment
              where post_id in (select id from eligible)
              group by post_id
            ),
            enriched as (
              select e.id,
                     e.author_id,
                     e.region_code,
                     e.created_at,
                     e.view_count,
                     coalesce(l.count, 0) as like_count,
                     coalesce(b.count, 0) as bookmark_count,
                     coalesce(c.count, 0) as comment_count
              from eligible e
              left join likes l on l.post_id = e.id
              left join bookmarks b on b.post_id = e.id
              left join comments c on c.post_id = e.id
            ),
            recent_slice as (
              select id
              from enriched
              order by created_at desc, id desc
              limit ?
            ),
            quality_slice as (
              select id
              from enriched
              order by bookmark_count desc,
                       like_count desc,
                       comment_count desc,
                       view_count desc,
                       created_at desc,
                       id desc
              limit ?
            ),
            selected as (
              select id from recent_slice
              union
              select id from quality_slice
            )
            select e.id,
                   e.author_id,
                   e.region_code,
                   e.created_at,
                   e.view_count,
                   e.like_count,
                   e.bookmark_count,
                   e.comment_count
            from enriched e
            join selected s on s.id = e.id
            order by e.created_at desc, e.id desc
            """;

    private static final String FIND_TAGS_PREFIX = """
            select pt.post_id, t.normalized_name
            from public.post_tag pt
            join public.tag t on t.id = pt.tag_id
            where pt.post_id in (
            """;

    private static final String FIND_TAGS_SUFFIX = """
            )
            order by pt.post_id, pt.sort_order, t.normalized_name
            """;

    private final JdbcTemplate jdbcTemplate;

    public ExploreCandidateSource(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ExploreCandidateRow> findCandidates(ExploreCandidateQuery query) {
        String region = query.regionSqlValue();
        String countryCode = query.regionCountryCodeSqlValue();
        List<BaseCandidateRow> baseRows = jdbcTemplate.query(
                FIND_CANDIDATES,
                (resultSet, rowNumber) -> mapBase(resultSet),
                Timestamp.from(query.referenceTime()),
                region,
                region,
                region,
                region,
                countryCode,
                countryCode,
                query.recentLimit(),
                query.qualityLimit());
        if (baseRows.isEmpty()) {
            return List.of();
        }

        Map<Long, List<String>> tagsByPost = findTags(baseRows);
        return baseRows.stream()
                .map(row -> row.toCandidate(tagsByPost.getOrDefault(row.postId(), List.of())))
                .toList();
    }

    private Map<Long, List<String>> findTags(List<BaseCandidateRow> candidates) {
        List<Long> postIds = candidates.stream().map(BaseCandidateRow::postId).toList();
        String placeholders = String.join(",", Collections.nCopies(postIds.size(), "?"));
        String sql = FIND_TAGS_PREFIX + placeholders + FIND_TAGS_SUFFIX;
        List<TagRow> tagRows = jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) -> new TagRow(
                        resultSet.getLong("post_id"),
                        resultSet.getString("normalized_name")),
                postIds.toArray());

        Map<Long, List<String>> mutable = new LinkedHashMap<>();
        for (TagRow tagRow : tagRows) {
            if (tagRow.tagSlug() == null || tagRow.tagSlug().isBlank()) {
                continue;
            }
            mutable.computeIfAbsent(tagRow.postId(), ignored -> new ArrayList<>())
                    .add(tagRow.tagSlug().trim());
        }
        return mutable.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> List.copyOf(entry.getValue()),
                        (left, right) -> left,
                        LinkedHashMap::new));
    }

    private static BaseCandidateRow mapBase(ResultSet resultSet) throws SQLException {
        return new BaseCandidateRow(
                resultSet.getLong("id"),
                resultSet.getLong("author_id"),
                resultSet.getString("region_code"),
                resultSet.getTimestamp("created_at").toInstant(),
                resultSet.getLong("view_count"),
                resultSet.getLong("like_count"),
                resultSet.getLong("bookmark_count"),
                resultSet.getLong("comment_count"));
    }

    private record BaseCandidateRow(
            long postId,
            long authorId,
            String regionCode,
            java.time.Instant createdAt,
            long viewCount,
            long likeCount,
            long bookmarkCount,
            long commentCount) {

        ExploreCandidateRow toCandidate(List<String> tags) {
            return new ExploreCandidateRow(
                    postId,
                    authorId,
                    regionCode,
                    createdAt,
                    viewCount,
                    likeCount,
                    bookmarkCount,
                    commentCount,
                    tags);
        }
    }

    private record TagRow(long postId, String tagSlug) {}
}
