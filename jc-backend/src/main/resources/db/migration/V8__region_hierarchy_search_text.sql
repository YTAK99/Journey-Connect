-- Google 장소의 도시명뿐 아니라 주/도와 국가까지 함께 검색할 수 있도록
-- 한글·영문 주소 계층을 보관하는 검색 전용 문자열을 추가합니다.
ALTER TABLE region ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '';

UPDATE region r
SET search_text = btrim(concat_ws(
        ' ',
        r.display_name,
        r.code,
        r.country_code,
        (
            SELECT string_agg(rt.display_name, ' ' ORDER BY rt.language_code)
            FROM region_translation rt
            WHERE rt.region_id = r.id
        )
    ))
WHERE btrim(r.search_text) = '';
