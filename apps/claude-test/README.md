# Claude VM Test App

Test application for Claude commands with MorphVM provider.

## Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your MorphVM credentials in `.env`:
- `MORPH_API_KEY` - Your MorphVM API key
- `SNAPSHOT_ID` - The snapshot ID to boot from
- `ITERATION_ID` (optional) - For Claude sync

3. Install dependencies:
```bash
bun install
```

## Usage

### Quick Test
Run a complete test that boots an instance, sets up Claude, and starts a session:

```bash
bun run test
```

This will:
1. Start OAuth flow to get Claude access token
2. Boot a MorphVM instance
3. Setup Claude credentials (1 network call with atomic write)
4. Setup machine info (1 network call with atomic write)
5. Start a Claude session
6. Monitor processes and logs
7. Optionally stop the instance

### Interactive Mode
For step-by-step testing with a menu:

```bash
bun run interactive
```

Features:
- Boot/stop instances
- Start Claude sessions
- Check process status
- View logs
- Execute custom commands
- Test atomic file writes

## OAuth Flow

The app uses hardcoded Claude OAuth credentials. When running, it will:
1. Generate an authorization URL
2. Ask you to visit the URL and authorize
3. Ask you to paste the callback URL
4. Exchange the code for access tokens

## Network Optimization

This test app demonstrates the optimized network calls:
- **Old way**: 3 calls to setup credentials (mkdir + write + chmod)
- **New way**: 1 call using `writeFileAtomic`

## Architecture

```
Test App
    ↓
VM Provider Interface
    ↓
MorphVM Provider
    ↓
MorphVM API
```

The app uses the VM provider interface, making it easy to swap to different VM backends.