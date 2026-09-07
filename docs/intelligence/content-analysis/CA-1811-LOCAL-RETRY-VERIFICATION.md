# Post 1811 local retry verification (2026-09-06)

## Finding

- Local API and PostgreSQL `journey_db` agreed: run
  `analysis:029ee0c4-a1b5-40e4-bdd5-b4bb67fa50a4` was failed at attempt 3,
  with `provider_failure` and no result.
- Last failure: `2026-09-05T17:42:55.563685Z`. The observed backend process
  started later, at 2026-09-06 03:20:59 KST. Startup with a working model does
  not requeue terminal failed jobs; `claimNextReady` only claims queued jobs.
- Historical attempts 1/2/3 recorded provider_failure/provider_rate_limited/
  provider_failure. Their original exceptions were not retained, so the exact
  historical provider status/body cannot be recovered or asserted.
- Current source and runtime select `gemini-3.5-flash`. The `.env`
  `JC_AI_CONTENT_MODEL=gemini-3.6-flash` value is not mapped by the current
  environment postprocessor; it is consumed by the opt-in live tests. This
  discrepancy is not evidence of the historical failure cause.
- A read-only provider invocation with the exact stored 1811 input succeeded
  before any provider/schema change. No such change was needed.

## Change and bounded recovery

- Worker RuntimeException logging now includes post ID, run ID, attempt,
  provider, model, and the original throwable/cause chain. Exception messages
  carrying provider status/body are preserved in the server log; the read API
  continues returning only the existing error code.
- A regression test checks context, nested exception message/status/body, and
  unchanged `provider_failure` persistence behavior.
- Restarted the local backend with the compiled change. Bootstrap was explicitly
  disabled and Flyway disabled for this diagnostic launch; no schema changes.
- Requeued only 1811 using a transaction checking exact run/source/schema/prompt,
  failed status, attempt count, error, prior timestamp, three existing attempts,
  absence of a result, and absence of other active jobs. Required exactly one
  affected row. Preserved attempt count 3, so the worker appended attempt 4.
- Other 47 job rows and original three attempts compare identically before/after.

## Verification

- Targeted `gradlew.bat :test --tests '*PostContentAnalysisJobWorkerTest'
  --tests '*GeminiContentAnalysisProviderTest' --tests '*JourneyAi*Test'`: PASS.
  The initial unqualified `test --tests ...` selected the recommendation child
  task with no matching tests; qualification to `:test` resolved invocation scope.
- `gradlew.bat test --console=plain`: BUILD SUCCESSFUL. Backend: 238 tests,
  236 passed, zero failures/errors, two opt-in live tests skipped.
- Separate `:test` run enabling `GeminiContentAnalysisLiveSmokeTest` and
  `PostContentAnalysisLiveE2ETest`, model `gemini-3.5-flash`: both PASS.
  Integration/live E2E used the separate `journey_test` database, not `journey_db`.
- Actual localhost:8080 GET `/api/v1/posts/1811/analysis`: succeeded,
  attemptCount 4, lastErrorCode null, non-null result, model gemini-3.5-flash.
  Summary, themes, travelStyles, suggestedTags, and placeMentions all returned.
  Independent SQL confirms one stored result and succeeded attempt 4.
- Journey AI real service regression: PASS using a temporary Spring context,
  existing post 1811, actual Gemini model `gemini-3.5-flash`, and eight grounded
  posts. Called `JourneyAiService.chat` with the existing author; this verifies
  real retrieval/provider/response handling, not HTTP authentication or browser UI.
  The temporary context disabled worker/bootstrap/Flyway and closed after the call.
- `git diff --check`: PASS. Existing unrelated user edits preserved.

Local evidence: `build/content-analysis-1811/` contains requeue.sql, before/after
checks, API JSON, targeted/full/live test logs, and a preserved full test report.
No secrets were added to these diagnostic scripts.

Architecture impact: none. No domain vocabulary, provider schema, model selection,
retry policy, public API, storage contract, migration, or Journey AI code changed.
Historical exception detail remains unavailable; current failure was not reproduced.
