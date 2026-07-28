-- 이미 01_initial_schema.sql을 실행한 기존 DB에만 한 번 실행하세요.
-- 새 빈 DB라면 수정된 01_initial_schema.sql에 포함되어 있으므로 이 파일을 실행하지 않아도 됩니다.

BEGIN;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS travel_start_date date,
  ADD COLUMN IF NOT EXISTS travel_end_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_travel_dates_check'
      AND conrelid = 'public.posts'::regclass
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_travel_dates_check CHECK (
        travel_start_date IS NULL
        OR travel_end_date IS NULL
        OR travel_end_date >= travel_start_date
      );
  END IF;
END;
$$;

COMMIT;
