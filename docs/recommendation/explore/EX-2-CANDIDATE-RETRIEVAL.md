# EX-2 Explore Candidate Retrieval

## 상태

`IMPLEMENTED / LOCALLY VERIFIED / FINAL REGRESSION VERIFIED`

## 목적

Explore Discovery가 Home Recommendation의 최신 1,000개 + popularity pre-ranking 후보 소스를 재사용하지 않고, Explore 의미에 맞는 독립 후보 집합을 생성하도록 한다.

## 기준선

- 기준 브랜치: `feat/explore-recommendation-v1`
- EX-1: `ExploreMode`, `ExploreRankingPolicy`, `ExploreRequestContext` 완료
- 기존 `/api/v1/explore`: explicit search contract 유지
- Home `/api/v1/feed` 및 P0/P1/P2 runtime 비변경
- Content Analysis V16 결과 비사용
- DB/Flyway 변경 없음

## 구현

### `ExploreCandidateQuery`

- deterministic `referenceTime` 필수
- optional region + resolved country code
- recent/quality slice 크기는 caller가 결정
- 각 slice 최대 500으로 safety cap
- 한 slice는 0으로 비활성화 가능하나 둘 다 0은 금지

### `ExploreCandidateSource`

공통 eligibility:

```text
published = true
moderation_status = visible
author.account_status = active
created_at <= referenceTime
```

explicit region이 있으면 기존 Explore와 동일하게 다음 중 하나를 만족해야 한다.

```text
region.code exact
legacy post.region_name exact
region.search_text contains
resolved country_code exact
```

후보 집합:

```text
eligible
  ├─ recent_slice: created_at DESC, id DESC
  └─ quality_slice:
       bookmark_count DESC
       like_count DESC
       comment_count DESC
       view_count DESC
       created_at DESC
       id DESC

recent_slice UNION quality_slice
```

quality slice ordering은 최종 ranking score가 아니라 long-tail 후보 확보용 retrieval heuristic이다. EX-4의 discovery score와 의미를 공유하지 않는다.

### query count

애플리케이션 레벨 query는 candidate 수와 무관하게 최대 2개다.

1. eligibility + engagement aggregate + recent/quality union
2. 선택된 post IDs의 tags bulk fetch

likes/bookmarks/comments/tags를 한 번에 다중 join하지 않아 row multiplication을 방지한다.

## 변경 파일

```text
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreCandidateQuery.java
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreCandidateRow.java
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreCandidateSource.java
jc-backend/src/test/java/com/jc/backend/recommendation/explore/ExploreCandidateQueryTest.java
jc-backend/src/test/java/com/jc/backend/recommendation/explore/ExploreCandidateSourceIntegrationTest.java
docs/recommendation/explore/EX-2-CANDIDATE-RETRIEVAL.md
```

## 검증

필수 targeted test:

```powershell
.\gradlew.bat :test --tests "com.jc.backend.recommendation.explore.ExploreCandidateQueryTest" --tests "com.jc.backend.recommendation.explore.ExploreCandidateSourceIntegrationTest" --no-build-cache
```

검증 항목:

- recent + quality union 중복 제거
- published/visible/active-author eligibility
- future post 제외
- explicit region hard filter
- country alias scope
- engagement aggregate
- tag bulk fetch와 sort order
- deterministic candidate order

## DB/API 영향

- DB migration 없음
- Flyway 변경 없음
- API 변경 없음
- Home Recommendation production code 변경 없음
- Content Analysis persistence/query 변경 없음

## 다음 단계

`EX-3 Feature Extraction`

raw view/like/bookmark/comment count를 그대로 score에 넣지 않고 candidate-pool normalization을 거쳐 `[0,1]` feature로 변환한다. Content Analysis metadata는 계속 제외한다.
