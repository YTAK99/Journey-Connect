# CA-4D Real AI Summary Frontend Integration

## 1. Scope

CA-4D connects the CA-4C current-analysis read API to the user-facing post UI.

The frontend no longer invents an AI summary from region or generic fallback copy.

## 2. Feed behavior

The feed does not preload one analysis request per card.

Instead, opening `AI Summary` lazily calls:

```text
GET /api/v1/posts/{postId}/analysis
```

This avoids adding an analysis N+1 request pattern to normal feed loading.

Only a `succeeded` analysis displays `result.summary`.

Other states display truthful state text:

- queued/running: summary is being prepared
- failed/quarantined: summary is unavailable
- not_requested: summary has not been generated

The previous `post.aiSummary || post.summary || generated fallback` chain is removed.

## 3. Post Detail behavior

Post Detail requests the post and its current analysis separately.

A summary section is rendered only when:

```text
analysis.status == succeeded
and analysis.result.summary is non-blank
```

Failure to load the optional analysis resource does not prevent the source post from rendering.

## 4. Authority

CA-4D does not derive or reconstruct analysis in the browser.

The displayed summary comes only from the CA-4C read API, whose result is bound to the exact
current post `sourceContentVersion`.

## 5. Deferred

- feed batch analysis reads
- embedding analysis into the Post DTO
- rendering themes/travelStyles/placeMentions
- recommendation/search consumption
- translation of AI-generated summary
- production activation policy

## 6. Verification

Frontend verification:

```text
npx eslint src/components/FeedCard.jsx src/pages/PostDetail.jsx src/services/postApi.js
npm run build
```

Manual/API-backed smoke after runtime activation should additionally verify:

```text
queued/running -> no fabricated summary
succeeded -> persisted summary displayed
post content edit -> old successful summary is not displayed
failed/quarantined -> unavailable state, never fallback copy
```
