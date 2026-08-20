# CA-3B Gemini Provider Adapter

## 상태

`IMPLEMENTED / RUNTIME_DISABLED_BY_DEFAULT / DB_NOT_CHANGED`

## 목적

CA-3A에서 분리한 provider boundary 뒤에 Spring AI Google GenAI adapter를 추가한다.
실제 runtime wiring과 게시물 발행 이벤트 연결은 아직 수행하지 않는다.

## 기술 기준

- Spring Boot: 3.5.16
- Spring AI: 1.1.8
- Starter: `spring-ai-starter-model-google-genai`
- 기본 모델 설정값: `gemini-2.5-flash`
- 모델 ID는 환경변수/설정값으로 주입하고 코드에 고정하지 않는다.

## 출력 계약

Gemini 호출은 provider-native structured output을 사용한다.
JSON Schema는 CA-1 vocabulary와 다음 제한을 고정한다.

- themes: 등록 enum만 허용
- travelStyles: 등록 enum만 허용
- suggestedTags: 최대 5개
- placeMentions: 최대 10개
- confidence: 0.0 ~ 1.0
- 정의되지 않은 top-level/nested property 금지

구조화 출력이 JSON 문법을 만족해도 semantic validation은
`PostContentAnalysisValidator`가 다시 수행한다.

## 신뢰 경계

게시물 제목/본문/지역/태그는 모델에 전달되는 데이터다.
본문 안의 지시문은 시스템 지시를 변경할 수 없다.
V1 adapter는 tool calling, Google Search grounding, 외부 장소 조회를 사용하지 않는다.

## 실패 분류

- malformed JSON / unknown vocabulary: output validation failure
- validator semantic rejection: output validation failure
- 모델/네트워크 runtime exception: provider failure

CA-2A Worker의 retry/quarantine/failed 정책이 위 분류를 처리한다.

## 설정

기본값은 Spring AI chat auto-configuration 비활성화다.

```text
SPRING_AI_CHAT_MODEL=none
```

실제 Gemini runtime을 명시적으로 켤 때만 다음 값을 사용한다.

```text
SPRING_AI_CHAT_MODEL=google-genai
GOOGLE_AI_API_KEY=<secret>
JC_AI_CONTENT_MODEL=gemini-2.5-flash
JC_AI_CONTENT_TEMPERATURE=0.1
```

테스트 profile은 항상 `spring.ai.model.chat=none`으로 고정하여
CI가 실제 API key나 외부 모델 호출에 의존하지 않게 한다.

## 비범위

- Spring Bean runtime wiring
- Scheduler 연결
- DB/JPA/Flyway
- 실제 Gemini API 호출 검증
- Feed/Post Detail 응답 변경
- production activation
