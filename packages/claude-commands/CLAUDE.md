# Claude Commands

## VM Provider Agnostic

The commands work with any VM provider that implements the `@repo/vm-interface`:

```typescript
import type { VMProvider } from "@repo/vm-interface";

// Works with any provider
function setupWithAnyProvider(provider: VMProvider) {
  return bootAndInitialize(provider, snapshotId, config);
}

// MorphVM
import { createMorphVMProvider } from "@repo/morph-service";
const morphVM = createMorphVMProvider(config);
await setupWithAnyProvider(morphVM);

// Future: Other providers
// const dockerVM = createDockerVMProvider(config);
// await setupWithAnyProvider(dockerVM);
```