import {
  createWriteStream,
  existsSync,
  promises as fsp,
  mkdirSync,
  statSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { init as initAdmin } from "@instantdb/admin";
import type {
  EntitiesDef,
  InstantSchemaDef,
  InstaQLParams,
  LinksDef,
  RoomsDef,
} from "@instantdb/core";
import { PlatformApi } from "@instantdb/platform";

type BackupOptions = {
  appId: string;
  adminToken: string;
  platformToken: string;
  outputPath?: string;
  pageSize?: number;
};

type JsonlMeta = {
  type: "meta";
  appId: string;
  generatedAt: string;
  entities: string[];
};

type JsonlRecord = {
  type: "record";
  entity: string;
  record: Record<string, unknown>;
};

function nowISOString(): string {
  const d = new Date(Date.now());
  return d.toISOString();
}

function defaultOutputPath(appId: string): string {
  const timestamp = nowISOString().replaceAll(":", "-");
  const filename = `instantdb-${appId}-${timestamp}.jsonl`;
  return join(process.cwd(), "backups", filename);
}

async function writeLine(
  stream: ReturnType<typeof createWriteStream>,
  obj: JsonlMeta | JsonlRecord
): Promise<void> {
  const line = `${JSON.stringify(obj)}\n`;
  const ok = stream.write(line);
  if (ok) {
    return;
  }
  await new Promise<void>((resolve) => {
    stream.once("drain", () => resolve());
  });
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function listEntities(
  schema: InstantSchemaDef<EntitiesDef, LinksDef<EntitiesDef>, RoomsDef>
): string[] {
  return Object.keys(schema.entities).sort((a, b) => a.localeCompare(b));
}

export function buildEntityQuery(
  schema: InstantSchemaDef<EntitiesDef, LinksDef<EntitiesDef>, RoomsDef>,
  entity: string,
  opts: { limit?: number; offset?: number } = {}
): Record<string, unknown> {
  const entityDef = schema.entities[entity];
  if (!entityDef) {
    throw new Error(`Entity not found in schema: ${entity}`);
  }

  const linkEntries = Object.keys(entityDef.links);
  const subquery: Record<string, unknown> = {};
  for (const linkName of linkEntries) {
    // Only fetch ids for linked entities to keep backups compact
    subquery[linkName] = { $: { fields: ["id"] } };
  }

  const $options: Record<string, unknown> = { $: {} };
  if (typeof opts.limit === "number") {
    ($options.$ as Record<string, unknown>).limit = opts.limit;
  }
  if (typeof opts.offset === "number") {
    ($options.$ as Record<string, unknown>).offset = opts.offset;
  }

  return {
    [entity]: {
      ...$options,
      ...subquery,
    },
  } as Record<string, unknown>;
}

async function backupEntity(
  adminDb: ReturnType<typeof initAdmin>,
  schema: InstantSchemaDef<EntitiesDef, LinksDef<EntitiesDef>, RoomsDef>,
  entity: string,
  stream: ReturnType<typeof createWriteStream>,
  pageSize: number,
  filesCtx?: { filesDir: string; downloads: DownloadQueue }
): Promise<void> {
  const writePageRows = async (rows: unknown[]): Promise<void> => {
    const lines: string[] = [];
    for (const row of rows) {
      const rec: JsonlRecord = {
        type: "record",
        entity,
        record: row as Record<string, unknown>,
      };
      lines.push(JSON.stringify(rec));
    }
    const pagePayload = `${lines.join("\n")}\n`;
    const ok = stream.write(pagePayload);
    if (!ok) {
      await new Promise<void>((resolve) =>
        stream.once("drain", () => resolve())
      );
    }
  };

  const schedulePageFiles = (rows: unknown[]): void => {
    if (entity !== "$files" || !filesCtx) {
      return;
    }
    for (const row of rows as FileEntityRecord[]) {
      const rec = row || ({} as FileEntityRecord);
      const relPath = normalizeFilePath(rec);
      if (!relPath) {
        continue;
      }
      const dest = join(filesCtx.filesDir, relPath);
      ensureDir(dest);
      filesCtx.downloads.add(createDownloadTask(adminDb, rec, dest, relPath));
    }
  };
  // Recursively fetch all pages to avoid awaiting inside loops
  const fetchPage = async (offset: number): Promise<void> => {
    const query = buildEntityQuery(schema, entity, { limit: pageSize, offset });
    const data = await adminDb.query(
      query as InstaQLParams<
        InstantSchemaDef<EntitiesDef, LinksDef<EntitiesDef>, RoomsDef>
      >
    );
    const rows = (data[entity] as unknown[]) || [];

    if (rows.length === 0) {
      return;
    }

    await writePageRows(rows);

    schedulePageFiles(rows);

    if (rows.length < pageSize) {
      return;
    }
    await fetchPage(offset + pageSize);
  };

  await fetchPage(0);
}

export async function backupInstantDb(opts: BackupOptions): Promise<string> {
  const appId = opts.appId.trim();
  const adminToken = opts.adminToken.trim();
  const platformToken = opts.platformToken.trim();
  const pageSize =
    typeof opts.pageSize === "number" && opts.pageSize > 0
      ? opts.pageSize
      : 500;
  const requestedOutput =
    opts.outputPath && opts.outputPath.length > 0
      ? opts.outputPath
      : defaultOutputPath(appId);

  const parentDir = dirname(requestedOutput);
  const baseFile = basename(requestedOutput);
  const baseName = baseFile.endsWith(".jsonl")
    ? baseFile.slice(0, -".jsonl".length)
    : baseFile;
  const backupDir = join(parentDir, baseName);
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  const filesRoot = join(backupDir, "files");
  if (!existsSync(filesRoot)) {
    mkdirSync(filesRoot, { recursive: true });
  }
  const outputPath = join(backupDir, baseFile);

  ensureDir(outputPath);
  const stream = createWriteStream(outputPath, { flags: "w" });
  if (process.env.DEBUG_DB_BACKUP) {
    // eslint-disable-next-line no-console
    console.log(
      `Starting backup for appId=${appId}, outputPath=${outputPath}, pageSize=${pageSize}`
    );
  }

  // Load schema via Platform API
  const platform = new PlatformApi({ auth: { token: platformToken } });
  let schema: InstantSchemaDef<EntitiesDef, LinksDef<EntitiesDef>, RoomsDef>;
  try {
    ({ schema } = await platform.getSchema(appId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Failed to fetch schema from Platform API. Check INSTANT_PLATFORM_TOKEN (needs apps-read scope) and INSTANT_APP_ID. Underlying error: ${msg}`
    );
  }

  // Init admin DB (no need for schema here; inference off keeps it flexible)
  const adminDb = initAdmin({ appId, adminToken });

  const entities = listEntities(schema);

  const meta: JsonlMeta = {
    type: "meta",
    appId,
    generatedAt: nowISOString(),
    entities,
  };
  await writeLine(stream, meta);

  const downloads = new DownloadQueue(
    process.env.FILES_CONCURRENCY
      ? Number.parseInt(process.env.FILES_CONCURRENCY, 10)
      : 4
  );

  // Backup each entity sequentially using recursion to avoid
  // awaiting inside loops and to keep output deterministic
  const backupSequentially = async (idx: number): Promise<void> => {
    if (idx >= entities.length) {
      return;
    }
    const entity = entities.at(idx);
    if (entity) {
      await backupEntity(adminDb, schema, entity, stream, pageSize, {
        filesDir: filesRoot,
        downloads,
      });
    }
    await backupSequentially(idx + 1);
  };

  await backupSequentially(0);

  await downloads.drain();

  await new Promise<void>((resolve) => stream.end(resolve));
  return outputPath;
}

function parseEnvString(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function resolveOutputPath(input: {
  appId: string;
  outFileEnv?: string;
  outDirEnv?: string;
}): string {
  const { appId, outFileEnv, outDirEnv } = input;
  const defaultName = basename(defaultOutputPath(appId));

  if (outFileEnv && outFileEnv.length > 0) {
    try {
      if (
        outFileEnv.endsWith("/") ||
        (existsSync(outFileEnv) && statSync(outFileEnv).isDirectory())
      ) {
        return join(outFileEnv, defaultName);
      }
    } catch {
      // ignore stat errors; treat as file path
    }
    return outFileEnv;
  }

  if (outDirEnv && outDirEnv.length > 0) {
    return join(outDirEnv, defaultName);
  }

  return defaultOutputPath(appId);
}

if (import.meta.main) {
  // Simple CLI: read env, run backup, print output path
  (async () => {
    try {
      const appId = parseEnvString("INSTANT_APP_ID");
      const adminToken = parseEnvString("INSTANT_APP_ADMIN_TOKEN");
      const platformToken = parseEnvString("INSTANT_PLATFORM_TOKEN");

      const outputPathEnv = process.env.OUT_FILE;
      const outDirEnv = process.env.OUT_DIR;
      const pageSizeEnv = process.env.PAGE_SIZE;
      const pageSize = pageSizeEnv
        ? Number.parseInt(pageSizeEnv, 10)
        : undefined;

      const output = await backupInstantDb({
        appId,
        adminToken,
        platformToken,
        outputPath: resolveOutputPath({
          appId,
          outFileEnv: outputPathEnv,
          outDirEnv,
        }),
        pageSize,
      });

      // eslint-disable-next-line no-console
      console.log(`Backup written: ${output}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  })();
}

// Utilities for $files downloads
function createDownloadTask(
  adminDb: ReturnType<typeof initAdmin>,
  rec: FileEntityRecord,
  dest: string,
  relPath: string
): () => Promise<void> {
  return async () => {
    try {
      const skip = await skipIfSameSize(dest, rec.size);
      if (!skip) {
        const url = await ensureFileUrl(adminDb, rec);
        await downloadToFile(url, dest);
      }
    } catch (err) {
      if (process.env.DEBUG_DB_BACKUP) {
        // eslint-disable-next-line no-console
        console.warn(
          `Download failed for ${relPath}: ${(err as Error).message}`
        );
      }
    }
  };
}
type FileEntityRecord = {
  id?: string;
  url?: string;
  path?: string;
  size?: number;
  [k: string]: unknown;
};

function normalizeFilePath(rec: FileEntityRecord): string | null {
  if (typeof rec.path === "string" && rec.path.length > 0) {
    let p = rec.path;
    while (p.startsWith("/")) {
      p = p.slice(1);
    }
    return p;
  }
  if (typeof rec.id === "string" && rec.id.length > 0) {
    return rec.id;
  }
  return null;
}

async function skipIfSameSize(
  dest: string,
  expectedSize?: number
): Promise<boolean> {
  try {
    const s = await fsp.stat(dest);
    if (typeof expectedSize === "number" && expectedSize > 0) {
      return s.size === expectedSize;
    }
    return s.size > 0;
  } catch {
    return false;
  }
}

function ensureFileUrl(
  adminDb: ReturnType<typeof initAdmin>,
  rec: FileEntityRecord
): Promise<string> {
  if (typeof rec.url === "string" && rec.url.length > 0) {
    return Promise.resolve(rec.url);
  }
  if (typeof rec.path === "string" && rec.path.length > 0) {
    return adminDb.storage.getDownloadUrl(rec.path);
  }
  throw new Error("File record missing url and path");
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  ensureDir(dest);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  if (res.body) {
    const readable = Readable.fromWeb(res.body as unknown as ReadableStream);
    const ws = createWriteStream(dest);
    await pipeline(readable, ws);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(dest, buf);
}

class DownloadQueue {
  private q: Array<() => Promise<void>> = [];
  private running = 0;
  private resolveDrain: (() => void) | null = null;
  private concurrency: number;
  constructor(concurrency: number) {
    this.concurrency =
      Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 4;
  }
  add(task: () => Promise<void>): void {
    this.q.push(task);
    this.maybeStart();
  }
  async drain(): Promise<void> {
    if (this.running === 0 && this.q.length === 0) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.resolveDrain = resolve;
    });
  }
  private maybeStart(): void {
    while (this.running < this.concurrency && this.q.length > 0) {
      const task = this.q.shift();
      if (!task) {
        break;
      }
      this.running++;
      task()
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          this.running--;
          if (this.running === 0 && this.q.length === 0) {
            if (this.resolveDrain) {
              this.resolveDrain();
              this.resolveDrain = null;
            }
          } else {
            this.maybeStart();
          }
        });
    }
  }
}
