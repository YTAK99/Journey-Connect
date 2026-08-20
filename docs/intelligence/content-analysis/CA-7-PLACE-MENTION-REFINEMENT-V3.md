# CA-7 Place Mention Refinement V3

## Purpose

Refine place extraction after manual V2 verification showed that higher recall also increased
route-irrelevant place noise.

Observed V2 behavior included:

- actual trip places were generally retained
- broad parent geography such as `서울` or `한강` could consume slots
- a future-plan mention such as `어린이대공원` could be extracted
- a specific actual venue such as `성수연방` could still be missed

V3 keeps the V2 travel-style precision rule and changes only place-selection semantics.

## Prompt v3 place policy

A place mention must satisfy both conditions:

1. its `mentionText` explicitly appears in the supplied title or content
2. it belongs to the actual trip represented by the post

Actual-trip place roles include:

- visited stops
- starting points
- destinations
- transfer points
- meaningful movement waypoints

Exclude mentions that appear only as:

- future plans
- hypothetical routes
- recommendations
- audience advice
- comparisons
- unrelated examples

## Priority

When the 10-item limit requires selection, prefer:

```text
specific actual visited place
> actual transit / movement point
> actually visited neighborhood
> broad parent geography
```

Examples:

```text
성수연방 > 성수동 > 서울
뚝섬한강공원 > 한강
```

This is a relevance priority, not a string-containment deletion rule.

Both a neighborhood and a specific venue may be retained when the post treats them as distinct
actual parts of the trip.

For example:

```text
성수동 골목을 돌아본 뒤 성수연방에 들렀다
```

may retain both `성수동` and `성수연방`.

## Provenance

The semantic prompt change bumps:

```text
post-analysis-prompt-v2
→ post-analysis-prompt-v3
```

Existing V1/V2 results remain append-only historical evidence and are not overwritten.

The response schema version remains:

```text
post-content-analysis-v1
```

## Non-changes

- V2 travel-style evidence policy remains active
- summary generation policy is unchanged
- summary maximum remains 240 characters
- place mention maximum remains 10
- suggested tag maximum remains 5
- no external place lookup is introduced
- no coordinates or PostGIS resolution are introduced
- recommendation/search consumption remains out of scope

## Verification

Targeted regression:

```powershell
.\gradlew.bat :test --no-build-cache `
  --tests "com.jc.backend.intelligence.contentanalysis.GeminiContentAnalysisProviderTest" `
  --tests "com.jc.backend.intelligence.contentanalysis.PostContentAnalysisJobWorkerTest" `
  --tests "com.jc.backend.post.PostContentAnalysisPostWriteIntegrationTest"
```

Then run:

```powershell
.\gradlew.bat :test --no-build-cache
```

## Live verification fixture

Use a post that explicitly contains all of the following semantic cases:

```text
actual:
성수동
성수역
성수연방
서울숲
뚝섬한강공원
건대입구

broad/context:
서울
한강

future only:
어린이대공원
```

Expected behavior:

- `성수연방` is preferred as a specific actual venue
- `어린이대공원` is excluded when it appears only as a future plan
- `서울` is not selected merely as broad parent geography when specific Seoul stops represent the trip
- `한강` is not selected merely as a broad parent when `뚝섬한강공원` represents the actual visit
- `성수동` may remain because the neighborhood itself was an actual explored stage
- `성수역` may remain because it was an actual start/movement point
- V2 rule continues to prevent `solo` from generic advice such as "혼자 여행하는 사람에게도 괜찮다"

LLM extraction remains probabilistic. Live verification should judge the semantic direction across
representative posts rather than treating one exact ordered list as a permanent deterministic
contract.
