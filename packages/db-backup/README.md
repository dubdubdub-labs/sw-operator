# @repo/db-backup

Simple backup utility for Instant DB apps. It exports all entities to a JSONL file and downloads all `$files` records to disk, preserving their `path` structure.

## Features

- Full export to JSONL with a metadata header (first line).
- Schema-driven queries via Platform API.
- Paged export (offset/limit) to handle large datasets.
- `$files` downloader writes files under a `files/` subdirectory, mirroring each record's `path`.
- Deterministic, sequential entity export; concurrent file downloads with a small pool.

## Prerequisites

- bun 1.2+
- Instant app credentials:
  - `INSTANT_APP_ID` (UUID)
  - `INSTANT_APP_ADMIN_TOKEN` (from dashboard; admin token for the app)
  - `INSTANT_PLATFORM_TOKEN` (OAuth or Personal Access Token with `apps-read` scope)

## Usage

Run from the package folder (recommended):

```
cd packages/db-backup
OUT_DIR="$HOME/Downloads" bun run backup
```

Or specify a full output file path (the tool will create a folder named after the filename and place the JSONL inside it):

```
OUT_FILE="$HOME/Downloads/instantdb-$INSTANT_APP_ID-$(date +%Y-%m-%dT%H-%M-%S).jsonl" bun run backup
```

Tip: Shell expansion for `$(date ...)` only works when provided inline on the command line. If set in a `.env` or a global export, most loaders will not expand it; prefer using `OUT_DIR` in those cases.

### Environment variables

- `INSTANT_APP_ID`: Instant app id (required)
- `INSTANT_APP_ADMIN_TOKEN`: Admin token for the app (required)
- `INSTANT_PLATFORM_TOKEN`: Platform token with `apps-read` scope (required)
- `OUT_FILE`: Full path to the JSONL file to write. If it points to a directory (or ends with `/`), the tool uses a default filename and writes under that directory.
- `OUT_DIR`: Directory to write output into. The tool generates a timestamped filename.
- `PAGE_SIZE`: Page size for entity export (default: `500`)
- `FILES_CONCURRENCY`: Parallel downloads for `$files` (default: `4`)
- `DEBUG_DB_BACKUP`: Set to `1` for verbose logs (schema fetch, download failures, etc.)

### Output layout

If `OUT_FILE=/path/to/instantdb-APPID-2025-08-19T17-51-41.jsonl`, the export is structured as:

```
/path/to/
  instantdb-APPID-2025-08-19T17-51-41/
    instantdb-APPID-2025-08-19T17-51-41.jsonl
    files/
      cookbooks/....../cover.jpg
      ... (mirrors `$files.path`)
```

The first line of the JSONL is metadata:

```
{"type":"meta","appId":"...","generatedAt":"...","entities":["$files","..."]}
```

Each subsequent line is a record:

```
{"type":"record","entity":"clubs","record":{...}}
```

For `$files`, records include `url`, `path`, `size`, `id`, and any link attributes. The downloader saves to `files/<path>`; if `path` is missing, it uses the `id` as a filename.

### Behavior notes

- Skips re-downloading a file if a file already exists at the destination and its size matches the record's `size`.
- Falls back to `adminDb.storage.getDownloadUrl(path)` when a `$files.url` is not present in the record.
- Exports entities sequentially for predictable output; downloads are queued with limited concurrency.

## Scripts

- `bun run backup` — run the backup CLI
- `bun run test` — run vitest unit tests
- `bun run lint` — run Biome/Ultracite checks
- `bun run typecheck` — run TypeScript typecheck

## Limitations

- Export only (no import/restore yet).
- Requires Platform token with `apps-read` scope to fetch schema.

## Troubleshooting

- If you see a schema fetch error, ensure `INSTANT_PLATFORM_TOKEN` has `apps-read` scope and `INSTANT_APP_ID` is correct.
- For more logs, set `DEBUG_DB_BACKUP=1`.
```
DEBUG_DB_BACKUP=1 OUT_DIR="$HOME/Downloads" bun run backup
```

If you run into issues or want features like gzip output or bucket upload, open a task and we can extend the tool.
