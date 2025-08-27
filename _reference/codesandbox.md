# CodeSandbox SDK: Managing MicroVMs (Sandboxes)

This document is a complete, practical guide to creating, operating, forking, exposing, and securing CodeSandbox microVMs ("sandboxes") using the CodeSandbox SDK and CLI.

It is intended as a one-stop reference for new developers to build a strong mental model and immediately implement production-grade flows.

## Table of Contents
- Concepts and Terminology
- Setup and Authentication
- Creating and Connecting to Sandboxes
- Lifecycle Management (Resume, Hibernate, Restart, Shutdown)
- Templates (Build and Use)
- Forking (Live and Snapshot)
- Sessions (Permissions, Env, Git, Host Tokens)
- Filesystem (Read/Write/Copy/Watch/Download)
- Commands vs Tasks
- Ports and Hosts (URLs, Tokens, Clickable Links)
- Browser Embedding (Iframes and Preview API)
- Privacy Models and Access
- Bulk Operations and Observability
- Updates and Agent Versioning
- Troubleshooting and Gotchas

---

## Concepts and Terminology

- Sandbox: A persistent Firecracker microVM with a workspace filesystem. Each sandbox has a unique `id` and runs an agent you interact with via the SDK.

- Template: A pre-baked snapshot (built from files/commands via the CLI) optimized for fast, deterministic boots. Identified by a template id returned by the build (e.g., `69vrxg`). There is no `pt_` prefix requirement. Creating a sandbox from a template yields `bootupType = "FORK"`.

- Snapshot: Saved state of a sandbox created on hibernation (memory/disk). Snapshots enable fast resume and forking. A "live snapshot" is effectively cloning a running VM with minimal overhead.

- Bootup Types:
  - `FORK`: Started from a template/snapshot fork.
  - `RUNNING`: Already running at the time of `resume`.
  - `RESUME`: Resumed from a hibernated snapshot.
  - `CLEAN`: Fresh boot (no valid snapshot). Expect setup steps (Docker build/start, setup tasks).

- Session: A connection context to a sandbox. Can be a global session (server) or user-scoped with permissions, env, git credentials, and host tokens. Each session runs inside a Docker container user context.

- Hosts/Ports: Services listening inside the VM are exposed at `https://<sandbox-id>-<port>.csb.app`. Access control depends on privacy and tokens.

- Tasks vs Commands: Tasks are long-running, managed entries defined in `.codesandbox/tasks.json` (dev servers, watchers). Commands are ad-hoc one-offs (`run`/`runBackground`).

- Persistence Tiers:
  - Memory: ~0.5–2s resume (kept ~7 days, plan-dependent)
  - Disk: ~5–20s boot
  - Archived: ~20–60s recreate

---

## Setup and Authentication

Install the SDK (and use the CLI with npx):

```bash
npm install @codesandbox/sdk
```

Obtain an API key: https://codesandbox.io/t/api and set it in your environment:

```bash
export CSB_API_KEY=your_api_token
```

Initialize the SDK:

```ts
import { CodeSandbox } from "@codesandbox/sdk";

const sdk = new CodeSandbox(process.env.CSB_API_KEY!);
```

---

## Creating and Connecting to Sandboxes

Create a sandbox and run a command:

```ts
import { CodeSandbox, VMTier } from "@codesandbox/sdk";

const sdk = new CodeSandbox(process.env.CSB_API_KEY!);

const sandbox = await sdk.sandboxes.create({
  // Optional: fork from a template id or an existing sandbox id
  // id: "your-template-id",
  vmTier: VMTier.Pico,
  privacy: "private", // "public" | "private" | "public-hosts"
  ipcountry: "US",    // prefer closest cluster
  hibernationTimeoutSeconds: 1800,
  automaticWakeupConfig: { http: true, websocket: true },
});

const client = await sandbox.connect();
const output = await client.commands.run("echo 'Hello from CodeSandbox'");
console.log(String(output).trim());
```

Handling CLEAN bootups (fresh starts where setup must run):

