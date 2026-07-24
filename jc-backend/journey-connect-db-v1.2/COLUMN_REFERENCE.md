# 컬럼 설명서

## app_users

| 컬럼 | 의미 |
|---|---|
| id | 사용자 식별자 |
| email | 로그인 이메일 |
| password_hash | 해시 처리된 비밀번호 |
| username | 중복되지 않는 계정명 |
| display_name | 화면에 표시할 이름 |
| profile_image_url | 프로필 이미지 경로 |
| bio | 사용자 블로그 소개 |
| created_at | 가입 시각 |
| updated_at | 마지막 수정 시각 |

## regions

| 컬럼 | 의미 |
|---|---|
| id | 지역 식별자 |
| parent_id | 상위 지역 식별자 |
| name_local | 현지 언어 지역명 |
| name_ko | 한국어 지역명 |
| name_en | 영어 지역명 |
| slug | URL·검색용 고유 문자열 |
| region_type | 국가·도시·구역 등 지역 단계 |
| country_code | ISO 2자리 국가 코드 |
| timezone | 지역 표준 시간대 |
| sort_order | 화면 정렬 순서 |
| is_active | 검색·노출 사용 여부 |
| created_at | 생성 시각 |
| updated_at | 수정 시각 |

## places

| 컬럼 | 의미 |
|---|---|
| id | 장소 식별자 |
| region_id | 장소가 직접 속한 지역 |
| name_local | 현지 장소명 |
| name_ko | 한국어 장소명 |
| name_en | 영어 장소명 |
| normalized_name | 공백·대소문자를 정리한 검색용 이름 |
| address | 주소 |
| latitude | 위도 |
| longitude | 경도 |
| category | 카페·식당·관광지 등 분류 |
| created_by_user_id | 장소를 등록한 사용자 |
| is_active | 사용·노출 여부 |
| created_at | 생성 시각 |
| updated_at | 수정 시각 |

## posts

| 컬럼 | 의미 |
|---|---|
| id | 게시글 식별자 |
| author_id | 작성자 |
| main_region_id | 지역 피드 분류에 사용할 대표 지역 |
| title | 게시글 제목 |
| content | 게시글 본문 |
| view_count | 누적 조회수 |
| visibility | public·followers·private 공개 범위 |
| status | draft·published·hidden·deleted 상태 |
| published_at | 최초 공개 시각 |
| deleted_at | 논리 삭제 시각 |
| purge_after | 영구 삭제 예정 시각 |
| created_at | 생성 시각 |
| updated_at | 수정 시각 |

## post_images

| 컬럼 | 의미 |
|---|---|
| id | 이미지 식별자 |
| post_id | 소속 게시글 |
| image_url | 이미지 저장 경로 |
| alt_text | 접근성용 대체 설명 |
| caption | 이미지 설명 |
| sort_order | 게시글 내 표시 순서 |
| width | 이미지 너비 |
| height | 이미지 높이 |
| created_at | 생성 시각 |

## post_places

| 컬럼 | 의미 |
|---|---|
| id | 연결 식별자 |
| post_id | 게시글 |
| place_id | 게시글에 포함된 장소 |
| sort_order | 장소 표시 순서 |
| memo | 장소별 짧은 후기·팁 |
| created_at | 생성 시각 |

## tags

| 컬럼 | 의미 |
|---|---|
| id | 태그 식별자 |
| slug | 내부 고유 문자열 |
| name_ko | 한국어 태그명 |
| name_en | 영어 태그명 |
| is_active | 선택 가능 여부 |
| sort_order | 표시 순서 |
| created_at | 생성 시각 |
| updated_at | 수정 시각 |

## post_tags

| 컬럼 | 의미 |
|---|---|
| post_id | 게시글 |
| tag_id | 연결된 태그 |
| created_at | 연결 시각 |

## comments

| 컬럼 | 의미 |
|---|---|
| id | 댓글 식별자 |
| post_id | 댓글이 달린 게시글 |
| author_id | 댓글 작성자 |
| content | 댓글 내용 |
| deleted_at | 댓글 논리 삭제 시각 |
| created_at | 작성 시각 |
| updated_at | 수정 시각 |

## post_likes

| 컬럼 | 의미 |
|---|---|
| post_id | 좋아요 대상 게시글 |
| user_id | 좋아요 사용자 |
| created_at | 좋아요 시각 |

## bookmarks

| 컬럼 | 의미 |
|---|---|
| post_id | 저장한 게시글 |
| user_id | 저장한 사용자 |
| created_at | 저장 시각 |

## follows

| 컬럼 | 의미 |
|---|---|
| follower_id | 팔로우를 건 사용자 |
| following_id | 팔로우 대상 사용자 |
| created_at | 팔로우 시각 |


## 주요 제약·인덱스 보충

| 대상 | 규칙 | 목적 |
|---|---|---|
| regions.country_code | 국가 루트에서만 고유 | 같은 ISO 국가 코드의 국가 중복 생성 방지 |
| post_images(post_id, sort_order) | 고유 조합 | 게시글 내부 이미지 순서 중복 방지 |
| regions.slug | 전체 고유 | 지역 URL·검색 식별자 충돌 방지 |
| posts.main_region_id | 장소 지역의 상위 또는 동일 지역 | 지역 피드 오염 방지 |
