# EX-4 Explore Scoring / Ranking

## Status

`IMPLEMENTED / PRODUCTION SOURCE COMPILE VERIFIED / GRADLE TEST PENDING`

## Purpose

Explore Discovery의 deterministic base score와 Explicit Search의 relevance-first ordering contract를 구현한다.

이번 단계는 base ordering까지만 담당한다. author/region/tag saturation penalty와 frozen cursor는 EX-5 책임이다.

## Baseline

- branch: `feat/explore-recommendation-v1`
- source HEAD before EX-4: `fbe4250e0682122b55957be3ca438f682fcbdedf`
- EX-3 output: `ExploreCandidateFeatures`
- ranking versions:
  - Discovery: `explore-discovery-ranking-v1`
  - Explicit Search: `explore-search-ranking-v1`
- DB/Flyway/API/Home P0/P1/P2/Content Analysis 변경 없음

## Discovery policy

`ExploreScoringPolicy.discoveryV1()`은 V1 heuristic baseline을 명시한다.

```text
relevance   0.30
quality     0.25
freshness   0.25
exploration 0.20
```

합계는 1.0이다. 이 값은 제품 truth가 아니라 rankingVersion에 결속된 초기 heuristic이다.

quality 내부 weight:

```text
bookmark 0.45
like     0.30
comment  0.20
view     0.05
```

따라서 `bookmark > like > comment > view`를 강제한다. 모든 input은 EX-3에서 이미 `[0,1]`로 bounded되어 raw count가 직접 score를 지배하지 않는다.

## Discovery score

```text
quality =
  0.45 * normalizedBookmark
+ 0.30 * normalizedLike
+ 0.20 * normalizedComment
+ 0.05 * normalizedView
```

exploration은 무작위 bonus가 아니다.

```text
eligible =
  freshness >= 0.35
  OR quality >= 0.20

exploration = eligible ? (1 - quality) : 0
```

즉 low-popularity 자체만으로 bonus를 주지 않고, 충분히 최근이거나 최소 quality evidence가 있는 후보에만 under-popularity proxy를 허용한다.

base score:

```text
weighted =
  Wquality * quality
+ Wfresh * freshness
+ Wexplore * exploration
+ (relevance available ? Wrel * relevance : excluded)

baseScore = weighted / activeWeightSum
```

`optionalUserAffinity`가 unavailable이면 relevance를 0으로 채우지 않는다. relevance weight 자체를 active set에서 제거하고 나머지 weight를 재정규화한다.

따라서 anonymous/missing-profile과 실제 affinity=0은 서로 다른 상태다.

## Discovery deterministic ordering

EX-4 base ordering:

```text
baseScore DESC
quality DESC
freshness DESC
createdAt DESC
postId DESC
```

이 ordering은 EX-5 diversity rerank의 input order다. EX-5는 별도 penalty를 적용하되 EX-4 score 의미를 수정하지 않는다.

## Explicit Search

Explicit Search는 weighted relevance score를 사용하지 않는다.

`ExploreSearchRanker.RelevanceEvidence`를 upstream search matching evidence로 받아 다음 tier를 결정한다.

```text
Tier A: title exact / tag exact
Tier B: title strong match / region strong match
Tier C: tag contains / region contains/searchText match
Tier D: content-only match
```

후보는 최소 하나의 relevance evidence가 있어야 한다.

정렬은 lexicographic이다.

```text
Tier A -> B -> C -> D
then, same tier only:
  freshness DESC
  quality DESC
  createdAt DESC
  postId DESC
```

따라서 Tier B의 매우 인기 있는 게시물이 Tier A의 무인기 게시물을 추월할 수 없다.

EX-4는 search evidence 생성 쿼리나 기존 `/api/v1/explore` 연결을 아직 변경하지 않는다. 해당 integration은 EX-6에서 수행한다.

## Files

```text
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreScoringPolicy.java
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreDiscoveryScore.java
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreDiscoveryScorer.java
jc-backend/src/main/java/com/jc/backend/recommendation/explore/ExploreSearchRanker.java
jc-backend/src/test/java/com/jc/backend/recommendation/explore/ExploreDiscoveryScorerTest.java
jc-backend/src/test/java/com/jc/backend/recommendation/explore/ExploreSearchRankerTest.java
docs/recommendation/explore/EX-4-SCORING-RANKING.md
```

## Tests

Discovery:

- rankingVersion/policy binding
- bookmark > like > comment > view
- missing relevance active-weight renormalization
- actual zero affinity distinction
- fresh zero-engagement exploration
- stale zero-evidence no bonus
- old viral vs fresh new candidate
- relevance dominance bound
- deterministic createdAt/id tie-break
- policy drift / invalid weight rejection

Explicit Search:

- Tier A/B/C/D classification
- relevance tier dominance over popularity
- same-tier freshness before quality
- quality -> createdAt -> id tie-break
- relevance evidence required
- search rankingVersion binding

## Compatibility

- DB migration: none
- API change: none
- existing `/api/v1/explore`: unchanged
- existing `/api/v1/feed`: unchanged
- Home P0/P1/P2 scorer/policy/cursor: unchanged
- Content Analysis V16: not read
- PostGIS/route/place resolution: not read

## Completion gate

동일 `ExploreCandidateFeatures` snapshot과 동일 policy/rankingVersion에서 항상 동일 base ordering이 나오고, anonymous relevance absence가 zero affinity와 구분되며, Explicit Search relevance tier가 popularity보다 항상 우선하면 EX-4를 완료한다.

## Next

EX-5 — Diversity / Deduplication / Stable Pagination