```ts
const client = await sandbox.connect();

if (client.bootupType === "CLEAN") {
  const steps = client.setup.getSteps();
  for (const step of steps) {
    console.log(`Step: ${step.name} -> ${step.command}`);
    const stream = await step.open();
    step.onOutput((chunk) => process.stdout.write(chunk));
    await step.waitUntilComplete();
  }
}
```

---

## Lifecycle Management (Resume, Hibernate, Restart, Shutdown)

Hibernate (save snapshot) and resume:

```ts
await sdk.sandboxes.hibernate(sandbox.id);

const resumed = await sdk.sandboxes.resume(sandbox.id);
const client = await resumed.connect();
console.log(resumed.bootupType); // RESUME | CLEAN | RUNNING
```

Restart (fresh boot on latest agent; new reference):

```ts
let sb = await sdk.sandboxes.resume("sandbox-id");
sb = await sdk.sandboxes.restart(sb.id);
// Create a new session after restart
```

Shutdown (no snapshot; next start is CLEAN):

```ts
await sdk.sandboxes.shutdown("sandbox-id");
```

Update while running:

```ts
await sandbox.updateTier(VMTier.Micro);
await sandbox.updateHibernationTimeout(60);
```

---

## Templates (Build and Use)

Templates capture a ready-to-run environment for fast, reproducible creation.

1) Prepare files and tasks under a directory (e.g. a Vite app). Define tasks:

```jsonc
// .codesandbox/tasks.json
{
  "setupTasks": ["npm install"],
  "tasks": {
    "dev-server": {
      "name": "Dev Server",
      "command": "npm run dev",
      "preview": { "port": 5173 },
      "runAtStart": true
    }
  }
}
```

2) Optionally add a devcontainer to provision OS/tooling:

```json
// .devcontainer/devcontainer.json
{ "image": "ubuntu:22.04" }
```

3) Build a template with the CLI (from your project dir):

```bash
CSB_API_KEY=... npx @codesandbox/sdk build . \
  --privacy private \
  --vm-tier Micro \
  --vm-build-tier Micro \
  --ports 5173 \
  --alias my-template
```

You’ll receive a template id (format may vary, e.g., `69vrxg`). Use it when creating sandboxes:

```ts
const sb = await sdk.sandboxes.create({ id: "your-template-id" });
```

Notes:
- Put OS/tooling in the Docker image/devcontainer. Put project setup (deps/build) in `setupTasks`. Avoid long-running processes in `setupTasks`.
- `--ports` ensures the preview is healthy before snapshotting the template.

---

## Forking (Live and Snapshot)

Live fork (clone current running state):

```ts
const base = await sdk.sandboxes.resume("base-id");
const fork = await sdk.sandboxes.create({ id: base.id });
const client = await fork.connect();
```

Snapshot fork (consistent latest snapshot):

```ts
await sdk.sandboxes.hibernate("base-id");
const fork = await sdk.sandboxes.create({ id: "base-id" });
```

Forking is useful for checkpoints, branching experiments, and creating isolated copies of state without repeating setup.

---

## Sessions (Permissions, Env, Git, Host Tokens)

Global session (server) with full write:

```ts
const client = await sandbox.connect();
```

User session (permissions, env, git, and host token):

```ts
const session = await sandbox.createSession({
  id: "user-123",
  permission: "read", // or "write" (default)
  env: { FOO: "bar" },
  git: {
    email: "dev@example.com",
    name: "Dev",
    accessToken: "ghp_...", // optional
    provider: "github.com",
  },
  hostToken: await sdk.hosts.createToken(sandbox.id, {
    // optional, constrain lifetime
    // expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  }),
});
```

Client-side connections:

```ts
// Node client (e.g. React Native)
import { connectToSandbox } from "@codesandbox/sdk/node";

const client = await connectToSandbox({
  session: await fetchSessionFromServer(),
  getSession: () => fetchSessionFromServer(),
});

// Browser client
import { connectToSandbox } from "@codesandbox/sdk/browser";

const client = await connectToSandbox({
  session: initialSessionFromServer,
  getSession: (id) => fetchJson(`/api/sandboxes/${id}`),
  onFocusChange: (notify) => {
    const onVis = () => notify(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  },
});
```

