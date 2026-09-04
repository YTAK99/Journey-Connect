package com.jc.backend.crew;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** 추천에 실제로 노출 가능한 크루 후보와 점수 계산용 feature를 일괄 조회합니다. */
@Repository
@Transactional(readOnly = true)
public class CrewRecommendationCandidateSource {

    private final JdbcTemplate jdbcTemplate;

    public CrewRecommendationCandidateSource(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Candidate> findEligible(long viewerId, LocalDate today, int limit) {
        List<Candidate> candidates = jdbcTemplate.query(
                """
                select c.id,
                       c.title,
                       r.code as region_code,
                       c.region_name,
                       c.description,
                       c.cover_image_url,
                       c.travel_date,
                       c.capacity,
                       c.approval_required,
                       c.owner_id,
                       owner_user.nickname as owner_nickname,
                       c.created_at,
                       viewer.status as viewer_status,
                       (select count(*)
                          from crew_member active_member
                         where active_member.crew_id = c.id
                           and active_member.status in ('OWNER', 'APPROVED')) as member_count,
                       (select count(*)
                          from crew_member pending_member
                         where pending_member.crew_id = c.id
                           and pending_member.status = 'PENDING') as pending_count
                  from crew c
                  join region r on r.id = c.region_id
                  join user_account owner_user on owner_user.id = c.owner_id
                  left join crew_member viewer
                    on viewer.crew_id = c.id
                   and viewer.user_id = ?
                 where c.recruiting = true
                   and owner_user.account_status = 'active'
                   and (viewer.id is null or viewer.status in ('CANCELLED', 'REJECTED'))
                   and (select count(*)
                          from crew_member active_member
                         where active_member.crew_id = c.id
                           and active_member.status in ('OWNER', 'APPROVED')) < c.capacity
                 order by c.created_at desc, c.id desc
                 limit ?
                """,
                (resultSet, rowNumber) -> new Candidate(
                        resultSet.getLong("id"),
                        resultSet.getString("title"),
                        resultSet.getString("region_code"),
                        resultSet.getString("region_name"),
                        resultSet.getString("description"),
                        resultSet.getString("cover_image_url"),
                        nullableDate(resultSet.getDate("travel_date")),
                        resultSet.getInt("capacity"),
                        resultSet.getLong("member_count"),
                        resultSet.getLong("pending_count"),
                        resultSet.getBoolean("approval_required"),
                        resultSet.getLong("owner_id"),
                        resultSet.getString("owner_nickname"),
                        resultSet.getTimestamp("created_at").toLocalDateTime(),
                        nullableStatus(resultSet.getString("viewer_status")),
                        List.of()),
                viewerId,
                limit);

        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<Long, List<TagValue>> tagsByCrewId = tagsByCrewId(
                candidates.stream().map(Candidate::id).toList());
        return candidates.stream()
                .map(candidate -> candidate.withTags(tagsByCrewId.getOrDefault(candidate.id(), List.of())))
                .toList();
    }

    private Map<Long, List<TagValue>> tagsByCrewId(List<Long> crewIds) {
        String placeholders = String.join(",", java.util.Collections.nCopies(crewIds.size(), "?"));
        String sql = """
                select ct.crew_id, t.name, t.normalized_name
                  from crew_tag ct
                  join tag t on t.id = ct.tag_id
                 where ct.crew_id in (%s)
                 order by ct.crew_id, ct.sort_order, t.normalized_name
                """.formatted(placeholders);

        List<TagRow> rows = jdbcTemplate.query(
                sql,
                preparedStatement -> {
                    for (int index = 0; index < crewIds.size(); index++) {
                        preparedStatement.setLong(index + 1, crewIds.get(index));
                    }
                },
                (resultSet, rowNumber) -> new TagRow(
                        resultSet.getLong("crew_id"),
                        new TagValue(
                                resultSet.getString("name"),
                                resultSet.getString("normalized_name"))));

        Map<Long, List<TagValue>> mutable = new LinkedHashMap<>();
        for (TagRow row : rows) {
            mutable.computeIfAbsent(row.crewId(), ignored -> new ArrayList<>()).add(row.tag());
        }
        Map<Long, List<TagValue>> result = new LinkedHashMap<>();
        mutable.forEach((crewId, tags) -> result.put(crewId, List.copyOf(tags)));
        return Map.copyOf(result);
    }

    private static LocalDate nullableDate(Date value) {
        return value == null ? null : value.toLocalDate();
    }

    private static CrewMemberStatus nullableStatus(String value) {
        return value == null ? null : CrewMemberStatus.valueOf(value);
    }

    private record TagRow(long crewId, TagValue tag) {}

    public record TagValue(String name, String normalizedName) {}

    public record Candidate(
            long id,
            String title,
            String regionCode,
            String regionName,
            String description,
            String coverImageUrl,
            LocalDate travelDate,
            int capacity,
            long memberCount,
            long pendingApplicationCount,
            boolean approvalRequired,
            long ownerId,
            String ownerNickname,
            LocalDateTime createdAt,
            CrewMemberStatus viewerStatus,
            List<TagValue> tags) {

        public Candidate {
            tags = List.copyOf(tags);
        }

        Candidate withTags(List<TagValue> replacement) {
            return new Candidate(
                    id,
                    title,
                    regionCode,
                    regionName,
                    description,
                    coverImageUrl,
                    travelDate,
                    capacity,
                    memberCount,
                    pendingApplicationCount,
                    approvalRequired,
                    ownerId,
                    ownerNickname,
                    createdAt,
                    viewerStatus,
                    replacement);
        }
    }
}
