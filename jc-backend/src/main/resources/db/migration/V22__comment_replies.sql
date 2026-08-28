ALTER TABLE post_comment
    ADD COLUMN parent_comment_id BIGINT;

ALTER TABLE post_comment
    ADD CONSTRAINT fk_post_comment_parent
    FOREIGN KEY (parent_comment_id) REFERENCES post_comment(id) ON DELETE CASCADE;

ALTER TABLE post_comment
    ADD CONSTRAINT ck_post_comment_not_self
    CHECK (parent_comment_id IS NULL OR parent_comment_id <> id);

CREATE INDEX idx_comment_parent
    ON post_comment(parent_comment_id);

ALTER TABLE user_notification
    DROP CONSTRAINT IF EXISTS user_notification_type_check;

ALTER TABLE user_notification
    ADD CONSTRAINT user_notification_type_check
    CHECK (type IN (
        'post_like',
        'post_comment',
        'comment_reply',
        'report_resolved',
        'report_rejected',
        'crew_application',
        'crew_approved',
        'crew_rejected'
    ));
