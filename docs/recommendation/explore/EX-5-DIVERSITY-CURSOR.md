# EX-5 Diversity / Deduplication / Stable Pagination

## Status

IMPLEMENTED / LOCALLY VERIFIED / FINAL REGRESSION VERIFIED

## Purpose

Explore Discovery의 base ranking 뒤에서 반복 노출을 완화하고, 하나의 discovery session 동안 동일한 frozen ordering을 cursor로 이어서 소비한다.

Explicit Search의 relevance tier ordering은 변경하지 않는다.

## Diversity

`ExploreDiversityReranker`

입력:

- full `ExploreDiscoveryScore` base ranking
- explicit region hard-filter 여부
- Explore-only diversity policy

순차 선택 시 비교용 adjusted score:

```text
adjustedScore
=
baseScore
- authorSaturationPenalty
- regionSaturationPenalty
- tagOverlapPenalty
```

`baseScore` 자체는 수정하지 않는다.

### V1 baseline policy

```text
lookbackWindow = 10
fullPressureCandidateCount = 10
authorPenaltyPerRepeat = 0.08
regionPenaltyPerRepeat = 0.04
tagOverlapPenalty = 0.06
```

숫자는 Explore V1 heuristic baseline이며 `Policy`로 명시적으로 주입 가능하다.

### Explicit region

사용자가 region을 hard filter로 지정한 경우:

```text
region penalty = 0
```

동일 지역 반복은 사용자가 선택한 scope의 자연스러운 결과이므로 벌점 처리하지 않는다.

### Sparse relaxation

후보가 `fullPressureCandidateCount`보다 적으면 전체 diversity pressure를 선형 완화한다.

```text
candidateCount = 1 -> 0 pressure
candidateCount >= fullPressureCandidateCount -> full pressure
```

후보를 삭제하거나 hard cap으로 막지 않는다.

### Determinism

동일 adjusted score는 다음 순서로 비교한다.

1. baseScore
2. quality
3. freshness
4. createdAt
5. postId

duplicate postId 입력은 거부한다.

## Frozen Explore cursor

`ExploreCursorCodec`

Home `CursorCodec`, Home recommendation cursor, recommendation run identity를 재사용하지 않는다.

signed payload:

```text
payloadVersion
rankingVersion
referenceTime
filterFingerprint
optional opaque userBinding
orderedPostIds
nextOffset
expiresAt
HMAC-SHA256
```

### Security boundary

- payload는 암호화되지 않는다.
- raw keyword/region 대신 SHA-256 `filterFingerprint`만 저장한다.
- `userBinding`을 사용할 경우 raw email/JWT/token을 넣지 않는다.
- production secret은 API integration 단계에서 외부 configuration으로 주입한다.
- HMAC key는 최소 32 bytes.
- malformed/tampered/expired/mismatch를 reason별로 분리한다.

64KiB decode guard는 untrusted token 메모리 보호용 safety ceiling이며 product candidate cap이 아니다.

### Cursor size measurement

`ExploreCursorCodecTest`는 representative 19-digit post ID 100개를 frozen ordering에 넣어 실제 URL-safe token byte size를 측정한다.

V1 product snapshot cap은 이 단계에서 임의로 100으로 고정하지 않는다. EX-6에서 실제 candidate policy와 API response pagination을 결속할 때 측정 결과를 함께 사용한다.

## Snapshot consumption

`ExploreSnapshotPager`

- `nextOffset`부터 frozen ID order를 그대로 소비한다.
- continuation에서 score/rank를 다시 계산하지 않는다.
- 현재 visibility predicate가 false인 ID는 건너뛰고 offset을 영구 전진한다.
- 따라서 중간에 hidden된 post는 후속 page에서 재노출되지 않는다.
- page 1/2 사이 like/bookmark 값이 변해도 ordering은 바뀌지 않는다.

실제 visibility DB recheck는 EX-6 service integration이 제공한다.

## Failure semantics

첫 page ranking failure의 legacy fail-open은 EX-6 책임이다.

continuation cursor:

- invalid
- tampered
- expired
- ranking version mismatch
- filter mismatch
- user binding mismatch

중 하나면 기존 legacy ordering과 섞지 않고 명시적 cursor error로 종료해야 한다.

## Database / API impact

- DB migration: none
- existing API change: none
- Home P0/P1/P2 change: none
- Content Analysis dependency: none
- PostGIS dependency: none

Discovery cursor endpoint 연결은 EX-6에서 수행한다.

## Tests

`ExploreDiversityRerankerTest`

- same author repeat penalty
- region saturation
- explicit region penalty off
- tag overlap
- sparse relaxation
- deterministic tie
- duplicate rejection

`ExploreCursorCodecTest`

- round trip
- HMAC tamper
- filter mismatch
- ranking version mismatch
- user binding mismatch
- expiry
- filter fingerprint normalization
- 100-ID token byte-size measurement
- duplicate frozen ID rejection
- weak secret rejection

`ExploreSnapshotPagerTest`

- page 1/2 duplicate 없음
- frozen order 유지
- hidden post skip
- offset advancement
- external engagement 변화가 continuation order에 영향 없음

## Completion gate

하나의 frozen discovery snapshot에서:

1. diversity가 base score를 변경하지 않고 반복 노출만 완화한다.
2. explicit region scope는 region penalty를 받지 않는다.
3. page continuation이 score를 재계산하지 않는다.
4. invalid cursor가 legacy ordering으로 조용히 fallback하지 않는다.
5. hidden post를 skip하면서 동일 post를 두 번 반환하지 않는다.

이면 EX-5 완료로 본다.

## Next

EX-6 — Backend API Integration
