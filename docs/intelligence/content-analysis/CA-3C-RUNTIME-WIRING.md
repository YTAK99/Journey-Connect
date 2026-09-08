# CA-3C Content Analysis Runtime Wiring

## 상태

`IMPLEMENTED / DISABLED_BY_DEFAULT / NO_JOB_RUNTIME / DB_NOT_CHANGED`

## 목적

CA-3B의 Gemini adapter를 Spring application context에 안전하게 연결한다.
기능이 꺼져 있을 때는 Gemini `ContentAnalysisProvider` bean을 만들지 않는다.

## 활성화 계약

기본값:

```text
JC_AI_CONTENT_ANALYSIS_ENABLED=false
SPRING_AI_CHAT_MODEL=none
```

실제 Gemini adapter bean을 만들려면 둘 다 명시해야 한다.

```text
JC_AI_CONTENT_ANALYSIS_ENABLED=true
SPRING_AI_CHAT_MODEL=google-genai
GOOGLE_AI_API_KEY=<secret>
JC_AI_CONTENT_MODEL=gemini-2.5-flash
```

`enabled=true`인데 `spring.ai.model.chat`이 `google-genai`이 아니거나
`ChatModel` bean이 존재하지 않으면 startup을 실패시킨다. 활성화 오설정을 조용히 무시하지 않는다.

## Bean 범위

항상 등록:

- `PostContentAnalysisValidator`

기능 활성화 시에만 등록:

- `ContentAnalysisProvider` -> `GeminiContentAnalysisProvider`

아직 등록하지 않음:

- `PostContentAnalysisJobService`
- `PostContentAnalysisWorker`
- Scheduler
- Job/Input/Result store implementation

위 객체는 persistence/runtime gate 이후 연결한다.

## provenance

`app.intelligence.content-analysis.model-version`과
`spring.ai.google.genai.chat.options.model`은 동일한 `JC_AI_CONTENT_MODEL` 환경변수를 참조한다.
따라서 provider가 기록하는 `modelVersion`과 실제 요청 모델 설정의 drift를 피한다.

## 테스트 원칙

- 기본 context: provider bean 없음
- feature on + model selection mismatch: startup fail
- feature on + ChatModel 없음: startup fail
- feature on + google-genai + ChatModel 존재: Gemini provider bean 생성
- mutable model alias: startup fail

테스트는 mock `ChatModel`만 사용하며 외부 Gemini API를 호출하지 않는다.
