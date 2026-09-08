# EX-8 Verification / Regression

## Status

REGRESSION_VERIFIED

## Purpose

Explore Recommendation V1의 endpoint, frozen cursor, visibility recheck, region hard filter, query-count 경계를 실제 backend 통합 테스트로 고정하고 기존 Feed/Search/P0/P1/P2/Content Analysis 회귀 여부를 확인한다.

이번 단계에서 신규 ranking 의미, DB schema, Flyway migration, Content Analysis feature, PostGIS, Home recommendation policy를 추가하지 않는다.

## Verification hardening fix

EX-8 audit 중 `PostService` 목록 Summary 변환이 게시물마다 `RegionService.localizedNames(region)`를 호출하고, 기존 구현이 region별 `region_translation` query를 실행하는 경로를 확인했다.

Discovery는 다양한 region 후보를 한 페이지에 반환할 수 있으므로 이 경로를 그대로 두면 candidate 수에 따라 query 수가 증가한다.

보완:

- `RegionRepository.findTranslationsByRegionIds(...)` bulk query 추가
- `RegionService.localizedNamesByRegionIds(...)` 추가
- `PostService.summaries(...)`가 페이지의 distinct region IDs를 한 번에 조회
- 기존 단건 `localizedNames(...)` 계약은 유지
- DB/Flyway 변경 없음

## Added verification

### ExploreDiscoveryApiIntegrationTest

- anonymous Discovery 성공
- explicit region hard filter
- unpublished 제외
- hidden 제외
- inactive/suspended author 제외
- `createdAt > referenceTime` 미래 게시물 제외
- page 1 이후 hidden 처리된 post 재노출 금지
- cursor 전체 순회 중 duplicate 금지
- visible frozen snapshot 항목 누락 금지
- authenticated cursor user binding mismatch -> `EXPLORE_CURSOR_USER_MISMATCH`

### ExploreVisibleSummaryQueryIntegrationTest

25개 게시물을 25개 서로 다른 region에 배치하고 번역명과 tag를 포함한 Summary를 bulk 조회한다.

Hibernate/JPA prepared statement 상한:

```text
post visibility query
+ batched tag query
+ bulk like count
+ bulk bookmark count
+ bulk region translations
<= 5
```

`ExploreCandidateSource`의 JdbcTemplate candidate/tag retrieval은 별도 EX-2 통합 테스트가 검증하며 Hibernate Statistics 집계 대상이 아니므로 위 JPA 상한에 포함하지 않는다.

## Existing regression guards retained

- `ExploreCandidateSourceIntegrationTest`
- `ExploreRecommendationServiceTest`
- `ExploreCursorCodecTest`
- `ExploreSnapshotPagerTest`
- `ExploreDiscoveryScorerTest`
- `ExploreDiversityRerankerTest`
- `ExploreSearchRankerTest`
- `PostApiIntegrationTest`
- `FeedCursorIntegrationTest`
- `PostListQueryIntegrationTest`
- existing recommendation backend tests
- `jc-recommendation-core` P0/P1/P2 tests
- Content Analysis tests
- frontend ESLint / Vite build

기존 Home golden 또는 P0/P1/P2 expectation은 Explore를 이유로 수정하지 않는다.

## Database / API impact

- DB migration: none
- existing `/api/v1/explore`: unchanged
- existing `/api/v1/feed`: unchanged
- `/api/v1/explore/discovery`: contract unchanged
- Home recommendation scoring/policy/cursor: unchanged
- Content Analysis runtime: unchanged

## Completion gate

다음이 모두 PASS해야 EX-8을 완료한다.

1. Explore focused integration/regression tests
2. backend root `:test`
3. `:jc-recommendation-core:test`
4. frontend lint
5. frontend production build
6. existing Search and Feed regression
7. no candidate-count-dependent Summary N+1

## Next

EX-9 — Explore Safe Rollout (`LEGACY / SHADOW / ACTIVE`, default `LEGACY`)
