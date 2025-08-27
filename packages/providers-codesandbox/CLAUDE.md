# `@repo/providers-codesandbox`

Purpose
- VMProvider implementation for CodeSandbox SDK. This skeleton wires types and status mapping; real SDK calls come next.

Quickstart
```ts
import { createCodeSandboxProvider } from '@repo/providers-codesandbox';
const provider = createCodeSandboxProvider({ apiKey: process.env.CSB_API_KEY! });
```

Notes
- Default `capabilities.homeDir` is `/project/workspace`.
- Status mapping: FORK/RESUME/RUNNING → ready; CLEAN → booting.
- Files/exec are placeholders in the skeleton and will throw ProviderError until implemented.

