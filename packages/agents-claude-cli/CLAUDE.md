# @repo/agents-claude-cli

Purpose: Transform Claude CLI session input into a ProcessSpec with safe base64 encoding and sensible defaults (model, cwd).

Quickstart
```ts
import { createClaudeAgent } from '@repo/agents-claude-cli';
const agent = createClaudeAgent({ workDir: '~/operator/sw-compose' });
const spec = agent.toProcessSpec({ prompt: 'Say hi', systemPrompt: 'Be brief.' });
```

Key Exports
- createClaudeAgent({ defaultModel?, workDir? }) → Agent

Errors
- None; validation happens at orchestrator/manager layers.

Testing
- Unit tests should assert base64 handling and name sanitization (to be added).

Gotchas
- Session name sanitized to [a-zA-Z0-9-].
- CWD defaults to provider home-relative path; provider expands '~'.

