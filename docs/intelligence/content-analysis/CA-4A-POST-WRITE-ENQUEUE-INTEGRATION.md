# CA-4A Post Write → Content Analysis Enqueue Integration

## 1. Scope

CA-4A connects the existing post create/update write path to the already verified
Content Analysis snapshot/job pipeline.

This phase does not execute Gemini in the post request thread and does not expose
analysis results through Feed, Post Detail, Search, Recommendation, or UI.

## 2. Baseline

- CA-1 contract/validator: VERIFIED
- CA-2A job/worker contract: VERIFIED
- CA-2B PostgreSQL persistence: REGRESSION_VERIFIED
- CA-3 provider/runtime/live smoke: VERIFIED
- Flyway persistence: `V16__post_content_analysis_persistence.sql`

## 3. Integration

Post create/update now builds:

```text
postId
title
content
regionName
sourceTags
sourceContentVersion
```

and calls:

```text
PostContentAnalysisJobService.enqueue(input)
```

The existing persistence contract then creates or reuses the immutable input
snapshot and deduplicated queued job.

## 4. Source Content Version

Version format:

```text
post-analysis-source-v1:<sha256>
```

Canonical hash material:

```text
canonicalization marker
title
content
regionName
sourceTags count
sourceTags in persisted author order
```

Each nullable/string field is length-prefixed before hashing so concatenation
ambiguity cannot create the same canonical byte stream.

`postId` is not included in the hash material because it is already a separate
component of the job dedupe key and input snapshot primary key.

Tag ordering is preserved because it is part of the actual provider input.

## 5. Transaction Boundary

The enqueue persistence executes inside the existing post write transaction.
Only local PostgreSQL/JDBC evidence is written. No external AI/provider call is
made by `PostService`.

This keeps post state and its analysis request evidence atomic while retaining
provider failure isolation in the worker.

## 6. Non-analysis Changes

Updates that do not change:

- title
- content
- regionName
- sourceTags

produce the same `sourceContentVersion`. Existing database dedupe therefore
reuses the existing job instead of creating a new analysis request.

## 7. Verification

Targeted tests cover:

- create → immutable snapshot + queued job
- runtime disabled → no ContentAnalysisProvider bean/provider call
- image-only update → no additional analysis job
- title change → new version/job
- content change → new version/job
- region change → new version/job
- tag change → new version/job
- persisted snapshot equals final post analysis input

## 8. Explicitly Deferred

- worker scheduler/runtime trigger
- analysis read service/API
- Feed/Post Detail analysis fields
- frontend AI Summary replacement
- recommendation/search consumption
- translation
- place resolution/PostGIS integration
- production activation
