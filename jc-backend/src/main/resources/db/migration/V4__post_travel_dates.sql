-- 리치 텍스트 본문과 여행 기간을 분리해 날짜 검색·수정 시 본문을 훼손하지 않도록 합니다.
ALTER TABLE journey_post
    ADD COLUMN IF NOT EXISTS travel_start_date DATE,
    ADD COLUMN IF NOT EXISTS travel_end_date DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'journey_post_travel_dates_check'
    ) THEN
        ALTER TABLE journey_post
            ADD CONSTRAINT journey_post_travel_dates_check
            CHECK (
                travel_start_date IS NULL
                OR travel_end_date IS NULL
                OR travel_end_date >= travel_start_date
            );
    END IF;
END $$;
