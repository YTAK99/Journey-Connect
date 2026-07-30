-- V8 이전 Google 지역에는 상위 주소가 저장되지 않았습니다. 기본 식별자만 채워진 행은
-- 다음 게시글 수정 시 Place Details를 다시 확인해 실제 주소 계층으로 보강할 수 있게 표시합니다.
UPDATE region r
SET search_text = ''
WHERE r.google_place_id IS NOT NULL
  AND r.search_text = btrim(concat_ws(
        ' ',
        r.display_name,
        r.code,
        r.country_code,
        (
            SELECT string_agg(rt.display_name, ' ' ORDER BY rt.language_code)
            FROM region_translation rt
            WHERE rt.region_id = r.id
        )
    ));
