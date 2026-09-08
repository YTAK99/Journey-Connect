# CA-2A Content Analysis Job & Idempotency Contract

## 상태

`IMPLEMENTED_CONTRACT_ONLY / DB_ADAPTER_HOLD / PROVIDER_NOT_CONNECTED`

## 목적

CA-1의 분석 결과 계약 위에 비동기 실행에 필요한 job, input snapshot, result append port와 재시도 경계를 정의한다.

## 구현 범위

- `(postId, sourceContentVersion, schemaVersion, promptVersion)` dedupe key
- immutable source input snapshot port
- queued/running/succeeded/failed/quarantined job state
- atomic claim을 요구하는 `claimNextReady` persistence port
- validation 실패 1회 재시도 후 quarantine
- provider/runtime 실패 최대 3회 후 failed
- exponential backoff 기본값 30s → 60s → terminal
- result append-only port
- run/prompt version binding 검증

## 의도적으로 미구현

- JPA entity
- PostgreSQL table/index
- Flyway migration
- Spring scheduler wiring
- 실제 Gemini/Spring AI provider
- 게시물 publish/update hook
- Feed/Post Detail 응답 변경

## Governance gate

현재 System Contract는 canonical DB sequence를 System Coordination이 배정하도록 하고, Track Governance는 DP-2 및 교차 트랙 contract 이후에 Content Analysis runtime을 배치한다.
따라서 CA-2A는 production persistence/runtime이 아닌 port/state contract까지만 구현한다.

## 다음 단계

```text
CA-2B Persistence Adapter
→ DP-2 / System Coordination DB sequence 및 persistence authority 확인 후
```
