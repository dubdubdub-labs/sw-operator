# Progress Log (Append-Only)

This is an append-only implementation log. Do not edit previous entries; always append new entries at the end with a timestamp. Keep entries dense and precise.

Entry format
- Summary: 1–2 lines
- Done: short bullets
- Next: short bullets
- Decisions: short bullets (what we locked in)
- Issues/Risks: short bullets
- Notes/Links: short bullets (paths, refs)

---

## Initial spec + implementation plan
- Summary: Created architecture and implementation guides; aligned with morph/pm2 realities; set up scripts and logging approach.
- Done:
  - Wrote `_spec/ARCH.md` (modular architecture, provider/process/agent/orchestrator, errors, testing).
  - Wrote `_spec/IMPLEMENTATION.md` (phase-by-phase plan, E2E smoke, PM2 recon scripts, file-IO semantics).
  - Updated references to `_reference/*`; clarified provider exec (no `bash -lc`), PM2 specifics kept.
  - Clarified boot semantics: `instances.boot` resolves when ready (no client-side polling).
  - Documented `~` expansion based on `capabilities.homeDir`; allow overriding home directory.
  - Added CLAUDE.md guidelines per package; require `AGENTS.md` symlink.
  - Created `scripts/` folder scaffold (to be populated with recon/smoke scripts).
- Next:
  - Add script stubs: pm2 recon, file-IO smoke, morph preflight; run them against `snapshot_c1p8b6c2`.
  - Scaffold package skeletons per ARCH.md (types only for `@repo/runtime-interfaces`).
  - Define error envelope (code, operation, resource, hint) templates for all packages.
- Decisions:
  - Provider exec: prefer argv; temp-script + interpreter argv for complex cases; no forced `bash -lc`.
  - PM2 manager: use `pm2 start bash -- -lc '<payload>'` with strict cwd/env exporting inside payload.
  - Assume tools preinstalled on snapshot; use scripts to validate/adjust image rather than baking preflight into packages.
- Issues/Risks:
  - PM2 behavior differences across images; need recon scripts to lock semantics.
  - Large file writes may hit payload limits; may require chunking/verify strategy.
- Notes/Links:
  - Morph OpenAPI: `_reference/morph.json`
  - PM2 + Claude patterns: `_reference/pm2-claude-code.ts`
  - OAuth helper: `_reference/cc-oauth.ts`
