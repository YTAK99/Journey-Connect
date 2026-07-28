-- JPA가 태그 순서를 바꿀 때 행을 순서 기준으로 갱신하므로 기본 키도 (post_id, sort_order)로 맞춥니다.
-- 동일 태그 중복은 TagService가 저장 전에 차단합니다.
ALTER TABLE post_tag DROP CONSTRAINT IF EXISTS post_tag_pkey;
ALTER TABLE post_tag DROP CONSTRAINT IF EXISTS uk_post_tag_order;
ALTER TABLE post_tag ADD CONSTRAINT post_tag_pkey PRIMARY KEY (post_id, sort_order);
