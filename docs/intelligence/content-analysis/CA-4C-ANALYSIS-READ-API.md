# CA-4C Analysis Read Service / API

## 1. Scope

CA-4C exposes the current Content Analysis state for a post without changing the existing
analysis write, worker, provider, or persistence contracts.

Endpoint:

```text
GET /api/v1/posts/{postId}/analysis
```

## 2. Current-source binding

The read path does not select the newest analysis row by timestamp.

Instead it recomputes the exact current `sourceContentVersion` from the persisted post:

```text
title
content
regionName
sourceTags
```

and resolves the job through the existing dedupe identity:

```text
postId
+ current sourceContentVersion
+ post-content-analysis-v1
+ post-analysis-prompt-v1
```

This prevents an older successful analysis from being exposed after the post has changed and a
new analysis is still queued or running.

It also correctly reuses a previous analysis when the author restores the post to an identical
canonical source state.

## 3. Read states

The API returns a stable state object.

```text
not_requested
queued
running
succeeded
failed
quarantined
```

`not_requested` is an API read state for legacy/current source states that have no matching job.
It is not added to the worker persistence enum.

For non-succeeded states, `result` is null.

For `succeeded`, the response includes the persisted structured result:

- schemaVersion
- sourceLanguage
- modelVersion
- promptVersion
- summary
- themes
- travelStyles
- suggestedTags
- placeMentions
- confidence
- createdAt

## 4. Visibility

Analysis visibility follows the post visibility rule:

- moderation-hidden posts are not readable
- published posts are publicly readable
- unpublished posts are readable only by their author
- unauthorized unpublished access returns `POST_NOT_FOUND`

The analysis endpoint does not increment post view count.

## 5. Invariants

A `succeeded` job must have a persisted result with the same `sourceContentVersion`.

If that invariant is broken, the read service fails instead of silently returning incomplete or
stale evidence.

## 6. Verification

Targeted integration verification covers:

- create → queued read state
- public HTTP analysis endpoint
- successful result read
- changed content → new queued state, old successful result not exposed
- legacy post → `not_requested`
- unpublished post hidden from unauthenticated readers
- unpublished post readable by owner through the service boundary

## 7. Explicitly deferred

- embedding analysis into Post Detail
- embedding analysis into Feed cards
- frontend AI Summary replacement
- batch read for feed performance
- recommendation/search consumption
- translation
- place resolution
- production activation policy
