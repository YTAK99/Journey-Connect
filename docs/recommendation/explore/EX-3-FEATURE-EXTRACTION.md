# EX-3 Feature Extraction

## Status

IMPLEMENTED / LOCALLY VERIFIED / FINAL REGRESSION VERIFIED

## Purpose

Explore candidate retrieval의 raw counter와 metadata를 deterministic ranking input 범위로 변환한다.

이번 단계는 score를 계산하지 않는다. EX-4 scorer가 quality, relevance, freshness, exploration term을 조합할 수 있도록 bounded feature만 만든다.

## Input

`ExploreCandidateRow`

- postId
- authorId
- regionCode
- createdAt
- viewCount
- likeCount
- bookmarkCount
- commentCount
- post tags

Content Analysis V16, Gemini 결과, PostGIS, route/place resolution, Home recommendation run/exposure는 읽지 않는다.

## Output

`ExploreFeatureSnapshot`

- referenceTime
- candidate population P95 statistics
- ordered `ExploreCandidateFeatures`

`ExploreCandidateFeatures`

- raw identity/diversity metadata
- raw counters
- bounded normalized popularity channels
- freshness
- optional user affinity

`optionalUserAffinity`는 값이 없을 때 `0.0`으로 대체하지 않는다. `OptionalDouble.empty()`로 unavailable 상태를 보존한다.

## Count normalization

각 engagement counter는 candidate snapshot의 nearest-rank P95를 기준으로 독립 정규화한다.

```text
normalizedCount(x)
= min(log1p(x) / log1p(candidateP95), 1)
```

P95가 0이면 결과는 0이다.

view/like/bookmark/comment를 아직 하나의 quality 점수로 합치지 않는다. bookmark > like > comment > view weighting은 EX-4 scorer 책임이다.

## Freshness

EX-3에서는 half-life 값을 임의 상수로 고정하지 않는다.

호출자가 positive `Duration freshnessHalfLife`를 명시하고 extractor는 다음 exponential decay만 수행한다.

```text
freshness = 0.5 ^ (age / halfLife)
```

- createdAt == referenceTime -> 1.0
- age == halfLife -> 0.5
- future timestamp -> defensive clamp to 1.0
- output range -> [0,1]

실제 V1 half-life 선택은 ranking policy와 결속되는 후속 단계에서 확정한다.

## Affinity boundary

EX-3는 사용자 프로필을 조회하거나 Home P1 runtime을 호출하지 않는다.

이미 계산된 bounded affinity가 외부에서 전달된 경우에만 candidate별로 보존한다.

- available -> `[0,1]`
- missing profile -> unavailable
- anonymous -> unavailable

EX-4는 unavailable relevance/affinity를 0점 패널티로 처리하지 않고 active weight를 재정규화해야 한다.

## Determinism

- referenceTime은 호출자가 명시한다.
- input candidate order를 그대로 보존한다.
- percentile 계산은 nearest-rank P95로 고정한다.
- duplicate postId는 거부한다.
- NaN/infinite/out-of-range affinity는 거부한다.

## Tests

`ExploreFeatureExtractorTest`

- empty population
- all-zero counters
- massive outlier cap
- all same positive values
- explicit freshness half-life
- future timestamp clamp
- missing personal profile
- anonymous
- candidate order/diversity metadata preservation
- duplicate/invalid input rejection

## Database / API impact

- DB migration: none
- API change: none
- Home P0/P1/P2 change: none
- Content Analysis dependency: none

## Completion gate

어떤 raw counter도 정규화 범위를 넘어 score 전체를 직접 지배할 수 없고, personal affinity absence가 0점과 구분되면 EX-3를 완료한다.

## Next

EX-4 — Explore Scoring / Ranking
