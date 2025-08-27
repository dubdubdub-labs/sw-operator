# Progress Log (Append-Only)

This is an append-only implementation log. Do not edit previous entries; always append new entries at the end with a timestamp. Keep entries dense and precise.

Entry format
- Datetime (get from bash command `date -u +%Y-%m-%dT%H:%M:%SZ`): Summary: 1–2 lines
- Done: short bullets
- Next: short bullets
- Decisions: short bullets (what we locked in)
- Issues/Risks: short bullets
- Notes/Links: short bullets (paths, refs)

---
2025-08-26T18:08:00Z: TS/Vitest strategy refined and validated
- Done: Added extendVitestConfig in @repo/vitest-config; validated config includes in typecheck and excludes from build via example package; updated CLAUDE.md and _spec docs; removed example package.
- Next: Apply pattern to existing packages incrementally.
- Decisions: Include config files (e.g., vitest.config.ts) in tsconfig.json for typecheck; exclude them in tsconfig.build.json; prefer `extendVitestConfig` from `@repo/vitest-config` over subpath imports.
- Issues/Risks: Ensure packages with custom environments switch to jsdom via overrides.
- Notes/Links: See packages/vitest-config/* and CLAUDE.md “Vitest + Config Files Strategy”.
