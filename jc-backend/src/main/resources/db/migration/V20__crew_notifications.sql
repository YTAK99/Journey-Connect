ALTER TABLE user_notification
    DROP CONSTRAINT IF EXISTS user_notification_type_check;

ALTER TABLE user_notification
    DROP CONSTRAINT IF EXISTS user_notification_target_type_check;

ALTER TABLE user_notification
    ADD CONSTRAINT user_notification_type_check
    CHECK (type IN (
        'post_like',
        'post_comment',
        'report_resolved',
        'report_rejected',
        'crew_application',
        'crew_approved',
        'crew_rejected'
    ));

ALTER TABLE user_notification
    ADD CONSTRAINT user_notification_target_type_check
    CHECK (target_type IN ('post', 'crew'));
