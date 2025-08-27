# `@repo/credentials`

Purpose
- Credentials installer(s) and helpers. Default installer writes files atomically (mode 600 for secrets) and optionally runs a post-install validation command.

Quickstart
```ts
import { DefaultCredentialsInstaller, buildClaudeCredentialProfile } from '@repo/credentials';

const profile = buildClaudeCredentialProfile({ authToken: '...', expiresAt: '2025-01-01T00:00:00Z' });
await DefaultCredentialsInstaller(provider, instanceId, profile);
```

Key Exports
- `DefaultCredentialsInstaller(provider, instanceId, profile)`
- `buildClaudeCredentialProfile({ authToken, expiresAt })` → writes `~/.claude/.credentials.json` with mode 600

Notes
- Uses `provider.files.writeFileAtomic(..., { createDirs: true })` to minimize roundtrips.
- Do not log secrets; callers should redact before logging.

