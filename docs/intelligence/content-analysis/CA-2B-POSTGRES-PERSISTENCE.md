# CA-2B PostgreSQL Persistence

## 상태

`IMPLEMENTED_UNVERIFIED`

## 목적

CA-2A에서 정의한 Job/Input Snapshot/Result port를 PostgreSQL에 연결한다.

## System Coordination allocation

- SC decision: `SC-2-CONTENT-ANALYSIS-PERSISTENCE-ALLOCATION`
- canonical target: `journey-connect-db-v2.8`
- canonical sequence reservation: `27..28`
- repository Flyway: `V16__post_content_analysis_persistence.sql`

## 구현

### Input snapshot

`post_content_analysis_input_snapshot`

- `(post_id, source_content_version)` primary key
- title/content/region/sourceTags를 immutable snapshot으로 저장
- 같은 version에 다른 payload가 들어오면 application store가 collision으로 거부
- append-only trigger

### Job

`post_content_analysis_job`

- `analysis_run_id` primary key
- dedupe unique:
  `(post_id, source_content_version, schema_version, prompt_version)`
- 상태:
  `queued/running/succeeded/failed/quarantined`
- `claimNextReady`는 `FOR UPDATE SKIP LOCKED` + `UPDATE ... RETURNING`으로 atomic claim
- enqueue는 `INSERT ... ON CONFLICT DO NOTHING` 후 canonical existing row 반환

### Attempt

`post_content_analysis_attempt`

- `(analysis_run_id, attempt_number)` primary key
- running job이 retry/succeeded/failed/quarantined로 닫힐 때 append
- retry/failure evidence를 job row update와 분리하여 보존
- append-only trigger

### Result

`post_content_analysis_result`

- `analysis_run_id` primary key
- JSONB:
  themes/travelStyles/suggestedTags/placeMentions
- succeeded result만 저장
- append-only trigger
- 동일 run에 동일 payload 재append는 idempotent
- 동일 run에 다른 payload는 conflict

## crash boundary 보완

result가 저장된 뒤 job terminal update 직전에 장애가 난 경우를 위해 Worker는 provider를 다시 호출하기 전에 existing result를 확인한다.

existing result가 valid하면 provider 재호출 없이 job을 `succeeded`로 복구한다.

## 비범위

- scheduler
- post publish/update hook
- Feed/Post Detail API
- UI
- recommendation/search feature cutover
- production activation
