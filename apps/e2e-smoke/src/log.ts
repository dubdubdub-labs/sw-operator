import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RESULTS_DIR = path.resolve(process.cwd(), "e2e-results");
const RUN_ID = (process.env.E2E_RUN_ID ?? new Date().toISOString())
  .replace(/[:.]/g, "-")
  .replace(/Z$/, "Z");
const RESULTS_FILE = path.join(RESULTS_DIR, `run-${RUN_ID}.jsonl`);

let inited = false;

async function init() {
  if (inited) {
    return;
  }
  await mkdir(RESULTS_DIR, { recursive: true });
  const header = {
    kind: "run_start",
    runId: RUN_ID,
    ts: new Date().toISOString(),
    node: process.version,
    cwd: process.cwd(),
  } as const;
  await writeFile(RESULTS_FILE, `${JSON.stringify(header)}\n`, {
    encoding: "utf8",
  });
  inited = true;
}

export async function logEvent(event: Record<string, unknown>) {
  await init();
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
  await appendFile(RESULTS_FILE, `${line}\n`, { encoding: "utf8" });
}

export function getResultsFile(): string {
  return RESULTS_FILE;
}

export function getRunId(): string {
  return RUN_ID;
}
