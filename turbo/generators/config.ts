import { existsSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PlopTypes } from "@turbo/gen";

const KEBAB_RE = /^[a-z0-9-]+$/;

export default function generator(plop: PlopTypes.NodePlopAPI) {
  plop.setHelper("pkgName", (name: string) =>
    name.startsWith("@repo/") ? name : `@repo/${name}`
  );

  plop.setGenerator("repo-package", {
    description: "Generate a new @repo/* package (ESM, TS, Vitest, Biome)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Package name (without @repo/ prefix):",
        validate: (v: string) =>
          v && KEBAB_RE.test(v) ? true : "use-kebab-case (a-z0-9-)",
      },
      {
        type: "list",
        name: "target",
        message: "Workspace location:",
        choices: [
          { name: "packages", value: "packages" },
          { name: "apps", value: "apps" },
        ],
        default: "packages",
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
      const pk = name.startsWith("@repo/") ? name : `@repo/${name}`;
      const folder = join(answers?.target as string, name);
      const actions: PlopTypes.ActionType[] = [];
      const withTests = Boolean((answers as { withTests?: boolean }).withTests);
      const selectedMode =
        (answers as { testMode?: string }).testMode ||
        (withTests ? "standard" : "pass");
      const testScript =
        selectedMode === "pass" ? "vitest --passWithNoTests" : "vitest";

      actions.push({
        type: "add",
        path: `${folder}/package.json`,
        template: `{
  "name": "${pk}",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -w -p tsconfig.build.json",
    "test": "${testScript}",
    "lint": "biome check .",
    "lint:fix": "biome check --fix .",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "clean": "rm -rf dist"
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
        template: `# {{ pkgName name }}

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
          "tsconfig.build.json",
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
          "- Scripts: build, dev, test, lint, lint:fix, typecheck, clean",
          `- Files: ${files.join(", ")}`,
        ];
        return lines.join("\n");
      };
      actions.push(summary);

      return actions;
    },
  });
}
