# Journey Connect DB v1.2

로컬 PostgreSQL과 DBeaver에서 사용하는 초기 데이터베이스 패키지입니다.

## 실행 순서

1. 빈 PostgreSQL 데이터베이스에 접속합니다.
2. `01_initial_schema.sql` 전체를 실행합니다.
3. 기본 지역·태그가 필요하면 `02_seed.sql`을 실행합니다.
4. 개발 DB에서 `03_smoke_test.sql`을 실행합니다.

`03_smoke_test.sql`은 마지막에 `ROLLBACK`하므로 테스트 데이터가 남지 않습니다.

## 기존 DB에 여행 날짜 열 추가하기

이미 예전에 `01_initial_schema.sql`을 실행한 DB는 DBeaver에서 다음 순서로 적용합니다.

1. Journey Connect 데이터베이스 연결을 엽니다.
2. `04_add_post_travel_dates.sql` 파일을 엽니다.
3. SQL 편집기에서 전체 실행합니다.
4. 오류 없이 `COMMIT`되면 완료입니다.

새 빈 DB를 만드는 경우에는 수정된 `01_initial_schema.sql`에 날짜 열이 이미 포함되어 있으므로
`04_add_post_travel_dates.sql`을 따로 실행하지 않아도 됩니다.

업로드 이미지 파일은 DB 안에 저장하지 않습니다. 서버의 `UPLOAD_DIR` 폴더에 파일을 저장하고,
`post_images.image_url`에는 이미지를 불러올 URL만 저장합니다. 따라서 DB 백업과 함께 업로드 폴더도
별도로 백업해야 합니다.

## 현재 Spring 백엔드의 태그 업데이트

실행 중인 Spring 백엔드는 이 폴더의 `posts/tags/post_tags`가 아니라
`src/main/resources/db/migration`의 `journey_post/tag/post_tag` 스키마를 사용합니다.
자유 입력 태그 기능은 `V5__post_tags.sql`과 순서 키를 맞추는 `V6__post_tag_order_key.sql`에 포함되어 있으므로 팀원은 별도 SQL을 직접 실행하지 않고
최신 코드를 받은 뒤 백엔드를 한 번 시작하면 Flyway가 자동으로 적용합니다.

확인은 DBeaver에서 다음 SQL로 할 수 있습니다.

```sql
SELECT version, description, success
FROM flyway_schema_history
WHERE version IN ('5', '6')
ORDER BY version;
```

두 행의 `success`가 모두 `true`이면 태그 DB 업데이트가 완료된 상태입니다.

## 현재 포함 범위

- 사용자 및 개인 블로그형 프로필
- 국가·도시·세부 지역 계층
- 장소
- 게시글·사진·태그
- 댓글·좋아요·북마크·팔로우
- 지역별 피드와 탐색 조회 기반
- 게시글 논리 삭제 및 1년 후 영구 삭제

## 제외 범위

AI 추천, 개인화 알고리즘, 크루, 여행 루트, 타임라인, 알림, 신고 기능은 포함하지 않았습니다.

## 주요 무결성 규칙

- 공개 게시글은 제목, 본문, 대표 지역과 장소가 필요합니다.
- 공개 게시글의 모든 장소는 대표 지역 또는 그 하위 지역에 속해야 합니다.
- 지역 계층의 순환 연결과 국가 코드 불일치를 차단합니다.
- 게시글 삭제 시 1년 뒤 영구 삭제 예정 시각을 자동 설정합니다.


## v1.2 추가 보완

- 국가 루트 지역의 `country_code` 중복을 차단했습니다.
- `post_images`의 중복 인덱스를 제거했습니다.
- Seed 재실행 시 하위 지역의 이름·타입·국가 코드·시간대·정렬 순서까지 동기화합니다.
- Smoke Test에 국가 코드 중복 차단 검증을 추가했습니다.

전체 변경 이력은 `REVIEW.md`에 누적 기록합니다.
