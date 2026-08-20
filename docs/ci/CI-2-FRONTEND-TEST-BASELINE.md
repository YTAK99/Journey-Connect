# CI-2 Frontend Test Baseline

## Status

`PATCH_READY / LOCAL_VERIFICATION_PENDING / REMOTE_VERIFICATION_PENDING`

## Purpose

CI-1 established an always-present PR merge gate and routed frontend changes through `Frontend CI`.
CI-2 adds an executable frontend test contract so frontend CI verifies behavior in addition to lint and production build success.

This baseline intentionally starts with deterministic Node-environment tests. It does not introduce a browser emulator or React Testing Library yet.

## Why Vitest

Journey Connect already uses Vite 8 and Node 22 in frontend CI. Vitest 4 requires Vite 6+ and Node 20+, so the existing toolchain is compatible without changing production runtime dependencies.

Pinned baseline:

- `vitest: 4.1.10`
- test command: `vitest run`

## Files

- `jc-frontend/package.json`
  - adds `npm run test`
  - adds Vitest as a dev dependency
- `jc-frontend/src/services/postApi.test.js`
  - verifies feed cursor request shape
  - verifies default feed request shape
  - verifies Explore keyword/region forwarding
  - verifies feed response shape normalization
- `jc-frontend/src/utils/region.test.js`
  - verifies localized name selection
  - verifies region search text construction
  - verifies stable code matching
  - verifies Google Place based custom preference normalization
- `.github/workflows/frontend-ci.yml`
  - runs frontend tests after lint and before production build

## CI sequence

```text
npm ci
-> npm run lint
-> npm run test
-> npm run build
```

Any test failure fails `Frontend / verify`; PR Gate then propagates that failure to `Merge Gate`.

## Dependency lock requirement

The implementation patch updates `package.json` but intentionally does not synthesize `package-lock.json`.
After applying the patch, regenerate the lockfile using npm from the repository root:

```powershell
npm --prefix .\jc-frontend install --package-lock-only --ignore-scripts
```

Then verify with `npm ci` so the committed lockfile is the exact dependency authority used by CI.

## Explore behavioral test follow-up

PR #13 (`feat/explore-recommendation-v1`) is still open while this baseline is prepared. Its `SearchPage.jsx` contains behavior that is not present on current `develop`, including:

- no query -> Explore Discovery API
- query -> explicit Explore Search API
- selected region propagation
- discovery cursor pagination
- duplicate suppression during load-more
- stale request protection
- cursor-error restart behavior
- empty-search recommendations sourced from Explore Discovery

Those tests should be added only after PR #13 lands on `develop`. At that point CI can add a browser-like test environment plus React Testing Library without coupling this baseline PR to an unmerged feature branch.

## Verification

From repository root:

```powershell
npm --prefix .\jc-frontend install --package-lock-only --ignore-scripts
npm --prefix .\jc-frontend ci
npm --prefix .\jc-frontend run lint
npm --prefix .\jc-frontend run test
npm --prefix .\jc-frontend run build
```

Expected result: all commands pass and `package-lock.json` is updated only for the added test runner dependency graph.

## Residual risks

- `develop` branch protection remains blocked by repository-admin permission, so GitHub does not yet enforce `Merge Gate` at repository policy level.
- Existing npm audit findings are not modified by CI-2; dependency-security remediation remains separate work.
- DOM/component behavioral coverage remains deferred until the Explore feature branch is merged.
