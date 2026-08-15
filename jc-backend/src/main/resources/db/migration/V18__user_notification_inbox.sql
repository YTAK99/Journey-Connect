CREATE TABLE user_notification (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    actor_id BIGINT REFERENCES user_account(id) ON DELETE SET NULL,
    type VARCHAR(40) NOT NULL
        CHECK (type IN ('post_like', 'post_comment', 'report_resolved', 'report_rejected')),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post')),
    target_id BIGINT NOT NULL,
    dedupe_key VARCHAR(190) NOT NULL UNIQUE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_notification_recipient_created
    ON user_notification(recipient_id, created_at DESC, id DESC);

CREATE INDEX idx_user_notification_recipient_unread
    ON user_notification(recipient_id, created_at DESC, id DESC)
    WHERE read_at IS NULL;
