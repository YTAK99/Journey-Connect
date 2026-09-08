package com.jc.backend.intelligence.contentanalysis.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisInputSnapshotStore;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisInputV1;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class JdbcPostContentAnalysisInputSnapshotStore
        implements PostContentAnalysisInputSnapshotStore {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public JdbcPostContentAnalysisInputSnapshotStore(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void saveIfAbsent(PostContentAnalysisInputV1 input) {
        jdbcTemplate.update(
                """
                insert into public.post_content_analysis_input_snapshot (
                    post_id, source_content_version, title, content, region_name, source_tags
                ) values (?, ?, ?, ?, ?, cast(? as jsonb))
                on conflict (post_id, source_content_version) do nothing
                """,
                input.postId(),
                input.sourceContentVersion(),
                input.title(),
                input.content(),
                input.regionName(),
                json(input.sourceTags()));

        PostContentAnalysisInputV1 persisted =
                find(input.postId(), input.sourceContentVersion()).orElseThrow();
        if (!persisted.equals(input)) {
            throw new IllegalStateException(
                    "sourceContentVersion collision: existing snapshot payload differs");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PostContentAnalysisInputV1> find(long postId, String sourceContentVersion) {
        return jdbcTemplate.query(
                        """
                        select post_id, source_content_version, title, content, region_name,
                               source_tags::text
                        from public.post_content_analysis_input_snapshot
                        where post_id = ? and source_content_version = ?
                        """,
                        (rs, rowNum) -> new PostContentAnalysisInputV1(
                                rs.getLong("post_id"),
                                rs.getString("title"),
                                rs.getString("content"),
                                rs.getString("region_name"),
                                read(rs.getString("source_tags"), STRING_LIST),
                                rs.getString("source_content_version")),
                        postId,
                        sourceContentVersion)
                .stream()
                .findFirst();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Content Analysis JSON serialization failed", exception);
        }
    }

    private <T> T read(String value, TypeReference<T> type) {
        try {
            return objectMapper.readValue(value, type);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored Content Analysis JSON is invalid", exception);
        }
    }
}
