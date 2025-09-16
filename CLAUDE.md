# Project Context

## Project Structure

This is a Turborepo monorepo with the following structure:
- `/apps/*` - Application packages  
- `/packages/*` - Shared libraries and utilities

`turbo` is installed globally.

The project is pre-scaffolded with packages to co-locate similar functionality, alongside their documentation in AGENTS.md files. We should be mindful to make sure that we're placing coding into the correct package structure. 

Notably: 
- `instantdb/*` - for InstantDB schema, hooks, and helpers
- `logger` - for unified logging


## Running Commands and Debugging
If you see an error when starting the dev server about ports in use, you'll have to kill BOTH ports 3000 and 3684 (even though they may only error one at a time).

You should opt to use the InstantDB + Playwright MCP to debug and test when possible, before returning to the user. Remember to lint + typecheck as well.

## Monorepo Package Guidelines

### Package Structure
Every package should follow this structure (groupPath is optional for nesting):
```
packages/[groupPath/]<package-name>/
├── src/                # Source files
├── dist/               # Build output (built packages; gitignored)
├── package.json        # Package manifest
├── tsconfig.json       # TypeScript config
├── CLAUDE.md           # Package-specific docs
├── AGENTS.md           # Symlinked to CLAUDE.md
└── vitest.config.ts    # Test config (if tests exist)
```

### Package Generation

Use the `turbo gen` command to scaffold new packages under `packages/` (supports nested paths).

Command
```bash
turbo gen repo-package --args <name> <groupPath|''> <built|yes|no> <yes|no> <standard|pass>
```

Arguments
- name: package id in kebab-case, no `@repo/` prefix.
- groupPath: optional nested path under `packages/` (e.g., `instantdb` or `platform/utils`).
- built|yes|no: whether the package is built to `dist/` (yes) or exports TS directly from `src/` (no).
- yes|no: include a sample test file.
- standard|pass: `vitest` or `vitest --passWithNoTests` for the test script.

Examples
- `turbo gen repo-package --args db instantdb yes yes standard` → built package at `packages/instantdb/db`, name `@repo/instantdb-db`.
- `turbo gen repo-package --args gateway ai-runtime no yes standard` → source-export package at `packages/ai-runtime/gateway`, name `@repo/ai-runtime-gateway`.

This scaffolds:
- package.json (ESM). Name is `@repo/<group-dashed>-<name>`.
  - Built package: `exports` point to `dist/` with `types` and `import`. Scripts include `build`, `dev`, `test`, `lint`, `lint:fix`, `lint:fix:unsafe`, `typecheck`, `clean`.
  - Source-export package: `exports` point to `src/index.ts`. Scripts include `test`, `lint`, `lint:fix`, `lint:fix:unsafe`, `typecheck`, `clean`.
- tsconfig.json
- tsconfig.build.json (only for built packages)
- vitest.config.ts
- src/index.ts (+ src/index.test.ts if tests enabled)
- CLAUDE.md (+ AGENTS.md symlink) — keep this updated as the public API evolves

Note
- Workspaces include `packages/**`, so nested packages at any depth under `packages/` are discovered automatically.

### App Template and Generation

Use the `repo-app` generator to create a new app from the golden template located at `apps/_template`.

Command
```bash
turbo gen repo-app --args <name> [source]
```

Arguments
- `name`: the new app folder name under `apps/` (kebab-case).
- `source`: template path (relative). You should default to `apps/_template`.

Examples
- `turbo gen repo-app --args sales-crm apps/_template` → creates `apps/sales-crm` from `apps/_template`.
- `turbo gen repo-app --args search-clone apps/search-demo` → clones from a different source.

Behavior
- Excludes heavy folders and files when copying: `node_modules`, `.next`, `.turbo`, `dist`, `.vercel`, `.cache`, `coverage`, `.git`, `*.tsbuildinfo`, `*.log`, `bun.lock*`.
- Ensures `AGENTS.md` in the new app is a symlink to `CLAUDE.md`.
- Updates the new app's `package.json` `name` field to the provided app name.

After Generation
- Install dependencies at the repo root if needed: `bun install`.
- Run the app: `turbo dev --filter=<name>`.

