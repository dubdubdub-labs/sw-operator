# `@repo/process-pm2`

Purpose
- ProcessManager implementation using PM2 started via provider exec.

Quickstart
```ts
import { PM2ProcessManager } from '@repo/process-pm2';
import type { ExecAPI } from '@repo/runtime-interfaces';

const pm = PM2ProcessManager(execRunner as ExecAPI);
await pm.start(instanceId, { command: { kind: 'shell', script: 'echo hi', name: 'demo' }, restart: 'never' });
```

Notes
- Builds a payload like: `pm2 start bash --name <name> --no-autorestart -- -lc "cd <cwd> && export K=V ... && <cmd>"`.
- Avoids `--cwd`; sets cwd inside payload and exports env explicitly.
- `list()` uses `pm2 jlist`; `logs()` uses `pm2 logs --nostream`.

