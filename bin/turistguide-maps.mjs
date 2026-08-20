#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const require = createRequire(import.meta.url);
const binDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(binDir, "..");

dotenvConfig({ path: path.join(projectRoot, ".env"), quiet: true });
dotenvConfig({ path: path.join(projectRoot, ".env.local"), quiet: true });

const tsxPackageJsonPath = require.resolve("tsx/package.json", { paths: [projectRoot] });
const tsxCliPath = path.join(path.dirname(tsxPackageJsonPath), "dist", "cli.mjs");
const tsconfigPath = path.join(projectRoot, "tsconfig.json");
const entryPath = path.join(projectRoot, "src", "cli", "main.ts");

const child = spawn(process.execPath, [tsxCliPath, "--tsconfig", tsconfigPath, entryPath, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: { ...process.env, NODE_NO_WARNINGS: process.env.NODE_NO_WARNINGS ?? "1" },
  stdio: "inherit",
});

child.on("error", (error) => {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    error: {
      type: "internal_error",
      message: "Failed to start turistguide-maps.",
      hint: "Check that project dependencies are installed.",
    },
    schemaVersion: 1,
  })}\n`);
  process.exitCode = 1;
  void error;
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
