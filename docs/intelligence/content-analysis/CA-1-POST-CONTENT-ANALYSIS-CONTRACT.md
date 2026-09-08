# CA-1 Post Content Analysis Contract & Validator

## 상태

`IMPLEMENTED / PROVIDER_NOT_CONNECTED / DB_NOT_CHANGED`

## 범위

- `post-content-analysis-v1` 입력·결과 타입
- 분석 상태, 테마, 여행 스타일 vocabulary
- 장소 언급 후보 타입
- schema·버전·길이·중복·confidence 검증
- 원문에 존재하지 않는 장소명 차단
- 실제 모델 없이 CI에서 사용하는 Fake Provider
- 유효 JSON fixture

## 비범위

- Gemini 또는 다른 모델 호출
- Spring AI 의존성
- Job/Result 테이블과 Flyway
- 게시물 발행 이벤트 연결
- Feed/Post Detail 응답 변경
- 추천·검색 feature 공급
- AI 결과를 사용자 원문에 반영

## 계약 ID

```text
post-content-analysis-v1
post-analysis-prompt-v1
```

## 결과 원칙

- `summary`는 원문 언어로 최대 240자다.
- `themes`, `travelStyles`는 등록된 enum만 사용한다.
- `suggestedTags`는 최대 5개이며 게시물 태그를 자동 수정하지 않는다.
- `placeMentions`는 최대 10개이고 `mentionText`가 제목 또는 본문에 실제 존재해야 한다.
- 장소 후보는 지도 장소 사실이 아니다.
- `latest`, `current`, `default`는 영속 model/prompt version으로 사용할 수 없다.
- 결과 status는 `succeeded`여야 하며 실패·격리 상태는 후속 실행 기록에서 관리한다.

## 다음 단계

```text
CA-2 Persistence & Job
→ System Coordination의 DB sequence 배정 후 진행
```