Improving the Golden Template
- Update `apps/_template` directly; future apps generated via `repo-app` will include your changes.

### Dependencies
- Use `catalog:` for shared dependencies from root package.json catalog
- Use `workspace:*` for internal package dependencies
- Examples:
```json
"dependencies": {
  "@repo/logger": "workspace:*",
  "zod": "catalog:"
},
"devDependencies": {
  "@types/node": "catalog:",
  "@repo/typescript-config": "workspace:*",
  "typescript": "catalog:",
  "vitest": "catalog:"
}
```

### Package-Specific CLAUDE.md

Create a CLAUDE.md in the package directory with:
- Non-obvious architecture or patterns
- Complex API surfaces
- Special setup requirements
- Important usage examples
- Known limitations or gotchas

Keep it concise and practical. **Ensure you create a symlink to AGENTS.md**

### Error Handling
- Create dedicated error classes extending base errors
- Export errors from a central `errors/` directory
- Use descriptive error names and messages
- Include error codes for programmatic handling

## Rules and Regulations
- Use bun (and bunx), do not use npm/pnpm/yarn unless absolutely necessary
- Use catalog where possible for dependency management
- Packages should be named with the `@repo/` prefix in their package.json
- Feel free to use the logger package for logging
- Write strong errors and good error classes
- All packages must be ESM modules
- Follow the standard script conventions for Turbo orchestration
- Extend base configs instead of duplicating configuration

## Linting and Typechecking
We use Ultracite, a preset for Biome's lightning fast formatter and linter, which enforces strict type safety, accessibility standards, and consistent code quality for TypeScript projects.

### Before Writing Code
1. Analyze existing patterns in the codebase
2. Consider edge cases and error scenarios
3. Follow the rules below strictly


### Biome / Ultracite Linting Rules

#### Accessibility (a11y)
- Make sure label elements have text content and are associated with an input.
- Give all elements requiring alt text meaningful information for screen readers.
- Always include a `type` attribute for button elements.
- Accompany `onClick` with at least one of: `onKeyUp`, `onKeyDown`, or `onKeyPress`.
- Accompany `onMouseOver`/`onMouseOut` with `onFocus`/`onBlur`.
- Use semantic elements instead of role attributes in JSX.

#### Code Complexity and Quality
- Don't use any or unknown as type constraints.
- Don't use primitive type aliases or misleading types.
- Don't use empty type parameters in type aliases and interfaces.
- Don't write functions that exceed a given Cognitive Complexity score.
- Don't nest describe() blocks too deeply in test files.
- Use for...of statements instead of Array.forEach.
- Don't use unnecessary nested block statements.
- Don't rename imports, exports, and destructured assignments to the same name.
- Don't use unnecessary string or template literal concatenation.
- Don't use useless case statements in switch statements.
- Don't use ternary operators when simpler alternatives exist.
- Don't initialize variables to undefined.
- Use arrow functions instead of function expressions.
- Use Date.now() to get milliseconds since the Unix Epoch.
- Use .flatMap() instead of map().flat() when possible.
- Use concise optional chaining instead of chained logical expressions.
- Remove redundant terms from logical expressions.
- Use while loops instead of for loops when you don't need initializer and update expressions.
- Don't pass children as props.
- Don't declare functions and vars that are accessible outside their block.
- Don't use variables and function parameters before they're declared.

#### React and JSX Best Practices
- Don't use the return value of React.render.
- Make sure all dependencies are correctly specified in React hooks.
- Make sure all React hooks are called from the top level of component functions.
- Don't forget key props in iterators and collection literals.
- Don't define React components inside other components.
- Don't use dangerous JSX props.
- Don't use Array index in keys.
- Don't insert comments as text nodes.
- Don't assign JSX properties multiple times.
- Don't add extra closing tags for components without children.
- Use `<>...</>` instead of `<Fragment>...</Fragment>`.
- Watch out for possible "wrong" semicolons inside JSX elements.

