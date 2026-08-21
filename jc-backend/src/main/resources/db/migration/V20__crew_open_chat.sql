-- 승인된 크루 멤버에게만 노출할 외부 오픈채팅 URL을 저장합니다.
ALTER TABLE crew
    ADD COLUMN IF NOT EXISTS open_chat_url VARCHAR(500);
