#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const binDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(binDir, "..");
const tsxPackageJsonPath = require.resolve("tsx/package.json", { paths: [projectRoot] });
const tsxCliPath = path.join(path.dirname(tsxPackageJsonPath), "dist", "cli.mjs");
const tsconfigPath = path.join(projectRoot, "src", "mcp", "tsconfig.json");
const serverPath = path.join(projectRoot, "src", "mcp", "server.ts");

const child = spawn(process.execPath, [tsxCliPath, "--tsconfig", tsconfigPath, serverPath], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start turistguide-maps MCP server:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