#### Correctness and Safety
- Don't write unreachable code.
- Don't use optional chaining where undefined values aren't allowed.
- Don't have unused function parameters.
- Don't have unused imports.
- Don't have unused labels.
- Don't have unused variables.
- Make sure typeof expressions are compared to valid values.
- Make sure generator functions contain yield.
- Don't use await inside loops. If running sequence-dependent async operations, build a promise chain.
- Make sure Promise-like statements are handled appropriately.
- Don't use __dirname and __filename in the global scope.
- Prevent import cycles.
- Don't use configured elements.
- Don't hardcode sensitive data like API keys and tokens.
- Don't let variable declarations shadow variables from outer scopes.
- Don't use the TypeScript directive @ts-ignore.
- Don't use useless undefined.
- Make sure switch-case statements are exhaustive.
- Use `Array#{indexOf,lastIndexOf}()` instead of `Array#{findIndex,findLastIndex}()` when looking for the index of an item.
- Make sure iterable callbacks return consistent values.
- Use object spread instead of `Object.assign()` when constructing new objects.
- Always use the radix argument when using `parseInt()`.
- Make sure JSDoc comment lines start with a single asterisk, except for the first one.
- Don't use spread (`...`) syntax on accumulators.
- Don't use namespace imports.
- Declare regex literals at the top level.

#### TypeScript Best Practices
- Don't use TypeScript enums.
- Don't export imported variables.
- Don't use TypeScript namespaces.
- Don't use non-null assertions with the `!` postfix operator.
- Don't use user-defined types.
- Use `as const` instead of literal types and type annotations.
- Use either `T[]` or `Array<T>` consistently.
- Initialize each enum member value explicitly.
- Use `export type` for types.
- Use `import type` for types.
- Make sure all enum members are literal values.
- Don't use TypeScript const enum.
- Don't declare empty interfaces.
- Don't let variables evolve into any type through reassignments.
- Don't use the any type.
- Don't misuse the non-null assertion operator (!) in TypeScript files.
- Don't use implicit any type on variable declarations.

#### Style and Consistency
- Don't use callbacks in asynchronous tests and hooks.
- Don't use negation in `if` statements that have `else` clauses.
- Don't use nested ternary expressions.
- Don't reassign function parameters.
- Use `String.slice()` instead of `String.substr()` and `String.substring()`.
- Don't use template literals if you don't need interpolation or special-character handling.
- Don't use `else` blocks when the `if` block breaks early.
- Use `at()` instead of integer index access.
- Follow curly brace conventions.
- Use `else if` instead of nested `if` statements in `else` clauses.
- Use single `if` statements instead of nested `if` clauses.
- Use `new` for all builtins except `String`, `Number`, and `Boolean`.
- Use consistent accessibility modifiers on class properties and methods.
- Use `const` declarations for variables that are only assigned once.
- Put default function parameters and optional function parameters last.
- Include a `default` clause in switch statements.
- Use `for-of` loops when you need the index to extract an item from the iterated array.
- Use `node:assert/strict` over `node:assert`.
- Use the `node:` protocol for Node.js builtin modules.
- Use template literals over string concatenation.
- Use `new` when throwing an error.
- Don't throw non-Error values.
- Use `String.trimStart()` and `String.trimEnd()` over `String.trimLeft()` and `String.trimRight()`.
- Use standard constants instead of approximated literals.
- Don't assign values in expressions.
- Use `===` and `!==`.
- Don't use duplicate case labels.
- Don't use duplicate conditions in if-else-if chains.
- Don't use two keys with the same name inside objects.
- Don't use duplicate function parameter names.
- Don't let switch clauses fall through.
- Don't use labels that share a name with a variable.
- Don't redeclare variables, functions, classes, and types in the same scope.
- Don't let identifiers shadow restricted names.
- Don't use unsafe negation.
- Don't use var.
- Make sure async functions actually use await.
- Make sure default clauses in switch statements come last.

#### Next.js Specific Rules
- Don't use `<img>` elements in Next.js projects.
- Don't use `<head>` elements in Next.js projects.

#### Testing Best Practices
- Don't use export or module.exports in test files.
- Don't use focused tests.
- Make sure the assertion function, like expect, is placed inside an it() function call.
- Don't use disabled tests.
