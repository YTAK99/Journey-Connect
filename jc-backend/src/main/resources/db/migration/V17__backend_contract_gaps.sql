-- BE-2: one-time password reset tokens. Raw tokens are never persisted.
CREATE TABLE IF NOT EXISTS password_reset_token (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_password_reset_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user
    ON password_reset_token (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires
    ON password_reset_token (expires_at);

-- BE-3: crew cards and future crew recommendation need stable cover/tag facts.
ALTER TABLE crew
    ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS crew_tag (
    crew_id BIGINT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id),
    sort_order INTEGER NOT NULL,
    CONSTRAINT pk_crew_tag PRIMARY KEY (crew_id, tag_id),
    CONSTRAINT uk_crew_tag_order UNIQUE (crew_id, sort_order),
    CONSTRAINT ck_crew_tag_sort_order CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_crew_tag_tag
    ON crew_tag (tag_id);

-- Keep Hibernate validation deterministic after the additive migration.
COMMENT ON TABLE password_reset_token IS
    'One-time password reset token hashes; raw reset tokens are never stored';
COMMENT ON TABLE crew_tag IS
    'Ordered shared tag vocabulary for crew discovery/recommendation';
