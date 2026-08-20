# EX-9 Safe Rollout

Status: IMPLEMENTED / REGRESSION_VERIFIED / DEFAULT LEGACY

## Purpose

Explore Recommendation V1을 기존 Home recommendation rollout과 분리된 안전한 운영 모드로 제어한다.
DB/Flyway, Home OFF/SHADOW/CANARY/LIVE, P2 CANARY, recommendation exposure persistence는 변경하지 않는다.

## Rollout modes

`app.recommendation.explore.mode` / `JC_EXPLORE_MODE`:

- `LEGACY` — legacy recency Explore만 serve. 신규 discovery ranking은 실행하지 않는다.
- `SHADOW` — legacy recency Explore를 serve하면서 신규 discovery ranking을 별도로 계산하고 비교 관측만 기록한다.
- `ACTIVE` — EX-2~8 discovery ranking + diversity + frozen cursor를 serve한다.

기본값은 `LEGACY`다. 지원하지 않는 값은 startup wiring 중 fail-fast한다.

## Cursor invariant

ACTIVE가 발급한 frozen cursor를 LEGACY 또는 SHADOW 결과와 섞지 않는다.
운영 모드가 ACTIVE에서 LEGACY/SHADOW로 rollback된 뒤 기존 cursor가 들어오면
`EXPLORE_CURSOR_MODE_MISMATCH`로 거부하고 discovery restart를 요구한다.

ACTIVE 내부의 기존 규칙은 유지한다.

- first-page ranking failure: legacy recency fail-open
- continuation cursor failure: fail-closed
- ranking/filter/user binding mismatch: legacy ordering과 혼합 금지

## SHADOW observations

SHADOW는 사용자에게 legacy 결과만 반환하고 다음 비교값을 구조화 로그로 기록한다.

- `rankingVersion`
- `explicitRegion`
- `rankingLatencyMs`
- `candidateCount`
- `topN`
- `topNOverlap`
- `uniqueAuthors`
- `uniqueRegions`
- `topAuthorShare`

현재 backend에는 Micrometer/Actuator runtime이 없으므로 EX-9에서 새 관측 dependency를 도입하지 않는다.
`ExploreShadowObservation`을 순수 계산 계약으로 두어 향후 Reliability metric sink가 그대로 소비할 수 있게 한다.

로그에는 user ID, opaque user binding, cursor, 자유 텍스트를 기록하지 않는다.
SHADOW ranking 계산 실패는 legacy response에 영향을 주지 않으며 error class만 warning log로 남긴다.

## Verification

- blank/null mode -> LEGACY
- lowercase mode parse
- unsupported mode fail-fast
- LEGACY does not invoke discovery candidate source
- SHADOW serves legacy while discovery ranking executes
- ACTIVE serves frozen discovery cursor
- ACTIVE first-page failure keeps legacy fail-open
- ACTIVE continuation keeps fail-closed
- non-ACTIVE mode rejects old ACTIVE cursor
- shadow overlap/diversity metrics are bounded and deterministic
- full backend/core regression
- frontend lint/build

## Compatibility

- existing `GET /api/v1/explore` unchanged
- `GET /api/v1/explore/discovery` unchanged
- existing Home recommendation modes unchanged
- no DB/Flyway change
- no P0/P1/P2 policy change
- no Content Analysis/PostGIS dependency

## Promotion sequence

```text
LEGACY
  -> SHADOW
  -> review latency / candidate count / overlap / diversity observations
  -> ACTIVE
```

Rollback is configuration-only:

```text
ACTIVE -> LEGACY
```

After rollback, clients holding ACTIVE cursors restart discovery rather than mixing ordering.
