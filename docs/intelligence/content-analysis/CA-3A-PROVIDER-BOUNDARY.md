# CA-3A Provider Boundary Hardening

## 상태

`IMPLEMENTED / PROVIDER_RUNTIME_NOT_CONNECTED / DB_NOT_CHANGED`

## 목적

모델/provider가 생성한 payload와 서버가 소유해야 하는 provenance를 분리한다.

## Provider 소유 범위

`ProviderAnalysisOutputV1`

- sourceLanguage
- summary
- themes
- travelStyles
- suggestedTags
- placeMentions
- confidence

Provider는 `analysisRunId`, `schemaVersion`, `sourceContentVersion`, `promptVersion`,
`status`, `createdAt`을 생성하거나 결정하지 않는다.

## 서버 소유 범위

`PostContentAnalysisWorker`가 claimed job과 서버 설정을 기준으로 아래 값을 결합한다.

- analysisRunId
- schemaVersion
- sourceContentVersion
- modelVersion
- promptVersion
- status
- createdAt

`modelVersion`은 모델 응답 본문에서 읽지 않고 Provider adapter의 immutable configuration
metadata인 `ContentAnalysisProvider.modelVersion()`에서 가져온다.

## 검증 경계

1. Provider payload를 `validateProviderOutput`으로 검증한다.
2. Worker가 provenance를 결합해 `PostContentAnalysisResultV1`을 만든다.
3. 완성된 결과를 `validateResult`로 다시 검증한 뒤 append-only result store에 저장한다.
4. payload validation 실패는 기존 CA-2A 정책대로 retry 후 quarantine 처리한다.
5. provider runtime 예외는 기존 CA-2A 정책대로 backoff 후 failed 처리한다.

## 비범위

- Gemini/Spring AI 연결
- API key 또는 model endpoint 설정
- DB/JPA/Flyway
- Scheduler/Spring Bean 연결
- Feed/Post Detail 응답 변경
- 실제 Content Analysis production runtime 활성화
