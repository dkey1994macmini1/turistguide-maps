#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const require = createRequire(import.meta.url);
const binDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(binDir, "..");

// Load environment from .env and .env.local before starting the server
const envPath = path.join(projectRoot, ".env");
const envLocalPath = path.join(projectRoot, ".env.local");

// quiet: keep stdout clean — it carries the MCP JSON-RPC stream
dotenvConfig({ path: envPath, quiet: true });
// .env.local overrides .env (later loads win)
dotenvConfig({ path: envLocalPath, quiet: true });

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
