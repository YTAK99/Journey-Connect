# EX-7 Frontend Integration

## Status

IMPLEMENTED / LOCAL LINT-BUILD PENDING

## Purpose

Explore UI의 blank state가 Home `/feed`를 discovery source로 사용하던 현재 동작을 제거하고, EX-6의 Explore Discovery endpoint를 실제 화면에 연결한다.

## Route semantics

`/explore` 화면은 UI route 하나를 유지하지만 요청 의도에 따라 backend contract를 분리한다.

```text
keyword nonblank
→ GET /api/v1/explore
→ Explicit Search

keyword blank
→ GET /api/v1/explore/discovery
→ Explore Discovery
```

Home `/feed`는 Explore primary list 또는 empty-state recommendation source로 사용하지 않는다.

## Region

선택 지역은 더 이상 browser-only filter가 아니다.

우선순위:

```text
selectedRegion.code
→ localized label
→ empty
```

를 backend `region` parameter로 전달한다.

- Explicit Search: region hard filter
- Discovery: region hard filter
- client-side duplicate region filtering 제거

서버가 eligibility와 region scope의 authoritative source다.

## Discovery pagination

첫 요청:

```text
GET /api/v1/explore/discovery?region=...&size=20
```

응답의:

- `items`
- `nextCursor`
- `hasNext`

를 보관한다.

`더 보기` 요청:

```text
GET /api/v1/explore/discovery?region=...&cursor=...&size=20
```

결과는 기존 목록 뒤에 추가한다.

방어적으로 post ID를 한 번 더 dedupe하되, 중복 방지의 authoritative guarantee는 backend frozen cursor contract다.

Explicit Search는 기존 PageResponse API를 유지하고 V1 UI에서는 기존처럼 한 번에 최대 100건을 요청한다.

## Cursor reset

다음 값 중 하나가 변경되면 discovery cursor를 폐기하고 첫 페이지부터 다시 시작한다.

- keyword
- selected region

`requestKey = keyword|region`을 사용해 이전 요청의 늦은 응답이 새 화면 상태를 덮어쓰지 못하게 한다.

## Empty-state recommendation

검색/지역 결과가 비었을 때 보여주는 Journey Picks도 Home feed를 호출하지 않는다.

```text
GET /api/v1/explore/discovery?size=12
```

all-region discovery 결과를 받아 기존 nearby/recent presentation 로직에 전달한다.

## Changed files

```text
jc-frontend/src/services/postApi.js
jc-frontend/src/pages/SearchPage.jsx
docs/recommendation/explore/EX-7-FRONTEND-INTEGRATION.md
```

## Database impact

없음.

## Backend impact

없음. EX-6 additive endpoint를 소비할 뿐이다.

## Existing contract protection

변경하지 않는다.

- Home `/api/v1/feed`
- Explicit Search `/api/v1/explore`
- Home recommendation cursor/run
- Content Analysis UI/API
- PostGIS/place/route

## Verification

현재 frontend에는 별도 test runner가 없으므로 EX-7 local gate는 다음이다.

```text
npm run lint
npm run build
```

수동 확인 항목:

1. blank keyword → `/explore/discovery`
2. keyword nonblank → `/explore`
3. 양쪽 모두 selected region 전달
4. keyword clear → discovery cursor reset
5. region change → cursor reset
6. 더 보기 → next cursor 요청
7. 중복 post append 없음
8. 오래된 request가 새 query 결과를 overwrite하지 않음
9. empty-state Journey Picks가 `/feed`를 호출하지 않음

전체 backend/frontend regression은 EX-8에서 수행한다.

## Next

EX-8 — Verification / Regression
