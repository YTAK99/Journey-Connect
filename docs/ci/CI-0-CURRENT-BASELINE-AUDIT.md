# CI-0 Current CI / Merge Gate Audit

## 1. 문서 정보

| 항목 | 값 |
|---|---|
| 단계 | `CI-0` |
| 상태 | `COMPLETE / AUDITED_2026-08-14` |
| Repository | `YTAK99/Journey-Connect` |
| 기준 branch | `develop` |
| 기준 develop HEAD | `4d8fdb3822a230681b53e99b8533de4dd58616d7` |
| Explore PR | `#13` / `OPEN` |
| Explore PR HEAD | `a0e84fc00aec7c5b42a6fda4d2e1fe2013d9471a` |

## 2. 목적

현재 GitHub Actions와 GitHub merge 정책이 실제로 어떤 회귀를 막고 어떤 구멍을 남기는지 고정한다. 이 단계는 Explore 추천 로직, Home 추천, Content Analysis, DB schema를 변경하지 않는다.

## 3. 실제 기준선

현재 `.github/workflows`에는 다음 세 workflow만 존재한다.

- `backend-ci.yml`
- `frontend-ci.yml`
- `recommendation-java-port-ci.yml`

PR #13의 현재 HEAD에서는 Backend CI와 Frontend CI가 실행되어 성공했다. Recommendation Java Core CI는 PR #13이 `jc-recommendation-core`를 변경하지 않아 실행되지 않았다.

최근 관측 job duration:

| Workflow / job | 관측 duration | 비고 |
|---|---:|---|
| Backend CI / `test` | 약 2분 38초 | PR #13 |
| Backend CI / `test` | 약 1분 37초 | 최근 Content Analysis 성공 run |
| Frontend CI / `verify` | 약 18초 | PR #13 |
| Recommendation Java Core CI / `java-core-1-0` | 약 1분 17초 | 최근 성공 run |

최근 Backend 실패는 PostGIS 기동 실패가 아니라 application configuration enum binding 실패가 Spring context 전체 실패로 확산된 사례였다. 실패 당시 `82 tests completed, 28 failed, 2 skipped`가 기록되었다.

## 4. Audit 판정

| 검사 항목 | 판정 | 근거 / 영향 |
|---|---|---|
| develop branch protection | `GAP` | `develop`이 GitHub API에서 `protected=false` |
| Repository ruleset | `GAP` | ruleset 목록이 비어 있음 |
| required status checks | `GAP` | develop protection의 required checks가 비어 있음 |
| PR review requirement | `GAP` | 강제 branch/ruleset 자체가 없어 review도 merge 조건이 아님 |
| direct push 제한 | `GAP` | GitHub 정책상 develop update를 막는 protection/ruleset 없음 |
| merge 방식 | `DEFERRED` | 현재 사용 가능한 connector 응답에서 repository merge-method 설정을 신뢰성 있게 확정하지 못함 |
| path-filter required-check pending 위험 | `GAP` | 현재 required check는 없어 즉시 문제는 없지만, 기존 세 path-filtered job을 그대로 required로 만들면 미실행 check가 생성되지 않는 PR을 막을 수 있음 |
| backend/core dependency | `GAP` | backend가 core project를 소비하지만 backend workflow path에 `jc-recommendation-core/**`가 없음 |
| frontend dependency | `VERIFIED` | frontend workflow는 frontend 변경에만 반응하며 현재 backend build와 직접 결합되지 않음 |
| develop merge 후 재검증 | `GAP` | 세 workflow 모두 develop push 검증이 없음 |
| backend timeout | `GAP` | 명시 timeout 없음 |
| frontend timeout | `GAP` | 명시 timeout 없음 |
| core timeout | `VERIFIED` | `15`분 설정 존재 |
| backend artifact retention | `GAP` | 성공/실패 모두 업로드하고 별도 retention 없음 |
| frontend artifact policy | `GAP` | 약 14.8 MB `frontend-dist`를 매 run 저장하며 repository workflow 내 소비자를 찾지 못함 |
| backend/frontend permissions | `GAP` | workflow에 명시 permission 없음. 현재 runner 기본 권한은 read 위주지만 정책을 workflow에 고정하지 않음 |
| core permissions | `VERIFIED` | `contents: read` 명시 |
| concurrency / cancel-in-progress | `VERIFIED` | 세 workflow 모두 이미 존재. 이전 handoff의 후보 문제 중 이 부분은 drift됨 |
| dependency cache | `VERIFIED` | backend Gradle cache, frontend npm cache, core Gradle setup cache 사용 |
| fork PR / secrets dependency | `NON_ISSUE` | CI는 repository write secret이나 production secret에 의존하지 않고 placeholder/test config 사용 |
| PostGIS / PostgreSQL | `VERIFIED` | Backend CI가 `postgis/postgis:15-3.4` real service를 사용 |
| Flyway / schema validation | `VERIFIED` | test datasource는 PostgreSQL이며 sample config의 Flyway 활성 + Hibernate validate 경로를 Spring integration tests가 사용 |
| 별도 canonical DB smoke | `DEFERRED` | 현재 workflow에서 별도 SQL smoke/canonical DB verification task는 확인되지 않음 |
| 중요한 미실행 task | `GAP` | core의 `check`는 Wave/golden/P1/P2 JavaExec contract까지 실행하지만 backend의 `test`는 이 전체 contract gate를 대체하지 못함 |
| frontend behavioral test infra | `GAP` | `package.json`에 test script가 없고 Vitest/Testing Library dependency가 없음 |

