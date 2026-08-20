import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "../../..");
const cliPath = path.join(projectRoot, "bin/turistguide-maps.mjs");

function runCli(args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync("node", [cliPath, ...args], {
    cwd: path.resolve(projectRoot, ".."),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

describe("turistguide-maps CLI", () => {
  it("describes the command surface without database configuration", () => {
    const result = runCli(["commands", "--json"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      type: "command_catalog",
      schemaVersion: 1,
      data: expect.arrayContaining([
        expect.objectContaining({ command: "plan list" }),
        expect.objectContaining({ command: "stop update" }),
      ]),
    });
  });

  it("returns a structured configuration error before a data command", () => {
    const result = runCli(["plan", "list", "--json"], { DATABASE_URL: "" });

    expect(result.status).toBe(3);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: expect.objectContaining({
        type: "configuration_error",
        message: expect.stringContaining("DATABASE_URL"),
        hint: expect.any(String),
      }),
      schemaVersion: 1,
    });
  });

  it("discovers one command without database configuration", () => {
    const result = runCli(["schema", "--command", "plan get", "--json"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      type: "command_schema",
      data: {
        command: "plan get",
        arguments: expect.arrayContaining(["--slug"]),
      },
    });
  });
});
