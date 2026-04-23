# Refaktoring: Split MCP Server Monolith into Per-Tool Files

## Goal

Split `src/mcp/server.ts` (667 lines, 10 MCP tools + helpers + schemas) into a clean directory structure with one file per tool. The entry point (`server.ts`) should remain minimal — just server setup, helper imports, and tool registration wiring.

## Current State

- `src/mcp/server.ts` — 667 lines, everything in one file
- Contains: McpServer setup, 3 helpers (runEffect, runEffectSafe, errResult/okResult), serializePlan, shared stopSchema, 10 tool registrations, main()
- No automated unit tests for MCP tools (only a launcher smoke test in `src/tests/mcp/launcher.test.ts`)
- MCP runs via tsx with separate `tsconfig.json` (strict: false, uses path aliases)
- Launcher (`bin/turistguide-maps-mcp.mjs`) points at `src/mcp/server.ts`

## Target Structure

```
src/mcp/
  server.ts              # Entry point: McpServer setup, import & register all tools, main()
  helpers.ts             # runEffect, runEffectSafe, errResult, okResult
  schemas.ts             # Shared Zod schemas (stopSchema, linkSchema, costSchema, durationSchema)
  serialize.ts           # serializePlan function
  tools/
    list-itineraries.ts
    get-itinerary.ts
    create-plan.ts
    delete-plan.ts
    add-day.ts
    remove-day.ts
    update-day.ts
    add-stop.ts
    remove-stop.ts
    update-stop.ts
```

## Per-Tool File Pattern

Each tool file exports a single registration function:

```ts
// src/mcp/tools/add-day.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Effect } from "effect";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { runEffectSafe, errResult, okResult } from "../helpers";
import { stopSchema } from "../schemas";

export function registerAddDay(server: McpServer): void {
  server.registerTool("add_day", {
    title: "Add Day",
    description: "Add a day with stops to an existing plan...",
    inputSchema: { /* ... */ },
  }, async ({ planSlug, dayNumber, title, description, stops }) => {
    // ... handler body, copied from current server.ts
  });
}
```

## Acceptance Criteria

1. `src/mcp/server.ts` is under 50 lines (imports + registrations + main)
2. Each of the 10 tools has its own file in `src/mcp/tools/`
3. Shared schemas (`stopSchema`, `linkSchema`, `costSchema`, `durationSchema`) extracted to `src/mcp/schemas.ts`
4. Helper functions (`runEffect`, `runEffectSafe`, `errResult`, `okResult`) in `src/mcp/helpers.ts`
5. `serializePlan` in `src/mcp/serialize.ts`
6. All existing MCP tool names, descriptions, inputSchemas, and handler behavior are UNCHANGED
7. `npm run build` succeeds
8. `npx vitest run` — all tests pass (including launcher smoke test)
9. MCP server starts correctly via `bin/turistguide-maps-mcp.mjs`

## Step-by-Step Implementation

### Step 1: Create `src/mcp/helpers.ts`
Extract `runEffect`, `runEffectSafe`, `errResult`, `okResult`. Import `Effect` and `AppLayer`.

### Step 2: Create `src/mcp/schemas.ts`
Extract `stopSchema` (used by add_day and add_stop). Also extract `linkSchema`, `costSchema`, `durationSchema` as named exports for cleaner schema composition. Keep descriptions identical.

### Step 3: Create `src/mcp/serialize.ts`
Extract `serializePlan` function. Import `googleMapsUrl` from read-model-port.

### Step 4: Create `src/mcp/tools/` directory and per-tool files
Copy each tool registration into its own file with the pattern above. One file per tool, named kebab-case matching the tool name (add-day.ts, etc.).

### Step 5: Rewrite `src/mcp/server.ts`
Import all registration functions and wire them:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListItineraries } from "./tools/list-itineraries";
import { registerGetItinerary } from "./tools/get-itinerary";
// ... etc for all 10 tools

const server = new McpServer({ name: "turistguide-maps", version: "0.2.0" });

registerListItineraries(server);
registerGetItinerary(server);
registerCreatePlan(server);
registerDeletePlan(server);
registerAddDay(server);
registerRemoveDay(server);
registerUpdateDay(server);
registerAddStop(server);
registerRemoveStop(server);
registerUpdateStop(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch((err) => { console.error("MCP server failed:", err); process.exit(1); });
```

### Step 6: Update `src/mcp/tsconfig.json`
Add `./tools/**/*.ts` and new module files to the `include` array:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "strict": false, "skipLibCheck": true, "noEmit": true },
  "include": ["./**/*.ts", "../../src/core/**/*.ts", "../../src/adapters/**/*.ts", "../../src/composition-root.ts"]
}
```

### Step 7: Run tests
```bash
npx vitest run
npm run build
```

### Step 8: Manual MCP smoke test
```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node bin/turistguide-maps-mcp.mjs
```
Expected: JSON response listing all 10 tools.

## Out of Scope

- Removing `as any` from tool handler return types (can be a follow-up)
- Adding unit/contract tests for individual MCP tools
- Changing MCP tool signatures, descriptions, or behavior
- Refactoring Effect TS error handling patterns
- Changing the launcher script