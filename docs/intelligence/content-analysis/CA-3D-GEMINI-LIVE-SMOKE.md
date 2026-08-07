# CA-3D Gemini Live Smoke Probe

## 상태

`IMPLEMENTED / MANUAL_OPT_IN / EXTERNAL_API_CALL / DB_NOT_CHANGED`

## 목적

CA-3B/CA-3C에서 준비한 Google GenAI adapter가 실제 Gemini Developer API와 통신하고,
`structured output -> ProviderAnalysisOutputV1 -> semantic validator` 경계를 통과하는지
샘플 게시물 1건으로 확인한다.

## 실행 안전장치

일반 `test` 실행에서는 live smoke가 자동 skip 된다.

실제 호출은 다음 환경변수를 명시한 경우에만 실행한다.

```text
JC_AI_CONTENT_SMOKE_ENABLED=true
GOOGLE_AI_API_KEY=<secret>
```

선택:

```text
JC_AI_CONTENT_MODEL=gemini-2.5-flash
```

API key는 테스트 코드, application.yml, Git history에 기록하지 않는다.

## 검증 범위

- 실제 Gemini Developer API 통신
- `GeminiContentAnalysisProvider` 사용
- native structured JSON output 수신
- source language 형식 검증
- summary 비어 있지 않음
- enum vocabulary 역직렬화
- suggestedTags / placeMentions 제한
- 원문에 없는 place mention 차단
- confidence 0.0 ~ 1.0

## 비범위

- DB/JPA/Flyway
- Job persistence
- Scheduler
- 게시물 publish/update hook
- Feed/Post Detail API
- 운영 활성화
- 품질 benchmark
- 비용/latency SLO

## 실행

PowerShell:

```powershell
$env:JC_AI_CONTENT_SMOKE_ENABLED="true"
$env:GOOGLE_AI_API_KEY="<Google AI Studio API key>"
$env:JC_AI_CONTENT_MODEL="gemini-2.5-flash"

.\gradlew.bat :test `
  --tests "com.jc.backend.intelligence.contentanalysis.GeminiContentAnalysisLiveSmokeTest" `
  --no-build-cache
