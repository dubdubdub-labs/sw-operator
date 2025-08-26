# @repo/credentials

Purpose: Reusable credential installer(s) that write files atomically via provider.files and optionally run post-install validations.

Quickstart
```ts
import { DefaultCredentialsInstaller } from '@repo/credentials';
await DefaultCredentialsInstaller.install(provider, instanceId, {
  name: 'claude',
  files: [
    { path: '~/.claude/.credentials.json', content: { token: '...', expiresAt: '...' }, mode: '600' },
  ],
});
```

Key Exports
- DefaultCredentialsInstaller.install(provider, instanceId, profile)

Errors
- Throws on write or post-install command failure.

Testing
- Use a fake provider to assert write order and options.

Gotchas
- Providers expand '~' to capabilities.homeDir.
- Binary content should be pre-encoded; string/JSON are accepted here for convenience.

