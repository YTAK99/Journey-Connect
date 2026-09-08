# EX-0 Current Baseline Audit

## 상태

`COMPLETE / DESIGN BASELINE LOCKED`

## 기준선

- repository: `YTAK99/Journey-Connect`
- source branch: `feat/content-analysis-AI`
- source HEAD: `5a9f2a90890d07dbb7b4063ec3bcc52bfc0c9e8d`
- integration target: `develop`
- source PR: `#11 feat: 게시글 AI 콘텐츠 분석 및 요약 기능 추가`
- source HEAD latest Flyway: `V16__post_content_analysis_persistence.sql`

## 현재 Explore

```text
GET /api/v1/explore
→ PostController.explore
→ PostService.explore(keyword, region, pageable)
→ JourneyPostRepository.explore
→ PageResponse<PostDtos.Summary>
```

현재 정렬은 `createdAt DESC, id DESC`다.

keyword 검색 대상은 제목, 본문, legacy regionName, Region.searchText/countryCode, post tag다.
region은 code/name/searchText/country alias 범위를 제한하는 filter 의미다.

## 현재 frontend

```text
keyword 있음 → getExplore({ keyword, size: 100 })
keyword 없음 → getFeed({ size: 100 })
```

현재 SearchPage는 받은 결과를 브라우저에서 region/keyword로 한 번 더 필터링하며 추가 pagination은 없다.

## 보호 경계

- `/api/v1/feed` Home Recommendation 의미 변경 금지
- Home recommendation cursor 재사용 금지
- P0/P1/P2 policy 및 behavior semantics 변경 금지
- Content Analysis V1 feature를 Explore V1 authoritative feature로 사용하지 않음
- PostGIS/route/place resolution 비의존
- DB/Flyway 변경 없음

## EX-0 판정

Explore V1은 기존 Search와 신규 Discovery를 분리하고, Home Recommendation runtime 전체를 재사용하지 않는다.
