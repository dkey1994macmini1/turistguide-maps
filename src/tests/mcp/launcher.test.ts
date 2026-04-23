import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "../../..");
const launcherPath = path.join(projectRoot, "bin/turistguide-maps-mcp.mjs");
const outsideProjectCwd = path.resolve(projectRoot, "..");

describe("turistguide-maps MCP launcher", () => {
  it("starts from outside the project root without tsconfig path alias failures", () => {
    const result = spawnSync("node", [launcherPath], {
      cwd: outsideProjectCwd,
      encoding: "utf8",
      timeout: 5_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("Cannot find module '@/core/ports/read-model-port'");
  });
});
