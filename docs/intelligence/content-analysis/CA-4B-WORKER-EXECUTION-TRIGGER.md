# CA-4B Worker Execution Trigger / Scheduler Boundary

## 1. Scope

CA-4B connects the already verified `PostContentAnalysisWorker.runOnce()` execution contract
to a Spring-managed periodic trigger.

It does not change enqueue semantics, persistence schema, provider semantics, result exposure,
recommendation/search behavior, translation, or production activation.

## 2. Activation Boundary

Two separate switches remain intentionally distinct.

```text
app.intelligence.content-analysis.enabled=true
```

creates the real Content Analysis provider runtime.

```text
app.intelligence.content-analysis.worker-enabled=true
```

activates the periodic worker runtime.

`worker-enabled` defaults to false because `@ConditionalOnProperty` requires an explicit true value.

Enabling the worker without exactly one `ContentAnalysisProvider` fails application startup.
This prevents a scheduler from silently running without an analysis provider.

## 3. Trigger

`PostContentAnalysisWorkerTrigger.poll()` is scheduled with fixed delay.

Defaults:

```text
worker-initial-delay-ms = 1000
worker-poll-delay-ms = 1000
```

Each trigger invocation calls `worker.runOnce()` exactly once.

The worker therefore claims at most one ready job per poll. Claim concurrency remains owned by
the existing PostgreSQL `FOR UPDATE SKIP LOCKED` persistence implementation.

## 4. Request / Provider Separation

Post create/update remains:

```text
Post write
→ immutable snapshot
→ queued job
→ HTTP response
```

The periodic worker path is separate:

```text
scheduled poll
→ claim ready job
→ load snapshot
→ provider analyze
→ validate
→ append result
→ mark job terminal or retry
```

No Gemini call is added to the post request thread.

## 5. Failure Semantics

CA-4B does not alter worker retry policy.

Existing worker behavior remains authoritative:

- provider failure: retry with backoff, then failed
- validation failure: retry, then quarantined
- missing snapshot: quarantined
- existing valid result: mark succeeded without a second provider analysis

## 6. Verification

Targeted tests cover:

- worker runtime absent by default
- worker activation without a provider fails fast
- enabled worker + provider creates worker and trigger beans
- one trigger poll attempts one ready-job claim
- empty queue does not invoke provider

Existing CA-2A worker tests continue to own retry/backoff/result semantics.

## 7. Explicitly Deferred

- analysis read service/API
- Feed/Post Detail analysis exposure
- frontend AI Summary replacement
- worker metrics/health dashboards
- manual replay/admin controls
- recommendation/search consumption
- production activation policy