Storage notes:
- `/project/workspace` is shared across sessions and persisted.
- `~/.private` is per-session and not persisted across restarts.

---

## Filesystem (Read/Write/Copy/Watch/Download)

All paths are relative to `/project/workspace`.

```ts
// Text
await client.fs.writeTextFile("./hello.txt", "Hello");
const text = await client.fs.readTextFile("./hello.txt");

// Binary
await client.fs.writeFile("./data.bin", new Uint8Array([1,2,3]));
const bytes = await client.fs.readFile("./data.bin");

// List and mutate
await client.fs.readdir("./");
await client.fs.copy("./hello.txt", "./hello-copy.txt");
await client.fs.rename("./hello-copy.txt", "./hello-renamed.txt");
await client.fs.remove("./hello-renamed.txt");

// Watch
const watcher = await client.fs.watch("./", { recursive: true, excludes: [".git"] });
watcher.onEvent((e) => console.log(e));
// watcher.dispose();

// Download zip URL (valid for ~5 minutes)
const { downloadUrl } = await client.fs.download("./");
```

Persistence relies on git tracking. `.gitignore` influences what is ignored during persistence.

---

## Commands vs Tasks

Commands (ad-hoc):

```ts
// One-shot
await client.commands.run("npm ci");

// Long-running
const cmd = await client.commands.runBackground("npx -y serve .");
await client.ports.waitForPort(3000);
// cmd.kill(); cmd.restart();
```

Tasks (managed, recommended for dev servers):

```jsonc
// .codesandbox/tasks.json
{
  "tasks": {
    "dev": {
      "name": "Dev Server",
      "command": "pnpm dev",
      "runAtStart": true,
      "restartOn": { "files": ["package.json"], "clone": true, "resume": false },
      "preview": { "port": 5173 }
    },
    "build": { "name": "Build", "command": "pnpm build" }
  }
}
```

```ts
const task = client.tasks.get("dev");
await task.run();
const port = await task.waitForPort();
console.log(port.host);
task.onOutput((chunk) => process.stdout.write(chunk));
await task.open();
```

---

## Ports and Hosts (URLs, Tokens, Clickable Links)

When a process listens on a port, a host is exposed automatically as `https://<sandbox-id>-<port>.csb.app`.

Monitoring and waiting for ports:

```ts
client.ports.onDidPortOpen((info) => {
  console.log("Opened:", info.port, client.hosts.getUrl(info.port));
});

const info = await client.ports.waitForPort(3000);
console.log("Ready at:", info.host);
```

Private access and signed URLs:

```ts
// Generates a signed URL (uses host token embedded in session if present)
const url = client.hosts.getUrl(5173);
```

Make a sandbox private but keep hosts public for sharing demos:

```ts
const sb = await sdk.sandboxes.create({ privacy: "public-hosts" });
// Hosts like https://<id>-3000.csb.app are public; code/files remain private
```

Strictly private hosts with tokens (server-side):

```ts
const token = await sdk.hosts.createToken(sandbox.id, {
  // expiresAt: new Date(Date.now() + 60 * 60 * 1000)
});

// Pass token to a session for client-side URL generation
const session = await sandbox.createSession({ id: "user", hostToken: token });
```

---

## Browser Embedding (Iframes and Preview API)

Basic iframe (public or signed URL):

```html
<iframe src="https://<sandbox-id>-5173.csb.app" style="width:100%;height:600px;border:0"></iframe>
```

Enhanced browser API with history/messaging:

```ts
import { connectToSandbox, createPreview } from "@codesandbox/sdk/browser";

const client = await connectToSandbox({ session, getSession });
const preview = createPreview(client.hosts.getUrl(5173));

document.querySelector('#preview-container')!.appendChild(preview.iframe);

preview.onMessage((msg) => console.log(msg));
preview.setUrl("/some-path");
// preview.back(); preview.forward(); preview.reload();
```

Allow embedding origins (Preview API):

```bash
npx @codesandbox/sdk preview-hosts add your.domain.com
```

---

## Privacy Models and Access

