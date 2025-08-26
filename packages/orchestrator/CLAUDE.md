# @repo/orchestrator

Purpose: Compose provider + process manager + agent + credentials installer into simple actions suitable for server endpoints.

Quickstart
```ts
import { createOrchestrator } from '@repo/orchestrator';
const orch = createOrchestrator({ provider, processManager, agent, credentialsInstaller, logger });
const { instanceId } = await orch.bootAndPrepare('snapshot_abc', { ttl_seconds: 1800 });
await orch.startSession(instanceId, { prompt: 'Say hi' });
```

Key Exports
- createOrchestrator({ provider, processManager, agent, credentialsInstaller?, logger? }) → Orchestrator

Errors
- Delegated to underlying packages; wrap with context where appropriate in callers.

Gotchas
- Provider owns readiness; do not add client-side polling here.
- `.machine.json` written with mode 640 by default.

