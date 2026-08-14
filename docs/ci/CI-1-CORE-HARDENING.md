# CI-1 Core CI Hardening

## 1. 문서 정보

| 항목 | 값 |
|---|---|
| 단계 | `CI-1` |
| 상태 | `PATCH_READY / REMOTE_VERIFICATION_PENDING` |
| 기준 | `CI-0-CURRENT-BASELINE-AUDIT.md` |
| Production feature 변경 | 없음 |
| DB / Flyway 변경 | 없음 |

## 2. 목적

중요한 회귀는 merge 전에 막고, core/backend consumer 경계를 자동 검증하며, 변경 없는 영역의 runner 사용과 artifact 저장을 줄인다.

## 3. 변경 파일

```text
.github/workflows/pr-gate.yml                         [NEW]
.github/workflows/backend-ci.yml
.github/workflows/frontend-ci.yml
.github/workflows/recommendation-java-port-ci.yml
docs/ci/CI-0-CURRENT-BASELINE-AUDIT.md              [NEW]
docs/ci/CI-1-CORE-HARDENING.md                       [NEW]
```

## 4. 구현 내용

### 4.1 Always-present PR Gate

모든 PR에서 `PR Gate` workflow는 실행된다.

`Detect Changes`가 다음 scope만 결정한다.

- backend
- frontend
- recommendation core

기존 동작과의 호환을 위해:

- Backend/Frontend PR validation은 기존처럼 base가 `develop` 또는 `youngtak`일 때 수행한다.
- Recommendation Core validation은 기존처럼 PR base와 무관하게 core/build integration path 변경에 수행한다.
- `pr-gate.yml` 자체 변경은 세 scope를 모두 검증한다.

최종 `Merge Gate` job은 affected workflow가 `success`이거나 unaffected workflow가 `skipped`인 경우에만 성공한다.

### 4.2 develop push verification

세 domain workflow 모두 `develop` push를 추가한다.

```text
merge to develop
  -> 변경된 영역 workflow 재실행
```

Backend push path에는 `jc-recommendation-core/**`도 추가하여 core merge 결과가 backend consumer를 깨지 않는지 다시 검증한다.

### 4.3 Core → Backend consumer contract

core 변경 PR:

```text
Recommendation Core
  -> :jc-recommendation-core:check

Backend
  -> :test
```

Backend workflow의 명령을 `./gradlew test`에서 `./gradlew :test`로 변경한다.

의도:

- Backend는 backend root test를 전부 수행한다.
- core는 backend compile/runtime classpath의 project dependency로 계속 소비된다.
- pure core test/contract 전체는 Core workflow가 담당한다.
- Backend workflow에서 `:jc-recommendation-core:test`를 다시 선택하는 중복을 제거한다.

### 4.4 Timeout

최근 관측치 대비 충분한 여유를 둔다.

| job | 관측 | timeout |
|---|---:|---:|
| Backend | 약 1:37 ~ 2:38 | 15분 |
| Frontend | 약 0:18 | 5분 |
| Core | 약 1:17 | 기존 15분 유지 |
| Gate jobs | 수초 예상 | 2분 |

### 4.5 Least privilege

Backend/Frontend에도 다음을 명시한다.

```yaml
permissions:
  contents: read
```

Core는 기존 설정을 유지한다.

### 4.6 Artifact policy

Backend:

```text
failure only
retention 7 days
```

Frontend:

```text
dist artifact upload 제거
```

`npm run build` 자체는 그대로 남으므로 production build 검증 강도는 변하지 않는다.

### 4.7 Cache / concurrency

기존 설정이 이미 적절하므로 재구성하지 않는다.

- backend: setup-java Gradle cache
- frontend: setup-node npm cache
- core: setup-gradle
- 세 workflow: cancel-in-progress 유지
- PR Gate: PR 번호 단위 cancel-in-progress 추가

## 5. Merge Gate GitHub 설정

