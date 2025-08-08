#!/usr/bin/env bun

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { $ } from "bun";
import ignore from "ignore";

const AGENTS_FILE = "AGENTS.md";
const CLAUDE_FILE = "CLAUDE.md";

function loadGitignore(rootDir: string): ReturnType<typeof ignore> {
  const ig = ignore();

  // Add default patterns
  ig.add([".git"]);

  // Load .gitignore if it exists
  const gitignorePath = join(rootDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    const patterns = readFileSync(gitignorePath, "utf-8")
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"));
    ig.add(patterns);
  }

  return ig;
}

function findAgentsFiles(
  dir: string,
  rootDir: string,
  ig: ReturnType<typeof ignore>,
  files: string[] = []
): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(rootDir, fullPath);

    // Skip if path matches gitignore patterns
    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      findAgentsFiles(fullPath, rootDir, ig, files);
    } else if (entry.isFile() && entry.name === AGENTS_FILE) {
      files.push(fullPath);
    }
  }

  return files;
}

function createSymlink(agentsPath: string): void {
  const dir = dirname(agentsPath);
  const claudePath = join(dir, CLAUDE_FILE);

  // Check if CLAUDE.md already exists
  if (existsSync(claudePath)) {
    const stats = statSync(claudePath, { throwIfNoEntry: false });

    if (stats?.isSymbolicLink()) {
      console.log(`✓ ${relative(process.cwd(), claudePath)} already symlinked`);
      return;
    }
    console.log(
      `⚠️  ${relative(process.cwd(), claudePath)} exists but is not a symlink - skipping`
    );
    return;
  }

  try {
    // Create relative symlink from CLAUDE.md to AGENTS.md
    symlinkSync(basename(agentsPath), claudePath);
    console.log(
      `✅ Created symlink: ${relative(process.cwd(), claudePath)} → ${AGENTS_FILE}`
    );
  } catch (error) {
    console.error(
      `❌ Failed to create symlink for ${relative(process.cwd(), claudePath)}:`,
      error
    );
  }
}

function removeOrphanedSymlink(fullPath: string): void {
  try {
    const stats = statSync(fullPath, { throwIfNoEntry: false });
    if (stats?.isSymbolicLink()) {
      const agentsPath = join(dirname(fullPath), AGENTS_FILE);
      if (!existsSync(agentsPath)) {
        unlinkSync(fullPath);
        console.log(
          `🗑️  Removed orphaned symlink: ${relative(process.cwd(), fullPath)}`
        );
      }
    }
  } catch {
    // Ignore errors
  }
}

function cleanupOrphanedSymlinks(
  dir: string,
  rootDir: string,
  ig: ReturnType<typeof ignore>
): void {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(rootDir, fullPath);

    // Skip if path matches gitignore patterns
    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      cleanupOrphanedSymlinks(fullPath, rootDir, ig);
    } else if (entry.name === CLAUDE_FILE) {
      removeOrphanedSymlink(fullPath);
    }
  }
}

async function main() {
  const rootDir = process.cwd();

  // First check if ignore package is installed
  try {
    await import("ignore");
  } catch {
    console.log("📦 Installing 'ignore' package...");
    await $`bun add -D ignore @types/ignore`.quiet();
  }

  console.log("🔍 Scanning for AGENTS.md files (respecting .gitignore)...\n");

  // Load gitignore patterns
  const ig = loadGitignore(rootDir);

  // Find all AGENTS.md files
  const agentsFiles = findAgentsFiles(rootDir, rootDir, ig);

  if (agentsFiles.length === 0) {
    console.log("No AGENTS.md files found.");
    return;
  }

  console.log(`Found ${agentsFiles.length} AGENTS.md file(s):\n`);

  // Create symlinks for each AGENTS.md
  for (const agentsPath of agentsFiles) {
    createSymlink(agentsPath);
  }

  console.log("\n🧹 Cleaning up orphaned CLAUDE.md symlinks...\n");
  cleanupOrphanedSymlinks(rootDir, rootDir, ig);

  console.log("\n✨ Done!");
}

// Run the script
main().catch(console.error);