- `public`: sandbox + hosts are public.
- `private`: sandbox private; hosts require tokens.
- `public-hosts`: sandbox private; hosts are public.

Host token management:

```ts
const token = await sdk.hosts.createToken(sandbox.id, { /* expiresAt? */ });
// Revoke/update/list via CLI if needed
```

---

## Bulk Operations and Observability

List currently running VMs and resource limits:

```ts
const running = await sdk.sandboxes.listRunning();
console.log(`${running.concurrentVmCount}/${running.concurrentVmLimit}`);
for (const vm of running.vms) {
  console.log(vm.id, vm.lastActiveAt, vm.sessionStartedAt, vm.specs);
}
```

Bulk stop (hibernate or shutdown):

```ts
const running = await sdk.sandboxes.listRunning();
await Promise.all(running.vms.map((vm) => sdk.sandboxes.hibernate(vm.id)));
// or: await Promise.all(running.vms.map((vm) => sdk.sandboxes.shutdown(vm.id)));
```

Direct metadata fetch:

```ts
const info = await sdk.sandboxes.get("sandbox-id");
console.log(info.title, info.tags, info.privacy);
```

Interactive CLI dashboard:

```bash
npx @codesandbox/sdk
```

---

## Updates and Agent Versioning

If a sandbox is out of date, restart to get the latest agent:

```ts
const sb = await sdk.sandboxes.resume("sandbox-id");
if (!sb.isUpToDate) {
  await sdk.sandboxes.restart(sb.id);
}
```

---

## Troubleshooting and Gotchas

- CLEAN bootups: A fresh start triggers Docker build/start and `setupTasks`. Surface progress in your UI using `client.setup.getSteps()` and wait for completion.

- Service binding: Ensure dev servers bind to `0.0.0.0` (not `localhost`) so the port is accessible externally and discoverable by the agent.

- Snapshot timing: Immediately resuming after requesting hibernation may wait for snapshot finalization. Expect small variance in resume latency.

- Long-running processes: Put them in Tasks, not in `setupTasks`. `setupTasks` should configure, not block.

- Preview embedding: If using the Preview API (iframe with messaging), add allowed origins via `preview-hosts add`. For private sandboxes, either use `public-hosts` or pass host tokens and generate signed URLs with `client.hosts.getUrl(port)`.

- Token handling: Treat host tokens as secrets. Use expirations for time-limited sharing. Revoke when no longer needed.

- Region selection: Use `ipcountry` on create to bias to the closest cluster for lower latency.

---

## API Cheat Sheet

```ts
// Create / Resume
sdk.sandboxes.create({ id?, vmTier?, privacy?, ipcountry?, hibernationTimeoutSeconds?, automaticWakeupConfig? })
sdk.sandboxes.resume(id)

// Lifecycle
sdk.sandboxes.hibernate(id)
sdk.sandboxes.restart(id)   // fresh boot, new reference
sdk.sandboxes.shutdown(id)  // no snapshot

// Metadata
sdk.sandboxes.get(id)
sdk.sandboxes.listRunning()

// Updates
sandbox.updateTier(VMTier.Micro)
sandbox.updateHibernationTimeout(900)

// Sessions
sandbox.connect() // global session (server)
sandbox.createSession({ id: "user", permission: "read", env: { FOO: "bar" } })

// Filesystem
client.fs.writeTextFile/readTextFile
client.fs.writeFile/readFile
client.fs.readdir/copy/rename/remove
client.fs.watch / client.fs.download

// Commands / Tasks
client.commands.run / runBackground
client.tasks.get(id).run/stop/restart/open/waitForPort

// Ports / Hosts
client.ports.onDidPortOpen / getAll / waitForPort
client.hosts.getUrl(port) // signed URL when private
sdk.hosts.createToken(sandboxId, { expiresAt? })

// Boot diagnostics (CLEAN)
client.setup.getSteps(); // step.open(); step.onOutput(); step.waitUntilComplete();
```

---

With these patterns, you can reliably spin up sandboxes from templates, fork them, expose services to the internet, embed them in your app, and manage their full lifecycle with strong security controls.
