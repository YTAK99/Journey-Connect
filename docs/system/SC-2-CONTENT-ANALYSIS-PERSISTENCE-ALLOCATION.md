# SC-2 Content Analysis Persistence Allocation

## 상태

`APPROVED / IMPLEMENTATION_ALLOWED / PRODUCTION_ACTIVATION_NOT_INCLUDED`

## 기준선

- System Contract: `jc-system-contract-v1`
- Track Governance: `V1.1 / SC-1`
- canonical DB 기준: `journey-connect-db-v2.7 / 01..26`
- repository Flyway 기준: `V1..V15`
- Content Analysis:
  - CA-1 contract/validator VERIFIED
  - CA-2A job/worker contract VERIFIED
  - CA-3 provider/runtime/live smoke VERIFIED
- runtime provider activation은 기본 비활성

## SC-2 배정

System Coordination은 Content Analysis persistence에 다음 슬롯을 배정한다.

| 항목 | 배정 |
|---|---|
| target canonical DB | `journey-connect-db-v2.8` |
| canonical SQL | `27_content_analysis_persistence.sql` |
| canonical smoke | `28_content_analysis_persistence_smoke_test.sql` |
| repository Flyway bridge | `V16__post_content_analysis_persistence.sql` |
| physical writer | Journey Connect backend / Intelligence Content Analysis persistence |
| semantic owner | Intelligence Platform / Content Analysis |
| 다른 트랙 write | 금지 |

`27/28`은 canonical package용 예약이다. 현재 팀 저장소의 실행 경로는 기존 Flyway 체계와 연결되는 `V16`으로 구현한다. 두 번호 체계가 동일 번호를 의미한다고 해석하지 않는다.

## 허용 테이블

- `post_content_analysis_input_snapshot`
- `post_content_analysis_job`
- `post_content_analysis_attempt`
- `post_content_analysis_result`

## 불변 조건

1. input snapshot과 result와 attempt는 append-only다.
2. job은 운영 상태 레코드로서 상태 전이를 위해 update 가능하다.
3. dedupe key는 다음 네 필드다.
   - `post_id`
   - `source_content_version`
   - `schema_version`
   - `prompt_version`
4. 동일 source content version으로 다른 input payload를 저장하지 않는다.
5. worker claim은 PostgreSQL row lock + `SKIP LOCKED`로 단일 claim을 보장한다.
6. provider/model output은 derived evidence이며 사용자 원문을 변경하지 않는다.
7. 추천 P0/P1/P2 테이블에는 write하지 않는다.
8. Content Analysis persistence를 추천/search runtime의 authoritative feature source로 자동 전환하지 않는다.
9. scheduler, post publish hook, Feed/Post Detail 노출, 운영 활성화는 CA-2B 범위가 아니다.

## 검증 게이트

- Flyway V1..V16 fresh/test DB 적용
- 동일 dedupe key 동시 enqueue 1개 귀결
- 동일 source version payload collision 차단
- `SKIP LOCKED` claim 단일성
- attempt append evidence 생성
- result JSON round-trip
- 기존 Content Analysis unit tests
- backend 전체 regression

위 검증 전 상태는 `IMPLEMENTED_UNVERIFIED`로 유지한다.
