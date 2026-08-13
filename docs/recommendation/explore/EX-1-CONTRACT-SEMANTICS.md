# EX-1 Explore Contract / Semantics

## 상태

`IMPLEMENTED / LOCAL SMOKE VERIFIED / REPOSITORY PUSH PENDING`

## 목적

Explore의 두 의도를 먼저 고정하고 이후 candidate/scoring/pagination 구현이 의미를 바꾸지 못하게 한다.

## Mode

```text
DISCOVERY
- keyword 없음
- 새로운 콘텐츠 발견이 목적
- quality + freshness + exploration + diversity

EXPLICIT_SEARCH
- keyword 있음
- 명시적 검색 의도가 authority
- recommendation/popularity가 검색 관련성을 역전하면 안 됨
```

코드 계약:

- `ExploreMode`
- `ExploreRankingPolicy`
- `ExploreRequestContext`

## Ranking version

```text
DISCOVERY       → explore-discovery-ranking-v1
EXPLICIT_SEARCH → explore-search-ranking-v1
```

mode와 ranking version은 `ExploreRequestContext` 생성 시 결속 검증한다.

## Region semantics

region이 존재하면 두 mode 모두 candidate hard filter다.

```text
Discovery + region   → 해당 region 범위 안에서 discovery ranking
Search + region      → 해당 region 범위 안에서 explicit search
region 없음          → all-region 후보
```

region hard filter가 활성화된 경우 후속 diversity 단계에서 same-region saturation penalty를 적용하지 않는다.

## API contract

기존 API는 보존한다.

```text
GET /api/v1/explore
→ Explicit Search / legacy compatible
→ PageResponse<PostDtos.Summary>
```

후속 EX-6에서 additive endpoint를 추가한다.

```text
GET /api/v1/explore/discovery
query: region?, cursor?, size?
response: CursorPageResponse<PostDtos.Summary>
```

EX-1에서는 Controller를 변경하지 않는다.

## Fallback contract

첫 discovery page에서 ranking 내부 장애가 발생하면 기존 recency Explore 결과로 fail-open할 수 있다.

continuation cursor 요청에서는 legacy page 결과를 섞지 않는다. continuation 오류는 cursor 오류로 종료하고 클라이언트가 첫 discovery page부터 재시작한다.

## Cursor invariants

후속 EX-5 cursor는 Home recommendation cursor와 별도 계약을 사용한다.

최소 결속값:

- rankingVersion
- referenceTime
- filterFingerprint
- frozen ordered post IDs 또는 그와 동등한 immutable ordering reference
- nextOffset
- expiresAt
- integrity signature
- authenticated flow에서 필요한 user binding

하나의 cursor session 안에서 score 재계산으로 순서를 바꾸지 않는다.

## Anonymous / cold start

anonymous 또는 profile이 없는 사용자는 personal relevance를 0점으로 벌주지 않는다.
해당 term을 비활성화하고 active score weight를 재정규화한다.

## 비의존 계약

EX-1 및 Explore V1은 다음에 의존하지 않는다.

- Content Analysis themes/travelStyles/suggestedTags/placeMentions/confidence
- Gemini request path
- PostGIS
- route provider
- place resolution
- 신규 DB schema
- Home P1/P2 policy selector

## 변경 파일

```text
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreMode.java
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreRankingPolicy.java
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreRequestContext.java
jc-backend/src/test/java/com/jc/backend/recommendation/explore/ExploreRequestContextTest.java
docs/recommendation/explore/EX-0-CURRENT-BASELINE-AUDIT.md
docs/recommendation/explore/EX-1-CONTRACT-SEMANTICS.md
```

## 테스트

- blank keyword → DISCOVERY
- nonblank keyword → EXPLICIT_SEARCH
- keyword/region trim
- region explicit 여부
- mode와 keyword 불변조건
- mode와 rankingVersion 불변조건

## 완료 조건

- 요청 mode가 deterministic하게 결정됨
- ranking version이 mode에 고정됨
- region hard-filter 의미가 문서화됨
- Search/Discovery API contract가 분리됨
- fallback/cursor 의미가 고정됨
- DB/Flyway/Home Recommendation production behavior 변경 없음

## 다음 단계

`EX-2 Candidate Retrieval`
