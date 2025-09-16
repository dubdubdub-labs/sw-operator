import { cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync, lstatSync, unlinkSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import type { PlopTypes } from "@turbo/gen";

const KEBAB_RE = /^[a-z0-9-]+$/;
const PATH_RE = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export default function generator(plop: PlopTypes.NodePlopAPI) {
  // Small helpers kept local to this file; keep simple and predictable.
  const toBoolean = (val: unknown, defaultValue = false): boolean => {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
      const v = val.trim().toLowerCase();
      if (["y", "yes", "true", "1"].includes(v)) return true;
      if (["n", "no", "false", "0"].includes(v)) return false;
    }
    return defaultValue;
  };
  // Helper: compute full package name, optionally with groupPath segments
  plop.setHelper("pkgName", (name: string, groupPath?: string) => {
    const normalizedName = name.startsWith("@repo/") ? name.slice(6) : name;
    const group = (groupPath || "").trim();
    const prefix = group ? `${group.replaceAll("/", "-")}-` : "";
    return `@repo/${prefix}${normalizedName}`;
  });

  plop.setGenerator("repo-package", {
    description:
      "Generate a new @repo/* package (ESM, TS, Vitest, Biome) under packages/, with optional nested path",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Package name (without @repo/ prefix):",
        validate: (v: string) =>
          v && KEBAB_RE.test(v) ? true : "use-kebab-case (a-z0-9-)",
      },
      {
        type: "input",
        name: "groupPath",
        message:
          "Optional subfolder path under packages (e.g. instantdb or backend/utils):",
        validate: (v: string) =>
          !v || PATH_RE.test(v)
            ? true
            : "use segments like a/b/c with kebab-case (a-z0-9-)",
        default: "",
      },
      {
        type: "confirm",
        name: "built",
        message: "Is this a built package (compile to dist/)?",
        default: true,
      },
      {
        type: "confirm",
        name: "withTests",
        message: "Include a sample test?",
        default: true,
      },
      {
        type: "list",
        name: "testMode",
        message: "Test script mode:",
        choices: [
          { name: "standard (vitest)", value: "standard" },
          {
            name: "pass-with-no-tests (vitest --passWithNoTests)",
            value: "pass",
          },
        ],
        default: "standard",
      },
    ],
    actions: (answers) => {
      const name = (answers?.name as string).trim();
      const groupPath = (answers?.groupPath as string)?.trim() || "";
      const groupSegments = groupPath ? groupPath.split("/") : [];
      const target = "packages";
      const folder = join(target, ...groupSegments, name);
      const combined = (groupSegments.length
        ? `${groupSegments.join("-")}-`
        : "") + name;
      const pk = name.startsWith("@repo/") ? name : `@repo/${combined}`;
      const actions: PlopTypes.ActionType[] = [];
      const withTests = toBoolean((answers as { withTests?: unknown }).withTests, true);
      const isBuilt = toBoolean((answers as { built?: unknown }).built, true);
      const selectedMode =
        (answers as { testMode?: string }).testMode ||
        (withTests ? "standard" : "pass");
      const testScript =
        selectedMode === "pass" ? "vitest --passWithNoTests" : "vitest";

      const exportsField = isBuilt
        ? '"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },'
        : '"exports": { ".": "./src/index.ts" },';

      const scriptEntries = [
        isBuilt ? '"build": "tsc -p tsconfig.build.json"' : undefined,
        isBuilt ? '"dev": "tsc -w -p tsconfig.build.json"' : undefined,
        `"test": "${testScript}"`,
        '"lint": "biome check ."',
        '"lint:fix": "biome check . --write"',
        '"lint:fix:unsafe": "biome check . --unsafe --write"',
        '"typecheck": "tsc --noEmit -p tsconfig.json"',
        '"clean": "rm -rf dist"',
      ].filter(Boolean) as string[];

      actions.push({
        type: "add",
        path: `${folder}/package.json`,
        template: `{
  "name": "${pk}",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  ${exportsField}
  "scripts": {
    ${scriptEntries.join(",\n    ")}
  },
  "dependencies": {},
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/vitest-config": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
`,
      });

      actions.push({
        type: "add",
        path: `${folder}/tsconfig.json`,
        template: `{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "vitest.config.ts"],
  "exclude": ["node_modules", "dist"]
}
`,
      });

      if (isBuilt) {
        actions.push({
          type: "add",
          path: `${folder}/tsconfig.build.json`,
          template: `{
  "extends": "./tsconfig.json",
  "compilerOptions": { "rootDir": "./src" },
  "include": ["src/**/*.ts"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**",
    "vitest.config.ts"
  ]
}
`,
        });
      }

      actions.push({
        type: "add",
        path: `${folder}/vitest.config.ts`,
        template: `import { extendVitestConfig } from "@repo/vitest-config";
export default extendVitestConfig({});
`,
      });

      actions.push({
        type: "add",
        path: `${folder}/src/index.ts`,
        template: `export const placeholder = true;
`,
      });

      if (answers?.withTests) {
        actions.push({
          type: "add",
          path: `${folder}/src/index.test.ts`,
          template: `import { describe, it, expect } from "vitest";
import { placeholder } from "./index.js";

describe("placeholder", () => {
  it("is true", () => {
    expect(placeholder).toBe(true);
  });
});
`,
        });
      }

      actions.push({
        type: "add",
        path: `${folder}/CLAUDE.md`,
        template: `# {{ pkgName name groupPath }}

Purpose
- Describe the package's role in 1–2 sentences.

Quickstart
\`\`\`ts
// usage snippet here
\`\`\`

Key Exports and Types
- List and fully enumerate main types/functions.

Notes
- Keep this file short; update when public API changes.
`,
      });

      // Create AGENTS.md symlink → CLAUDE.md (or fallback file)
      const symlinkAction: PlopTypes.CustomActionFunction = () => {
        const dest = folder;
        const link = join(dest, "AGENTS.md");
        try {
          if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
          }
          symlinkSync("CLAUDE.md", link);
          return "AGENTS.md symlinked";
        } catch {
          writeFileSync(link, "See CLAUDE.md\n");
          return "AGENTS.md created as file (symlink fallback)";
        }
      };
      actions.push(symlinkAction);

      const summary: PlopTypes.CustomActionFunction = () => {
        const includeTests = withTests;
        const files = [
          "package.json",
          "tsconfig.json",
          isBuilt ? "tsconfig.build.json" : undefined,
          "vitest.config.ts",
          "src/index.ts",
          includeTests ? "src/index.test.ts" : undefined,
          "CLAUDE.md",
          "AGENTS.md",
        ].filter(Boolean) as string[];
        const lines = [
          "Summary:",
          `- Package: ${pk} at ${folder}`,
          `- Test script: ${testScript}`,
          `- Built package: ${isBuilt ? "yes" : "no"}`,
          `- Scripts: ${scriptEntries
            .map((s) => s.split(":")[0].replaceAll('"', ""))
            .join(", ")}`,
          `- Files: ${files.join(", ")}`,
        ];
        return lines.join("\n");
      };
      actions.push(summary);

      return actions;
    },
  });

  // Apps generator: clone an existing app as a template (default: apps/workflow)
  // - Excludes heavy directories (node_modules, .next, .turbo, dist, etc.)
  // - Renames package.json "name" to the new app name
  // - Places the new app at apps/<name>
  plop.setGenerator("repo-app", {
    description:
      "Clone an existing app (default: apps/workflow) into apps/<name> as a starting point, excluding heavy dirs",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "New app folder name (apps/<name>, kebab-case):",
        validate: (v: string) =>
          v && KEBAB_RE.test(v) ? true : "use-kebab-case (a-z0-9-)",
      },
      {
        type: "input",
        name: "sourcePath",
        message: "Source template path (relative)",
        default: "apps/_template",
        validate: (v: string) => (v && existsSync(v) ? true : "path must exist"),
      },
    ],
    actions: (answers) => {
      const name = (answers?.name as string).trim();
      const source = (answers?.sourcePath as string).trim();
      const dest = join("apps", name);

      const actions: PlopTypes.ActionType[] = [];

      const copyAction: PlopTypes.CustomActionFunction = () => {
        if (existsSync(dest)) {
          throw new Error(`Destination already exists: ${dest}`);
        }

        // Exclusion rules: directories and file patterns to skip
        const EXCLUDED_DIRS = new Set([
          "node_modules",
          ".next",
          ".turbo",
          "dist",
          ".vercel",
          ".cache",
          "coverage",
          ".git",
        ] as const);

        const EXCLUDED_FILES = new Set([
          ".DS_Store",
          "bun.lock",
          "bun.lockb",
        ] as const);

        const EXCLUDED_EXTS = new Set([".tsbuildinfo", ".log"] as const);

        // Filter callback for fs.cp; returns true to include, false to exclude
        const filter = (src: string): boolean => {
          const rel = relative(source, src);
          if (!rel) return true; // source root

          const parts = rel.split(sep);
          for (const p of parts) {
            if (EXCLUDED_DIRS.has(p)) return false;
          }

          const base = basename(src);
          if (EXCLUDED_FILES.has(base)) return false;
          const ext = extname(base);
          if (EXCLUDED_EXTS.has(ext as ".tsbuildinfo" | ".log")) return false;
          return true;
        };

        cpSync(source, dest, {
          recursive: true,
          dereference: false, // preserve symlinks like AGENTS.md -> CLAUDE.md
          errorOnExist: true,
          filter,
        });

        return `Copied template from ${source} to ${dest}`;
      };
      actions.push(copyAction);

      // Ensure AGENTS.md is a symlink to CLAUDE.md after copy (in case original wasn't)
      const ensureAgentsSymlink: PlopTypes.CustomActionFunction = () => {
        const agentsPath = join(dest, "AGENTS.md");
        const target = "CLAUDE.md"; // relative within the app folder
        try {
          try {
            const st = lstatSync(agentsPath);
            if (st) unlinkSync(agentsPath);
          } catch {}
          symlinkSync(target, agentsPath);
          return "AGENTS.md symlink set to ./CLAUDE.md";
        } catch {
          try {
            writeFileSync(agentsPath, "See CLAUDE.md\n");
            return "AGENTS.md created as file (symlink fallback)";
          } catch {
            return "Warning: could not create AGENTS.md link or file";
          }
        }
      };
      actions.push(ensureAgentsSymlink);

      const renamePkgAction: PlopTypes.CustomActionFunction = () => {
        const pkgPath = join(dest, "package.json");
        try {
          const raw = readFileSync(pkgPath, "utf8");
          const data = JSON.parse(raw) as { name?: string } & Record<string, unknown>;
          data.name = name;
          writeFileSync(pkgPath, `${JSON.stringify(data, null, 2)}\n`);
          return `Updated package.json name -> ${name}`;
        } catch {
          // If anything goes wrong, it's not fatal for copying; provide guidance
          return `Warning: could not modify ${pkgPath}; please set name to \"${name}\" manually.`;
        }
      };
      actions.push(renamePkgAction);

      const summary: PlopTypes.CustomActionFunction = () => {
        const lines = [
          "Summary:",
          `- App created at: ${dest}`,
          `- Source: ${source}`,
          "- Excluded: node_modules, .next, .turbo, dist, .vercel, .cache, coverage, .git, *.tsbuildinfo, *.log, bun.lock*",
          "- Remember to run: bun install (at repo root)",
        ];
        return lines.join("\n");
      };
      actions.push(summary);

      return actions;
    },
  });
}
