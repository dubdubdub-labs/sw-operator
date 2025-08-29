# @repo/e2e-smoke

Purpose
- Minimal end-to-end smoke checks against CodeSandbox SDK for manual verification.

Quickstart
- Set `RUN_E2E=1` and `CSB_API_KEY` in your environment. Optionally set `TESTING_TEMPLATE_ID` (default `69vrxg`).
- Run: `bunx turbo test --filter=@repo/e2e-smoke` or `bun test` inside this app.

Notes
- Tests are guarded and will no-op when `RUN_E2E` is not set.
- Avoids asserting on exact SDK output; focuses on basic exec and file IO.

