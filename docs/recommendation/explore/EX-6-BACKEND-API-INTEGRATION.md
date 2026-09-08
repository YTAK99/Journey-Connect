# EX-6 Backend API Integration

## Status

IMPLEMENTED / LOCALLY VERIFIED / FINAL REGRESSION VERIFIED

## Purpose

기존 `/api/v1/explore` Explicit Search와 `/api/v1/feed`를 변경하지 않고 Explore Discovery runtime을 신규 additive endpoint에 연결한다.

## Endpoint

```http
GET /api/v1/explore/discovery?region=...&cursor=...&size=20
```

Response:

```text
ApiResponse<CursorPageResponse<PostDtos.Summary>>
```

- keyword를 받지 않는다.
- region은 optional hard filter다.
- anonymous/authenticated 모두 허용한다.
- authenticated cursor는 raw user ID를 저장하지 않고 SHA-256 opaque binding으로 현재 사용자에 결속한다.
- recommendation run ID를 생성하거나 Home run identity를 재사용하지 않는다.

## V1 runtime policy

```text
recent slice       = 75
quality slice      = 75
frozen snapshot cap = 100
freshness half-life = 30 days
cursor TTL          = 30 minutes
page size max       = 100
```

EX-5에서 representative 19-digit post ID 100개의 signed cursor가 약 1.2 KiB임을 측정한 뒤 snapshot cap을 100으로 고정했다.

이 값은 `explore-discovery-ranking-v1` heuristic baseline의 runtime 구성이다. 변경 시 ranking/retrieval compatibility를 함께 검토한다.

## First page

```text
request
→ ExploreCandidateSource
→ ExploreFeatureExtractor
→ ExploreDiscoveryScorer
→ ExploreDiversityReranker
→ frozen post ID ordering
→ visibility recheck
→ CursorPageResponse
```

personal affinity는 EX-6에서 강제 조회하지 않는다. authenticated 사용자도 기존 Home P1 runtime을 실행하지 않는다.

## Continuation

```text
signed cursor decode
→ ranking/filter/user/expiry validation
→ frozen ordering 유지
→ 남은 ID를 bulk visibility recheck
→ hidden/inactive/unpublished skip
→ page 반환
```

점수와 diversity는 continuation에서 다시 계산하지 않는다.

## Visibility / N+1

`PostService.visibleSummariesByIds()`는 frozen ID를 한 번에 조회한 뒤 기존 Summary 변환과 bulk like/bookmark count를 재사용한다.

따라서 `ExploreSnapshotPager`의 predicate를 post별 repository exists query로 구현하지 않는다.

## Failure semantics

### First page

ranking/candidate path RuntimeException:

```text
→ legacy PostService.explore("", region, first page)
→ 한 페이지만 반환
→ nextCursor = null
```

first page fail-open은 기존 recency 결과를 사용자에게 제공하기 위한 보호 경로다.

### Continuation

다음 cursor 오류는 legacy ordering으로 fallback하지 않는다.

- invalid
- tampered
- expired
- ranking version mismatch
- filter mismatch
- user binding mismatch

모두 `EXPLORE_CURSOR_*` stable error code의 `400 BAD_REQUEST`로 종료한다.

## Existing contract protection

변경하지 않는다.

- `GET /api/v1/explore` PageResponse Explicit Search
- `GET /api/v1/feed` Home Recommendation
- Home `CursorCodec`
- Recommendation P0/P1/P2 runtime/policy/run/exposure
- Content Analysis V16
- PostGIS/place/route

## Database impact

없음.

## Tests

`ExploreRecommendationServiceTest`

- anonymous first page
- first-page ranking fail-open
- continuation filter mismatch fail-closed
- cursor existence/continuation contract

기존 EX-2~EX-5 tests와 Post API regression은 EX-8 전체 검증에서 다시 수행한다.

## Next

EX-7 — Frontend Integration
