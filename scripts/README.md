# scripts/ (temporary exploration)

This folder holds temporary diagnostic and smoke scripts used during implementation. These are not part of production packages.

Guidelines
- Keep scripts small and focused; prefer a single responsibility per script.
- Print clear diagnostics (commands run, exit codes, stderr).
- Never print secrets; redact tokens in output.
- Clean up resources (PM2 processes, temp files, instances) whenever feasible.
- Use environment variables: `MORPH_API_KEY`, `SNAPSHOT_ID`, `CLAUDE_ACCESS_TOKEN`.

Suggested scripts (stubs provided):
- `pm2-recon.ts`: validate PM2 cwd/env behavior, name collisions, logs.
- `file-io-smoke.ts`: verify write/read of text/JSON/binary and permissions.
- `morph-preflight.ts`: quick checks with provider exec and/or `morphcloud` CLI parity.

