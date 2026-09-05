# Journey Connect Synthetic DB Corpus

최종 발표/개발 검증용 대규모 synthetic corpus 생성 도구입니다.

## Schema profiles

### `team-v23` (default)

현재 팀 저장소의 Flyway V1..V23 스키마용입니다.

- repository: `YTAK99/Journey-Connect`
- branch: `develop`
- verified schema commit: `961f28bf445d0e38591ef60b15f8ac1e6a0cd768`
- Flyway: `V1..V23`
- V19: `post_place`, `post_image.place_id`
- V20: Crew notification type 확장
- V21: `crew.open_chat_url`
- V22: comment reply + `comment_reply` notification
- V23: `user_external_identity`

```bash
python tools/synthetic-db-corpus/generate.py
```

기본 출력은 `seed.sql`, `purge.sql`, `manifest.json`입니다.

### `local-pre-v19`

`post_place`가 아직 없는 오래된 로컬 PostgreSQL을 위한 호환 프로필입니다.

```powershell
.\tools\synthetic-db-corpus\generate-local.ps1
```

이 프로필은 V19 이후 테이블/컬럼을 참조하지 않습니다.

## Default corpus

- 180 users
- 1,800 journey posts
- 약 5,400 post images
- 약 1,100 route-like posts
- 120 crews
- 24 destinations
- tags / likes / bookmarks / comments long-tail

`team-v23`에서는 추가로 다음 발표 fixture를 만듭니다.

- 모든 post의 `post_place` materialization
- 일부 crew의 deterministic HTTPS `open_chat_url`
- bounded notification (`post_like`, `post_comment`, `crew_application`, `crew_approved`, `crew_rejected`)
- Content Analysis 대상으로 사용할 대표 post key 최대 48개를 manifest에 기록

`user_external_identity`는 실제 Google 로그인 계정 계약이므로 synthetic corpus가 직접 채우지 않습니다.

## Representative Content Analysis

Synthetic SQL은 게시물 생성 API를 통과하지 않으므로 Content Analysis job을 자동 생성하지 않습니다.
백엔드에는 명시적으로 켰을 때만 동작하는 bounded demo bootstrap이 있습니다.

```powershell
$env:SPRING_AI_CHAT_MODEL="google-genai"
$env:JC_AI_CONTENT_ANALYSIS_ENABLED="true"
$env:JC_AI_CONTENT_ANALYSIS_WORKER_ENABLED="true"
$env:JC_AI_CONTENT_ANALYSIS_DEMO_BOOTSTRAP_ENABLED="true"
$env:JC_AI_CONTENT_ANALYSIS_DEMO_BOOTSTRAP_LIMIT="48"

cd jc-backend
.\gradlew bootRun
```

bootstrap은 `synthetic.*@journey-connect.local` 작성자의 공개 게시물만 찾고,
지역별 최대 2개씩, 전체 최대 48개만 기존 `PostContentAnalysisJobService.enqueue(...)` 경로에 넣습니다.
분석 결과를 직접 INSERT하지 않습니다.

실제 API key는 저장소나 문서에 넣지 마십시오.

## Demo open chat

일부 synthetic crew에는 다음 형태의 비실서비스 placeholder가 들어갑니다.

```text
https://example.invalid/journey-connect-demo/<batch>/<crew>
```

`.invalid` 도메인을 사용하며 기존 Backend 접근 제어에 따라 OWNER/APPROVED 멤버에게만 노출되어야 합니다.

## Verify

```bash
python -m unittest discover -s tools/synthetic-db-corpus/tests -p 'test_*.py' -v
python tools/synthetic-db-corpus/generate.py
```

**개발 PostgreSQL 전용입니다. 운영 DB에서는 실행하지 마십시오.**
