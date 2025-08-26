# @repo/providers-morph

Purpose: VMProvider implementation for Morph API with robust exec and atomic file I/O. Currently skeleton; to be implemented per spec.

Quickstart (planned)
```ts
import { createMorphProvider } from '@repo/providers-morph';
const provider = createMorphProvider({ apiKey: process.env.MORPH_API_KEY! });
```

Key Exports
- createMorphProvider({ apiKey, baseUrl?, timeoutMs?, logger?, homeDir? }) → VMProvider

Notes
- Capabilities default homeDir to '/root'.
- Exec should prefer argv; complex scripts use temp-file pattern.
- File writes should be atomic via base64/python with verification.

Testing (planned)
- Unit tests for URL building, status mapping, and atomic write planner.

