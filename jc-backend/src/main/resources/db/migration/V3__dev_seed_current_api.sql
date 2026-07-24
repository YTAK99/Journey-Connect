-- Development seed for the current Spring API schema.
-- The older journey-connect-db-v1.2 scripts use app_users/posts/regions, while
-- the running backend reads user_account/journey_post/region.

INSERT INTO user_account (email, password_hash, nickname, bio, profile_image_url)
VALUES
    (
        'seed-traveler@journey-connect.local',
        '$2a$10$3J4R9YEgnlb.NXmdGmCjleuPEsNmnTFYmAzsr0TDwPSGnxG1XZW7a',
        'seed-traveler',
        'Journey Connect 개발용 시드 사용자입니다.',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
    )
ON CONFLICT (email) DO NOTHING;

WITH author AS (
    SELECT id FROM user_account WHERE email = 'seed-traveler@journey-connect.local'
),
tokyo AS (
    SELECT id, display_name FROM region WHERE code = 'JP-TOKYO'
),
inserted AS (
    INSERT INTO journey_post (
        author_id,
        title,
        content,
        region_name,
        region_id,
        cover_image_url,
        published
    )
    SELECT
        author.id,
        '도쿄 시부야 뒷골목 스페셜티 커피 바',
        '시부야 중심가에서 조금 벗어난 작은 스페셜티 카페입니다. 좌석은 많지 않지만 싱글오리진 커피와 조용한 분위기가 좋아 짧은 휴식 코스로 추천합니다.',
        tokyo.display_name,
        tokyo.id,
        'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=85',
        true
    FROM author, tokyo
    WHERE NOT EXISTS (
        SELECT 1 FROM journey_post WHERE title = '도쿄 시부야 뒷골목 스페셜티 커피 바'
    )
    RETURNING id
)
INSERT INTO post_image (post_id, image_url, sort_order, alt_text)
SELECT
    inserted.id,
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=85',
    0,
    '시부야 스페셜티 커피'
FROM inserted;

WITH author AS (
    SELECT id FROM user_account WHERE email = 'seed-traveler@journey-connect.local'
),
seoul AS (
    SELECT id, display_name FROM region WHERE code = 'KR-SEOUL'
),
inserted AS (
    INSERT INTO journey_post (
        author_id,
        title,
        content,
        region_name,
        region_id,
        cover_image_url,
        published
    )
    SELECT
        author.id,
        '성수동 반나절 로컬 산책 루트',
        '서울숲에서 시작해 성수 카페 거리와 편집샵을 천천히 걷는 반나절 코스입니다. 처음 방문하는 여행자도 길 찾기 쉽고 사진 찍기 좋은 지점이 많습니다.',
        seoul.display_name,
        seoul.id,
        'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1000&q=85',
        true
    FROM author, seoul
    WHERE NOT EXISTS (
        SELECT 1 FROM journey_post WHERE title = '성수동 반나절 로컬 산책 루트'
    )
    RETURNING id
)
INSERT INTO post_image (post_id, image_url, sort_order, alt_text)
SELECT
    inserted.id,
    'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1000&q=85',
    0,
    '성수동 산책 루트'
FROM inserted;

WITH owner AS (
    SELECT id FROM user_account WHERE email = 'seed-traveler@journey-connect.local'
),
tokyo AS (
    SELECT id, display_name FROM region WHERE code = 'JP-TOKYO'
)
INSERT INTO crew (
    owner_id,
    title,
    region_name,
    region_id,
    description,
    travel_date,
    capacity,
    recruiting,
    approval_required
)
SELECT
    owner.id,
    '도쿄 빈티지샵 투어 크루',
    tokyo.display_name,
    tokyo.id,
    '시모키타자와와 고엔지 빈티지샵을 함께 둘러볼 여행자를 모집합니다.',
    CURRENT_DATE + INTERVAL '14 days',
    6,
    true,
    true
FROM owner, tokyo
WHERE NOT EXISTS (
    SELECT 1 FROM crew WHERE title = '도쿄 빈티지샵 투어 크루'
);
