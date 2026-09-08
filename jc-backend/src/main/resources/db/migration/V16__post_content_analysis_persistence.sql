-- Journey Connect Content Analysis persistence - SC-2 allocated Flyway V16

CREATE TABLE public.post_content_analysis_input_snapshot (
    post_id bigint NOT NULL CHECK (post_id > 0),
    source_content_version varchar(128) NOT NULL,
    title varchar(120) NOT NULL,
    content text NOT NULL,
    region_name varchar(100),
    source_tags jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, source_content_version),
    CONSTRAINT post_content_analysis_input_source_tags_array
        CHECK (jsonb_typeof(source_tags) = 'array' AND jsonb_array_length(source_tags) <= 5)
);

CREATE TABLE public.post_content_analysis_job (
    analysis_run_id varchar(128) PRIMARY KEY,
    post_id bigint NOT NULL,
    source_content_version varchar(128) NOT NULL,
    schema_version varchar(128) NOT NULL,
    prompt_version varchar(128) NOT NULL,
    status varchar(16) NOT NULL
        CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'quarantined')),
    attempt_count integer NOT NULL CHECK (attempt_count >= 0),
    next_attempt_at timestamptz,
    last_error_code varchar(128),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT post_content_analysis_job_run_id_format
        CHECK (analysis_run_id ~ '^analysis:[0-9a-fA-F-]{36}$'),
    CONSTRAINT post_content_analysis_job_queue_time
        CHECK (
            (status = 'queued' AND next_attempt_at IS NOT NULL)
            OR
            (status <> 'queued' AND next_attempt_at IS NULL)
        ),
    CONSTRAINT post_content_analysis_job_input_fk
        FOREIGN KEY (post_id, source_content_version)
        REFERENCES public.post_content_analysis_input_snapshot(post_id, source_content_version)
        ON DELETE RESTRICT,
    CONSTRAINT post_content_analysis_job_dedupe_key
        UNIQUE (post_id, source_content_version, schema_version, prompt_version)
);

CREATE INDEX post_content_analysis_job_ready_idx
    ON public.post_content_analysis_job(next_attempt_at, created_at, analysis_run_id)
    WHERE status = 'queued';

CREATE TABLE public.post_content_analysis_attempt (
    analysis_run_id varchar(128) NOT NULL
        REFERENCES public.post_content_analysis_job(analysis_run_id) ON DELETE RESTRICT,
    attempt_number integer NOT NULL CHECK (attempt_number > 0),
    outcome varchar(16) NOT NULL
        CHECK (outcome IN ('retry', 'succeeded', 'failed', 'quarantined')),
    error_code varchar(128),
    started_at timestamptz NOT NULL,
    completed_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (analysis_run_id, attempt_number),
    CONSTRAINT post_content_analysis_attempt_time_order
        CHECK (completed_at >= started_at),
    CONSTRAINT post_content_analysis_attempt_error_partition
        CHECK (
            (outcome = 'succeeded' AND error_code IS NULL)
            OR
            (outcome <> 'succeeded' AND error_code IS NOT NULL)
        )
);

CREATE TABLE public.post_content_analysis_result (
    analysis_run_id varchar(128) PRIMARY KEY
        REFERENCES public.post_content_analysis_job(analysis_run_id) ON DELETE RESTRICT,
    schema_version varchar(128) NOT NULL,
    source_content_version varchar(128) NOT NULL,
    source_language varchar(32) NOT NULL,
    model_version varchar(128) NOT NULL,
    prompt_version varchar(128) NOT NULL,
    status varchar(16) NOT NULL CHECK (status = 'succeeded'),
    summary varchar(240) NOT NULL,
    themes jsonb NOT NULL,
    travel_styles jsonb NOT NULL,
    suggested_tags jsonb NOT NULL,
    place_mentions jsonb NOT NULL,
    confidence double precision NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    created_at timestamptz NOT NULL,
    CONSTRAINT post_content_analysis_result_themes_array
        CHECK (jsonb_typeof(themes) = 'array'),
    CONSTRAINT post_content_analysis_result_styles_array
        CHECK (jsonb_typeof(travel_styles) = 'array'),
    CONSTRAINT post_content_analysis_result_tags_array
        CHECK (jsonb_typeof(suggested_tags) = 'array' AND jsonb_array_length(suggested_tags) <= 5),
    CONSTRAINT post_content_analysis_result_places_array
        CHECK (jsonb_typeof(place_mentions) = 'array' AND jsonb_array_length(place_mentions) <= 10)
);

CREATE OR REPLACE FUNCTION public.prevent_content_analysis_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'content analysis evidence is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER post_content_analysis_input_append_only
BEFORE UPDATE OR DELETE ON public.post_content_analysis_input_snapshot
FOR EACH ROW EXECUTE FUNCTION public.prevent_content_analysis_append_only_mutation();

CREATE TRIGGER post_content_analysis_attempt_append_only
BEFORE UPDATE OR DELETE ON public.post_content_analysis_attempt
FOR EACH ROW EXECUTE FUNCTION public.prevent_content_analysis_append_only_mutation();

CREATE TRIGGER post_content_analysis_result_append_only
BEFORE UPDATE OR DELETE ON public.post_content_analysis_result
FOR EACH ROW EXECUTE FUNCTION public.prevent_content_analysis_append_only_mutation();
