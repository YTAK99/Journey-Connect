package com.jc.backend.intelligence.contentanalysis.persistence;

import com.jc.backend.intelligence.contentanalysis.AnalysisStatus;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisJob;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisJobStore;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class JdbcPostContentAnalysisJobStore implements PostContentAnalysisJobStore {

    private final JdbcTemplate jdbcTemplate;

    public JdbcPostContentAnalysisJobStore(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PostContentAnalysisJob> findByDedupeKey(
            long postId,
            String sourceContentVersion,
            String schemaVersion,
            String promptVersion) {
        return jdbcTemplate.query(
                        """
                        select *
                        from public.post_content_analysis_job
                        where post_id = ?
                          and source_content_version = ?
                          and schema_version = ?
                          and prompt_version = ?
                        """,
                        this::map,
                        postId,
                        sourceContentVersion,
                        schemaVersion,
                        promptVersion)
                .stream()
                .findFirst();
    }

    @Override
    @Transactional
    public PostContentAnalysisJob saveIfAbsent(PostContentAnalysisJob job) {
        jdbcTemplate.update(
                """
                insert into public.post_content_analysis_job (
                    analysis_run_id, post_id, source_content_version, schema_version,
                    prompt_version, status, attempt_count, next_attempt_at,
                    last_error_code, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict on constraint post_content_analysis_job_dedupe_key do nothing
                """,
                job.analysisRunId(),
                job.postId(),
                job.sourceContentVersion(),
                job.schemaVersion(),
                job.promptVersion(),
                job.status().wireValue(),
                job.attemptCount(),
                timestamp(job.nextAttemptAt()),
                job.lastErrorCode(),
                Timestamp.from(job.createdAt()),
                Timestamp.from(job.updatedAt()));

        return findByDedupeKey(
                        job.postId(),
                        job.sourceContentVersion(),
                        job.schemaVersion(),
                        job.promptVersion())
                .orElseThrow(() -> new IllegalStateException(
                        "Content Analysis job insert did not produce a dedupe row"));
    }

    @Override
    @Transactional
    public PostContentAnalysisJob save(PostContentAnalysisJob job) {
        PostContentAnalysisJob current = findForUpdate(job.analysisRunId())
                .orElseThrow(() -> new IllegalStateException(
                        "Content Analysis job is unavailable: " + job.analysisRunId()));

        requireSameIdentity(current, job);
        if (current.status() == AnalysisStatus.RUNNING && job.status() != AnalysisStatus.RUNNING) {
            appendAttempt(current, job);
        }

        int updated = jdbcTemplate.update(
                """
                update public.post_content_analysis_job
                set status = ?,
                    attempt_count = ?,
                    next_attempt_at = ?,
                    last_error_code = ?,
                    updated_at = ?
                where analysis_run_id = ?
                """,
                job.status().wireValue(),
                job.attemptCount(),
                timestamp(job.nextAttemptAt()),
                job.lastErrorCode(),
                Timestamp.from(job.updatedAt()),
                job.analysisRunId());
        if (updated != 1) {
            throw new IllegalStateException("Content Analysis job update affected " + updated + " rows");
        }
        return job;
    }

    @Override
    @Transactional
    public int recoverStaleRunning(Instant staleBefore, Instant retryAt, int maxAttempts) {
        if (maxAttempts <= 0) {
            throw new IllegalArgumentException("maxAttempts must be positive");
        }

        List<PostContentAnalysisJob> stale = jdbcTemplate.query(
                """
                select *
                from public.post_content_analysis_job
                where status = 'running'
                  and updated_at <= ?
                order by updated_at, analysis_run_id
                limit 100
                for update skip locked
                """,
                this::map,
                Timestamp.from(staleBefore));

        for (PostContentAnalysisJob running : stale) {
            PostContentAnalysisJob recovered = running.attemptCount() >= maxAttempts
                    ? running.markFailed("worker_lease_expired", retryAt)
                    : running.scheduleRetry(retryAt, "worker_lease_expired", retryAt);
            save(recovered);
        }
        return stale.size();
    }

    @Override
    @Transactional
    public Optional<PostContentAnalysisJob> claimNextReady(Instant now) {
        List<PostContentAnalysisJob> rows = jdbcTemplate.query(
                """
                with candidate as (
                    select analysis_run_id
                    from public.post_content_analysis_job
                    where status = 'queued'
                      and next_attempt_at <= ?
                    order by next_attempt_at, created_at, analysis_run_id
                    for update skip locked
                    limit 1
                )
                update public.post_content_analysis_job job
                set status = 'running',
                    attempt_count = job.attempt_count + 1,
                    next_attempt_at = null,
                    last_error_code = null,
                    updated_at = ?
                from candidate
                where job.analysis_run_id = candidate.analysis_run_id
                returning job.*
                """,
                this::map,
                Timestamp.from(now),
                Timestamp.from(now));
        return rows.stream().findFirst();
    }

    private Optional<PostContentAnalysisJob> findForUpdate(String runId) {
        return jdbcTemplate.query(
                        """
                        select *
                        from public.post_content_analysis_job
                        where analysis_run_id = ?
                        for update
                        """,
                        this::map,
                        runId)
                .stream()
                .findFirst();
    }

    private void appendAttempt(
            PostContentAnalysisJob running,
            PostContentAnalysisJob terminalOrRetry) {
        String outcome = switch (terminalOrRetry.status()) {
            case QUEUED -> "retry";
            case SUCCEEDED -> "succeeded";
            case FAILED -> "failed";
            case QUARANTINED -> "quarantined";
            case RUNNING -> throw new IllegalStateException("running attempt cannot close as running");
        };
        jdbcTemplate.update(
                """
                insert into public.post_content_analysis_attempt (
                    analysis_run_id, attempt_number, outcome, error_code,
                    started_at, completed_at
                ) values (?, ?, ?, ?, ?, ?)
                """,
                running.analysisRunId(),
                running.attemptCount(),
                outcome,
                terminalOrRetry.lastErrorCode(),
                Timestamp.from(running.updatedAt()),
                Timestamp.from(terminalOrRetry.updatedAt()));
    }

    private static void requireSameIdentity(
            PostContentAnalysisJob current,
            PostContentAnalysisJob update) {
        boolean same = current.analysisRunId().equals(update.analysisRunId())
                && current.postId() == update.postId()
                && current.sourceContentVersion().equals(update.sourceContentVersion())
                && current.schemaVersion().equals(update.schemaVersion())
                && current.promptVersion().equals(update.promptVersion())
                && current.createdAt().equals(update.createdAt());
        if (!same) {
            throw new IllegalArgumentException("Content Analysis job immutable identity changed");
        }
    }

    private PostContentAnalysisJob map(ResultSet rs, int rowNum) throws SQLException {
        return new PostContentAnalysisJob(
                rs.getString("analysis_run_id"),
                rs.getLong("post_id"),
                rs.getString("source_content_version"),
                rs.getString("schema_version"),
                rs.getString("prompt_version"),
                AnalysisStatus.fromWireValue(rs.getString("status")),
                rs.getInt("attempt_count"),
                instant(rs.getTimestamp("next_attempt_at")),
                rs.getString("last_error_code"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
