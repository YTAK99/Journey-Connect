# CA-6 Prompt Refinement V2

## Purpose

Refine two behaviors observed during manual Content Analysis verification without changing the
response schema or persistence model.

1. Travel-style evidence should describe the actual trip, not generic advice or hypothetical
   suitability.
2. Explicit place extraction should favor higher recall while preserving the existing
   no-invention boundary.

## Prompt v2 rules

### Travel styles

`solo`, `couple`, `friends`, and `family` are emitted only when the title or content explicitly
supports that style as a property of the actual trip.

The model must not infer those styles merely because:

- the author says the route is suitable for that audience
- the author gives advice to that audience
- the post discusses a hypothetical traveler
- no companion is mentioned

Example:

```text
"혼자 여행하는 사람에게도 괜찮습니다."
```

is not sufficient evidence that the actual trip was `solo`.

### Place mentions

The no-external-fact boundary remains unchanged: `mentionText` must explicitly occur in the title
or content.

Within that boundary, the model should retain distinct travel-relevant mentions up to the existing
10-item limit, including:

- named venues
- landmarks
- parks
- stations
- neighborhoods
- visited or movement-related locations

A specific venue/landmark should not be dropped merely because its broader neighborhood is also
present.

Example:

```text
성수동 ... 성수연방 ...
```

may legitimately yield both `성수동` and `성수연방`.

## Provenance

The behavioral prompt change bumps:

```text
post-analysis-prompt-v1
→ post-analysis-prompt-v2
```

Existing v1 results remain append-only historical evidence. They are not overwritten.

The current-state read path resolves the current prompt version, so an unchanged post with only a
v1 result can become `not_requested` until a v2 job is created by a subsequent analysis-relevant
post write/update. Automatic historical backfill is not introduced in CA-6.

## Non-changes

- schema version remains `post-content-analysis-v1`
- summary limit remains 240 characters
- summary sentence count is not forced
- theme/style enum vocabulary is unchanged
- place mention limit remains 10
- suggested tag limit remains 5
- recommendation/search/PostGIS consumption remains out of scope

## Verification

Run targeted tests:

```powershell
.\gradlew.bat :test --no-build-cache `
  --tests "com.jc.backend.intelligence.contentanalysis.GeminiContentAnalysisProviderTest" `
  --tests "com.jc.backend.intelligence.contentanalysis.PostContentAnalysisJobWorkerTest" `
  --tests "com.jc.backend.post.PostContentAnalysisPostWriteIntegrationTest"
```

Then run the normal Content Analysis/full backend regression before push.

For live behavior verification, create or analysis-relevantly edit a post containing:

- audience advice such as "혼자 여행하는 사람에게도 괜찮다"
- both a broader area and a specific named venue

Expected v2 behavior:

- generic audience advice alone does not add `solo`
- both explicit travel-relevant place mentions are retained when the 10-item limit allows