## 5. Backend ↔ Core 실제 관계

`jc-backend/settings.gradle.kts`는 `../jc-recommendation-core`를 composite subproject가 아니라 Gradle multi-project member로 포함하고, backend는 `implementation(project(":jc-recommendation-core"))`로 직접 소비한다.

현재 Backend CI의 `./gradlew test` task selector는 backend test뿐 아니라 `:jc-recommendation-core:test`도 선택한다. 따라서 일부 core unit test가 중복 실행된다. 그러나 core `check`에 연결된 foundation/Wave1~7/golden/isolation/P1/P2 contract JavaExec 전체를 실행하는 것은 아니다.

따라서 CI-1에서는 다음처럼 역할을 분리한다.

```text
Core workflow
  -> :jc-recommendation-core:check
  -> pure core + committed contract/golden 검증

Backend workflow
  -> :test
  -> backend 전체 test + core consumer compile/runtime compatibility
```

core 변경 시에는 두 workflow를 모두 실행한다. 이렇게 하면 consumer break를 막으면서 core `test`를 Backend와 Core workflow에서 불필요하게 중복 실행하는 것을 줄일 수 있다.

## 6. Artifact 조사

최근 PR #13 기준:

- `backend-test-results`: 약 90 KB, 성공 run에도 생성, 기본 만료 약 90일
- `frontend-dist`: 약 14.8 MB, 성공 run마다 생성, 기본 만료 약 90일

현재 repository의 `.github/workflows`에는 deployment workflow가 없고 artifact 이름을 소비하는 workflow reference도 확인되지 않았다.

결정:

- Backend test report는 **실패 시에만** 업로드하고 `retention-days: 7`
- Frontend dist artifact는 CI에서 제거

외부에서 사람이 수동으로 frontend artifact를 다운로드하는 비문서화된 절차까지 repository 코드만으로 증명할 수는 없다. 필요해지면 deployment workflow에서 명시적으로 다시 생성한다.

## 7. Merge Gate 설계 판정

세 path-filtered check를 각각 required로 지정하는 방식은 채택하지 않는다.

채택 구조:

```text
PR Gate [항상 실행]
  -> Detect Changes
  -> Backend [영향 시]
  -> Frontend [영향 시]
  -> Recommendation Core [영향 시]
  -> Merge Gate [항상 success/failure 결정]
```

`Merge Gate` 하나만 branch rule의 required check 후보로 사용한다.

변경 없는 영역은 `skipped`로 처리되지만 최종 gate는 항상 생성된다. 문서-only PR은 change detection + final gate만 실행한다.

## 8. Branch / PR 전략

PR #13은 아직 open이므로 CI 변경을 PR #13에 섞지 않는다.

CI-1 branch:

```text
chore/ci-hardening-v1
```

기준:

```text
develop @ 4d8fdb3822a230681b53e99b8533de4dd58616d7
```

CI-2의 Explore `SearchPage` behavior tests는 PR #13 코드가 필요하므로 PR #13 merge 뒤 최신 develop에서 진행한다.

## 9. 잔여 리스크

- GitHub branch protection/ruleset 변경에는 repository admin 권한이 필요하며 현재 조사 connector에는 admin 권한이 없다.
- `actions/setup-java@v4` 등 일부 기존 action에 deprecation warning이 관측됐지만 CI-1에서는 불필요한 major upgrade를 섞지 않는다.
- merge method 설정은 별도 repository settings 확인 전 확정하지 않는다.
- Flyway/PostGIS의 독립 canonical smoke test 추가 여부는 DB 운영 기준선과 중복 비용을 확인한 뒤 별도 판단한다.
