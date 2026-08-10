package com.jc.backend.intelligence.contentanalysis.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jc.backend.intelligence.contentanalysis.AnalysisStatus;
import com.jc.backend.intelligence.contentanalysis.ContentTheme;
import com.jc.backend.intelligence.contentanalysis.PlaceMentionCandidate;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisResultStore;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisResultV1;
import com.jc.backend.intelligence.contentanalysis.TravelStyle;
import java.sql.Timestamp;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class JdbcPostContentAnalysisResultStore implements PostContentAnalysisResultStore {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};
    private static final TypeReference<List<PlaceMentionCandidate>> PLACE_LIST = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public JdbcPostContentAnalysisResultStore(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void append(PostContentAnalysisResultV1 result) {
        int inserted = jdbcTemplate.update(
                """
                insert into public.post_content_analysis_result (
                    analysis_run_id, schema_version, source_content_version, source_language,
                    model_version, prompt_version, status, summary, themes, travel_styles,
                    suggested_tags, place_mentions, confidence, created_at
                ) values (
                    ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), cast(? as jsonb),
                    cast(? as jsonb), cast(? as jsonb), ?, ?
                )
                on conflict (analysis_run_id) do nothing
                """,
                result.analysisRunId(),
                result.schemaVersion(),
                result.sourceContentVersion(),
                result.sourceLanguage(),
                result.modelVersion(),
                result.promptVersion(),
                result.status().wireValue(),
                result.summary(),
                json(result.themes().stream().map(ContentTheme::wireValue).toList()),
                json(result.travelStyles().stream().map(TravelStyle::wireValue).toList()),
                json(result.suggestedTags()),
                json(result.placeMentions()),
                result.confidence(),
                Timestamp.from(result.createdAt()));

        if (inserted == 0) {
            PostContentAnalysisResultV1 existing = findByAnalysisRunId(result.analysisRunId())
                    .orElseThrow();
            if (!samePersistedResult(existing, result)) {
                throw new IllegalStateException(
                        "Conflicting Content Analysis result for analysisRunId "
                                + result.analysisRunId());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PostContentAnalysisResultV1> findByAnalysisRunId(String analysisRunId) {
        return jdbcTemplate.query(
                        """
                        select analysis_run_id, schema_version, source_content_version,
                               source_language, model_version, prompt_version, status, summary,
                               themes::text, travel_styles::text, suggested_tags::text,
                               place_mentions::text, confidence, created_at
                        from public.post_content_analysis_result
                        where analysis_run_id = ?
                        """,
                        (rs, rowNum) -> new PostContentAnalysisResultV1(
                                rs.getString("analysis_run_id"),
                                rs.getString("schema_version"),
                                rs.getString("source_content_version"),
                                rs.getString("source_language"),
                                rs.getString("model_version"),
                                rs.getString("prompt_version"),
                                AnalysisStatus.fromWireValue(rs.getString("status")),
                                rs.getString("summary"),
                                read(rs.getString("themes"), STRING_LIST).stream()
                                        .map(ContentTheme::fromWireValue)
                                        .toList(),
                                read(rs.getString("travel_styles"), STRING_LIST).stream()
                                        .map(TravelStyle::fromWireValue)
                                        .toList(),
                                read(rs.getString("suggested_tags"), STRING_LIST),
                                read(rs.getString("place_mentions"), PLACE_LIST),
                                rs.getDouble("confidence"),
                                rs.getTimestamp("created_at").toInstant()),
                        analysisRunId)
                .stream()
                .findFirst();
    }

    private boolean samePersistedResult(
            PostContentAnalysisResultV1 left,
            PostContentAnalysisResultV1 right) {
        return left.analysisRunId().equals(right.analysisRunId())
                && left.schemaVersion().equals(right.schemaVersion())
                && left.sourceContentVersion().equals(right.sourceContentVersion())
                && left.sourceLanguage().equals(right.sourceLanguage())
                && left.modelVersion().equals(right.modelVersion())
                && left.promptVersion().equals(right.promptVersion())
                && left.status() == right.status()
                && left.summary().equals(right.summary())
                && left.themes().equals(right.themes())
                && left.travelStyles().equals(right.travelStyles())
                && left.suggestedTags().equals(right.suggestedTags())
                && left.placeMentions().equals(right.placeMentions())
                && Double.compare(left.confidence(), right.confidence()) == 0
                && left.createdAt().truncatedTo(ChronoUnit.MICROS)
                        .equals(right.createdAt().truncatedTo(ChronoUnit.MICROS));
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
