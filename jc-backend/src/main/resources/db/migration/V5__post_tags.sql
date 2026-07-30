-- 사용자가 직접 입력한 태그를 게시글과 다대다로 연결합니다.
CREATE TABLE IF NOT EXISTS tag (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    normalized_name VARCHAR(20) NOT NULL,
    CONSTRAINT tag_name_not_blank_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 20),
    CONSTRAINT tag_normalized_name_not_blank_check CHECK (char_length(btrim(normalized_name)) BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_tag_normalized_name ON tag (normalized_name);

CREATE TABLE IF NOT EXISTS post_tag (
    post_id BIGINT NOT NULL REFERENCES journey_post(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id) ON DELETE RESTRICT,
    sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 4),
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT uk_post_tag_order UNIQUE (post_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_post_tag_tag_post ON post_tag (tag_id, post_id);
