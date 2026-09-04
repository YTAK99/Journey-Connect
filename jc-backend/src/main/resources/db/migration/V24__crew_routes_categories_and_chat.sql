ALTER TABLE crew
    ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'OTHER',
    ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;

ALTER TABLE crew_member
    ADD COLUMN IF NOT EXISTS application_message VARCHAR(500);

CREATE TABLE IF NOT EXISTS crew_route (
    crew_id BIGINT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES journey_post(id),
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (crew_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_crew_route_order ON crew_route (crew_id, sort_order);

CREATE TABLE IF NOT EXISTS crew_chat_message (
    id BIGSERIAL PRIMARY KEY,
    crew_id BIGINT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES user_account(id),
    message_type VARCHAR(20) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crew_chat_message_cursor
    ON crew_chat_message (crew_id, id DESC);
