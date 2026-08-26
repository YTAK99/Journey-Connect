CREATE TABLE user_external_identity (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    email_snapshot VARCHAR(190),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_external_identity_provider_subject UNIQUE (provider, provider_subject),
    CONSTRAINT uk_external_identity_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_external_identity_user
    ON user_external_identity(user_id);