workflow patch가 PR에서 실제 실행되어 final check 이름을 확인한 뒤 GitHub repository admin이 `develop`에 rule을 적용한다.

권장 최소값:

```text
Require a pull request before merging: ON
Require status checks to pass before merging: ON
Required check: PR Gate workflow가 실제 발행한 final Merge Gate check
Direct push bypass: 팀 운영에 꼭 필요한 관리자만 허용하거나 없음
```

다음은 CI-1에서 강제하지 않는다.

- 승인 review 수: 팀의 실제 reviewer 운영이 확인되지 않아 `DEFERRED`
- strict up-to-date branch requirement: merge 직전 불필요한 재실행 비용을 만들 수 있어 `DEFERRED`
- 세 개 개별 path-filtered check를 required로 지정: 금지

## 6. 비용 영향

최근 실제 run을 기준으로 한 방향성:

### PR #13 같은 Backend + Frontend 변경

기존:

```text
Backend 약 158초
Frontend 약 18초
```

변경 후:

```text
Backend + Frontend
+ 매우 짧은 Detect Changes / Merge Gate
```

Core가 변경되지 않았으면 Core는 계속 skip된다.

### Core-only 변경

기존:

```text
Core 약 77초
Backend consumer CI 미실행
```

변경 후:

```text
Core check
+ Backend root test
```

runner 비용은 늘지만 이것은 실제 consumer break를 차단하기 위한 의도된 비용이다. Backend에서 core test를 중복 선택하지 않도록 `:test`로 제한한다.

### Frontend-only 변경

Frontend 검증 시간 자체는 거의 동일하지만 약 14.8 MB dist artifact의 매-run 저장을 제거한다.

### Docs-only 변경

무거운 workflow는 모두 skip되고 Detect Changes + Merge Gate만 실행된다.

## 7. 검증 계획

### 7.1 Patch / YAML

- 세 기존 workflow의 YAML parse
- 신규 `pr-gate.yml` YAML parse
- reusable `workflow_call` 존재 확인
- `develop` push trigger 확인
- Backend core path trigger 확인
- artifact 정책 확인

### 7.2 Repository root — Windows PowerShell

Backend + core 요청 기준:

```powershell
.\jc-backend\gradlew.bat -p .\jc-backend :test :jc-recommendation-core:test --no-build-cache
```

Core contract gate까지 CI와 동일하게 확인:

```powershell
.\jc-backend\gradlew.bat -p .\jc-backend :jc-recommendation-core:check --no-build-cache --no-daemon
```

Frontend:

```powershell
npm --prefix .\jc-frontend ci
npm --prefix .\jc-frontend run lint
npm --prefix .\jc-frontend run build
```

### 7.3 Remote PR

CI hardening branch를 push한 뒤 다음을 확인한다.

1. PR Gate가 항상 생성되는가
2. workflow 파일 변경 PR이므로 Backend/Frontend/Core 세 workflow가 모두 호출되는가
3. 세 called workflow가 통과하면 Merge Gate가 PASS하는가
4. 실패 workflow가 있으면 Merge Gate가 FAIL하는가
5. docs-only 후속 commit에서 무거운 workflow가 불필요하게 실행되지 않는가
6. core-only fixture branch에서 Backend + Core만 실행되는가
7. frontend-only fixture branch에서 Frontend만 실행되는가
8. develop merge 후 영향 영역 push verification이 실행되는가
9. branch rule 적용 뒤 Merge Gate 실패 상태에서 merge가 실제 차단되는가

## 8. 잔여 리스크

- Remote workflow semantics는 실제 GitHub Actions run 전까지 `REMOTE_VERIFICATION_PENDING`이다.
- Branch protection/ruleset은 admin 권한이 필요해 patch만으로 적용되지 않는다.
- 기존 action deprecation warning은 이번 hardening과 분리한다.
- CI-2 frontend behavior test infra는 PR #13 merge 후 별도 단계에서 추가한다.
