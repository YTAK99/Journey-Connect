ALTER TABLE region ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uk_region_google_place_id
    ON region (google_place_id)
    WHERE google_place_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS region_translation (
    region_id BIGINT NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (region_id, language_code),
    CONSTRAINT region_translation_language_check CHECK (language_code IN ('ko', 'en')),
    CONSTRAINT region_translation_name_check CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_region_translation_name
    ON region_translation (language_code, display_name);

INSERT INTO region (code, country_code, display_name, center)
VALUES
    ('KR-SEOUL', 'KR', 'Seoul', NULL),
    ('KR-BUSAN', 'KR', 'Busan', NULL),
    ('KR-JEJU', 'KR', 'Jeju', NULL),
    ('KR-GANGNEUNG', 'KR', 'Gangneung', NULL),
    ('JP-TOKYO', 'JP', 'Tokyo', NULL),
    ('JP-OSAKA', 'JP', 'Osaka', NULL),
    ('FR-PARIS', 'FR', 'Paris', NULL),
    ('US-NEW-YORK', 'US', 'New York', NULL),
    ('ID-BALI', 'ID', 'Bali', NULL)
ON CONFLICT (code) DO NOTHING;

WITH translations(code, language_code, display_name) AS (
    VALUES
        ('KR-SEOUL', 'ko', '서울'), ('KR-SEOUL', 'en', 'Seoul'),
        ('KR-BUSAN', 'ko', '부산'), ('KR-BUSAN', 'en', 'Busan'),
        ('KR-JEJU', 'ko', '제주'), ('KR-JEJU', 'en', 'Jeju'),
        ('KR-GANGNEUNG', 'ko', '강릉'), ('KR-GANGNEUNG', 'en', 'Gangneung'),
        ('JP-TOKYO', 'ko', '도쿄'), ('JP-TOKYO', 'en', 'Tokyo'),
        ('JP-OSAKA', 'ko', '오사카'), ('JP-OSAKA', 'en', 'Osaka'),
        ('FR-PARIS', 'ko', '파리'), ('FR-PARIS', 'en', 'Paris'),
        ('US-NEW-YORK', 'ko', '뉴욕'), ('US-NEW-YORK', 'en', 'New York'),
        ('ID-BALI', 'ko', '발리'), ('ID-BALI', 'en', 'Bali')
)
INSERT INTO region_translation (region_id, language_code, display_name)
SELECT r.id, t.language_code, t.display_name
FROM translations t
JOIN region r ON r.code = t.code
ON CONFLICT (region_id, language_code) DO UPDATE
SET display_name = EXCLUDED.display_name;
