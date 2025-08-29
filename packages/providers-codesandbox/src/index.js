import { posix as path } from "node:path";
import { ProviderError } from "@repo/runtime-interfaces";
import { mapBootupToStatus } from "./status.js";

function _notImplemented(op) {
  return Promise.reject(
    new ProviderError(
      "SERVER_ERROR",
      `CodeSandbox provider operation not implemented: ${op}`
    )
  );
}
function ensureAdapter(adapter, op) {
  if (!adapter) {
    throw new ProviderError(
      "SERVER_ERROR",
      `CodeSandbox provider requires adapter for ${op}`
    );
  }
  return adapter;
}
function toPayload(spec) {
  const cwd = spec.cwd ? `cd ${spec.cwd} && ` : "";
  const env = spec.env
    ? `${Object.entries(spec.env)
        .map(([k, v]) => `export ${k}=${JSON.stringify(v)};`)
        .join(" ")} `
    : "";
  if (spec.kind === "shell") {
    return `${cwd}${env}${spec.script}`;
  }
  const args = spec.args?.map((a) => JSON.stringify(a)).join(" ") ?? "";
  return `${cwd}${env}${spec.command} ${args}`.trim();
}
function normalizePath(input, homeDir) {
  const abs = input.startsWith("~")
    ? path.join(homeDir, input.slice(2))
    : input;
  const cleaned = path.normalize(abs);
  let rel;
  if (cleaned.startsWith(`${homeDir}/`)) {
    rel = `./${cleaned.slice(homeDir.length + 1)}`;
  } else if (cleaned === homeDir) {
    rel = ".";
  } else {
    rel = cleaned;
  }
  const dir = path.dirname(cleaned);
  return { abs: cleaned, rel, dir };
}
export function createCodeSandboxProvider(opts) {
  const providerOpts = opts;
  const capabilities = {
    homeDir: opts.homeDir ?? "/project/workspace",
  };
  const instances = {
    boot(snapshotId) {
      return Promise.resolve({
        id: `csb-${snapshotId}`,
        status: mapBootupToStatus("FORK"),
      });
    },
    get(instanceId) {
      return Promise.resolve({ id: instanceId, status: "ready" });
    },
    list() {
      return Promise.resolve([]);
    },
    stop(_instanceId) {
      return Promise.resolve();
    },
    terminate(_instanceId) {
      return Promise.resolve();
    },
    fork(instanceId) {
      return Promise.resolve({ id: `${instanceId}-fork`, status: "ready" });
    },
  };
  const files = {
    async readFile(instanceId, pth, enc = "utf8") {
      const adapter = ensureAdapter(providerOpts.adapter, "files.readFile");
      const client = await adapter.connect(instanceId);
      const home = capabilities.homeDir ?? "/project/workspace";
      const { rel } = normalizePath(pth, home);
      const text = await client.fs.readTextFile(rel);
      if (enc === "base64") {
        return Buffer.from(text, "utf8").toString("base64");
      }
      return text;
    },
    async writeFile(instanceId, pth, content, options) {
      const adapter = ensureAdapter(providerOpts.adapter, "files.writeFile");
      const client = await adapter.connect(instanceId);
      const home = capabilities.homeDir ?? "/project/workspace";
      const { rel } = normalizePath(pth, home);
      if (options?.encoding && options.encoding !== "utf8") {
        throw new ProviderError(
          "VALIDATION_ERROR",
          `Unsupported encoding for writeFile: ${options.encoding}`
        );
      }
      await client.fs.writeTextFile(rel, content);
    },
    async writeFileAtomic(instanceId, pth, content, options) {
      const adapter = ensureAdapter(
        providerOpts.adapter,
        "files.writeFileAtomic"
      );
      const client = await adapter.connect(instanceId);
      const home = capabilities.homeDir ?? "/project/workspace";
      const { rel, dir } = normalizePath(pth, home);
      if (options?.encoding && options.encoding !== "utf8") {
        throw new ProviderError(
          "VALIDATION_ERROR",
          `Unsupported encoding for writeFileAtomic: ${options.encoding}`
        );
      }
      if (options?.createDirs) {
        if (client.fs.mkdirp) {
          await client.fs.mkdirp(`./${path.relative(home, dir)}`);
        } else {
          // best-effort via shell
          await client.run(`mkdir -p ${JSON.stringify(dir)}`);
        }
      }
      await client.fs.writeTextFile(rel, content);
    },
    async fileExists(instanceId, pth) {
      const adapter = ensureAdapter(providerOpts.adapter, "files.fileExists");
      const client = await adapter.connect(instanceId);
      const home = capabilities.homeDir ?? "/project/workspace";
      const { rel } = normalizePath(pth, home);
      if (client.fs.fileExists) {
        return client.fs.fileExists(rel);
      }
      // best-effort: try reading
      try {
        await client.fs.readTextFile(rel);
        return true;
      } catch {
        return false;
      }
    },
    async createDirectory(instanceId, pth, _options) {
      const adapter = ensureAdapter(
        providerOpts.adapter,
        "files.createDirectory"
      );
      const client = await adapter.connect(instanceId);
      const home = capabilities.homeDir ?? "/project/workspace";
      const { dir } = normalizePath(path.join(pth, ".keep"), home);
      await client.run(`mkdir -p ${JSON.stringify(path.dirname(dir))}`);
    },
    async deleteFile(instanceId, pth) {
      const adapter = ensureAdapter(providerOpts.adapter, "files.deleteFile");
      const client = await adapter.connect(instanceId);
      const home = capabilities.homeDir ?? "/project/workspace";
      const { abs } = normalizePath(pth, home);
      await client.run(`rm -f ${JSON.stringify(abs)}`);
    },
    async deleteDirectory(instanceId, pth, _opts) {
      const adapter = ensureAdapter(
        providerOpts.adapter,
        "files.deleteDirectory"
      );
      const client = await adapter.connect(instanceId);
      const home = capabilities.homeDir ?? "/project/workspace";
      const { abs } = normalizePath(pth, home);
      await client.run(`rm -rf ${JSON.stringify(abs)}`);
    },
  };
  const exec = async (instanceId, spec) => {
    const adapter = ensureAdapter(providerOpts.adapter, "exec.run");
    const client = await adapter.connect(instanceId);
    const command = toPayload(spec);
    const res = await client.run(command);
    return res;
  };
  return {
    name: "codesandbox",
    version: "0.0.1",
    capabilities,
    instances,
    files,
    exec,
  };
}
export { mapBootupToStatus } from "./status.js";
export {
  cleanupSandbox,
  createSandboxFromTemplate,
  resumeSandbox,
} from "./util.js";
export default createCodeSandboxProvider;
