# Journey Connect P2 Flyway Port

## 목적

이 패키지는 `Journey-Connect-P2-Overlay(2).zip`의 추천 P0/P1/P2 기준선을 현재 `YTAK99/Journey-Connect`의 Spring/Flyway 구조에 이식하기 위한 **최소 덮어쓰기 패키지**입니다.

대상 저장소에는 아래 기준선이 이미 존재해야 합니다.

- `jc-backend/src/main/resources/db/migration/V1__...` ~ `V10__...`
- `user_account`, `journey_post`, `region`, `post_like`, `bookmark`, `post_tag`, `tag`
- Java 21

이 ZIP은 기존 `V1~V10`, 프론트엔드, 관리자, 일반 게시물 도메인 전체를 다시 포함하지 않습니다.

## 포함 범위

```text
jc-recommendation-core/
jc-backend/build.gradle.kts
jc-backend/settings.gradle.kts
jc-backend/src/main/java/com/jc/backend/common/CursorPageResponse.java
jc-backend/src/main/java/com/jc/backend/post/PostController.java
jc-backend/src/main/java/com/jc/backend/recommendation/**
jc-backend/src/main/resources/application.yml.sample
jc-backend/src/main/resources/db/migration/V11__... ~ V15__...
jc-backend/src/test/java/com/jc/backend/recommendation/application/*Test.java
```

## Flyway 재편

| 새 Flyway | 포팅 기준 | 역할 |
|---|---|---|
| `V11__recommendation_p0_storage.sql` | canonical `07` + `17` 최종 제약 | snapshot/run/candidate/exposure/behavior 저장 기반 |
| `V12__recommendation_replay_audit.sql` | canonical `19` | replay audit 증거 |
| `V13__recommendation_behavior_runtime.sql` | canonical `21` | 행동 이벤트와 좋아요·저장 원자 처리 |
| `V14__recommendation_p1_profile_policy.sql` | canonical `23` | P1 preference/profile/policy/comparison |
| `V15__recommendation_p2_evaluation_release.sql` | canonical `25` | P2 assignment/exposure/evaluation/release evidence |

포팅 과정에서 기존 canonical SQL 파일은 수정하지 않고 새 Flyway migration으로 재작성했습니다.

주요 스키마 변환:

```text
app_users   -> user_account
posts       -> journey_post
regions     -> region
post_likes  -> post_like
bookmarks   -> bookmark
post_tags   -> post_tag
tags.slug   -> tag.normalized_name
posts.main_region_id -> journey_post.region_id
```

기존 canonical DB의 별도 역할 라우팅(`jc_app`, `jc_auth`, `jc_recommendation`, `jc_security_owner`)은 현재 팀 저장소에 존재하지 않으므로 포함하지 않았습니다. 이식된 함수는 현재 애플리케이션/Flyway 계정 권한으로 실행되는 `SECURITY INVOKER` 방식입니다.

## 제외 범위

- `database/journey-connect-db-v1.9` ~ `v2.7` 누적 복사본
- 기존 canonical SQL `01..26` 원본 복사본
- smoke test SQL
- role/grant 전용 SQL
- `db/migration-v1_8`
- P0/P1/P2 보고서와 verification 결과 복사본
- Data Platform / Intelligence Platform 후속 구현
- Search, RCA, Operations, Admin 후속 단계
- 프론트엔드

## 적용 순서

저장소 루트에서 실행합니다.

```powershell
git switch back/gycha/p2-recommendation-integration
git status --short

Expand-Archive `
  .\Journey-Connect-P2-Flyway-Port.zip `
  -DestinationPath . `
  -Force

git status --short
```

이 ZIP은 파일을 삭제하지 않습니다. 위 포함 범위의 파일만 추가하거나 덮어씁니다.

## DB 적용 전 확인

DB를 백업한 뒤 기존 Flyway 이력을 확인합니다.

```sql
SELECT installed_rank, version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

현재 DB에는 먼저 `V1~V10`이 성공 상태로 존재해야 합니다. 이미 실패한 P2 수동 적용 흔적이나 동일 이름의 추천 테이블이 있다면 해당 DB에서 바로 실행하지 말고 백업 복구 또는 새 개발 DB에서 검증합니다.

## 검증 명령

```powershell
cd .\jc-backend

.\gradlew.bat clean p2Verification
.\gradlew.bat test
```

PostgreSQL을 연결한 실제 실행 검증:

```powershell
$env:FLYWAY_ENABLED="true"
$env:RECOMMENDATION_MODE="OFF"
$env:RECOMMENDATION_P1_MODE="OFF"
$env:RECOMMENDATION_P2_ASSIGNMENT_ENABLED="false"

.\gradlew.bat bootRun
```

적용 후 확인:

```sql
SELECT version, description, success
FROM flyway_schema_history
WHERE version IN ('11', '12', '13', '14', '15')
ORDER BY version;
```

다섯 행이 모두 `success = true`여야 합니다.

## 안전 기본값

- 추천 runtime 기본값: `OFF`
- P1 runtime 기본값: `OFF`
- P2 assignment 기본값: `false`
- Hibernate: `validate`
- Flyway location: `classpath:db/migration`

P2 기술 기준선 이식과 운영 승격은 별개입니다. CANARY/LIVE 및 P2 assignment는 실제 PostgreSQL 통합 검증과 운영 승인 전 활성화하지 않습니다.

## 이 패키지에서 수행한 검증

- Java 21 추천 코어 main/test 직접 컴파일
- P0 foundation/wave/golden/isolation 계약 통과
- P1 Core `17 scenarios` 통과
- P2 Core `23 scenarios` 통과
- 포팅된 backend main Java 소스를 target API stub과 함께 컴파일
- Flyway SQL의 괄호·문자열·dollar quote 균형 검사
- migration 내 미정의 `recommendation_*` 객체 참조 검사
- legacy table/role/custom DB transaction 참조 제거 검사
- ZIP 무결성과 내부 SHA-256 manifest 검사

현재 실행 환경에는 PostgreSQL과 Gradle dependency cache가 없어서 실제 Flyway 적용, Spring context 기동, 전체 backend test는 실행하지 못했습니다. 위 명령으로 대상 저장소에서 반드시 최종 검증해야 합니다.
