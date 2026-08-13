# CA-5 Local Live E2E Smoke

## 1. Purpose

CA-5 verifies the implemented Content Analysis path with one real Gemini call against the local
PostgreSQL test database.

The authority under test is:

```text
PostService.create
-> immutable input snapshot
-> deduplicated queued job
-> Spring scheduled worker trigger
-> PostgreSQL claim
-> Gemini structured analysis
-> semantic validation
-> append-only result persistence
-> current-source read service
-> GET /api/v1/posts/{postId}/analysis
```

Frontend lint/build remains a separate verified boundary. The live backend result can then be
viewed through the already-wired Feed/Post Detail UI without inventing fallback summary text.

## 2. Safety

The test is opt-in and skipped during normal regression.

It only runs when:

```text
JC_AI_CONTENT_E2E_ENABLED=true
```

The Gemini API key is read from `GOOGLE_AI_API_KEY` and must never be committed.

The test uses the `test` Spring profile and therefore the isolated PostgreSQL test database
configured by `TEST_DB_*`.

## 3. Runtime activation exercised by the test

The test overrides the test-profile defaults only for its Spring context:

```text
spring.ai.model.chat=google-genai
app.intelligence.content-analysis.enabled=true
app.intelligence.content-analysis.worker-enabled=true
```

The scheduled worker has a 5 second initial delay and a 250 ms poll delay so the test can clear
the Content Analysis tables and create its post before the first live provider call.

## 4. Verification

The test requires:

- exactly one `ContentAnalysisProvider`
- exactly one `PostContentAnalysisWorker`
- exactly one `PostContentAnalysisWorkerTrigger`
- post write creates a current analysis job
- scheduled execution reaches `succeeded`
- result is persisted exactly once
- result model version matches the requested Gemini model
- summary is non-blank
- source language is Korean
- tag/place/confidence limits remain valid
- public analysis endpoint returns the same successful run

A `failed` or `quarantined` terminal state fails immediately with the persisted error code.
A non-terminal run times out after 60 seconds.

## 5. Run

PowerShell from `jc-backend`:

```powershell
$env:TEST_DB_HOST="localhost"
$env:TEST_DB_PORT="5433"
$env:TEST_DB_NAME="journey_test"
$env:TEST_DB_USERNAME="postgres"
# $env:TEST_DB_PASSWORD="<password>"   # only when required

$env:JC_AI_CONTENT_E2E_ENABLED="true"
$env:GOOGLE_AI_API_KEY="<Google AI Studio API key>"
$env:JC_AI_CONTENT_MODEL="gemini-3.6-flash"

.\gradlew.bat :test --no-build-cache `
  --tests "com.jc.backend.intelligence.contentanalysis.PostContentAnalysisLiveE2ETest"
```

## 6. State semantics

Passing CA-5 means the local implementation has live end-to-end evidence.

It does not mean:

- merged
- deployed
- production activated
- cost/latency SLO proven
- recommendation/search consumption enabled
