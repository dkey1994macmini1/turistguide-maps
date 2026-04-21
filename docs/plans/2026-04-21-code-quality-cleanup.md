# Code Quality Cleanup Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix 8 concrete code quality issues identified during codebase review — bugs, duplication, inverted dependencies, and structural smells.

**Architecture:** Incremental refactoring within existing Ports & Adapters structure. No new patterns, no new libraries. Each task is independently deployable.

**Tech Stack:** TypeScript, Effect TS, Drizzle ORM, Vitest, Next.js 15

**Stats:** ~4392 LOC src, ~1397 LOC tests, 10 API routes, 10 MCP tools

---

## P0 — Bugs (must fix before anything else)

### Task 1: Add `audioUrl` to API serializer

**Objective:** Frontend never receives `audioUrl` because `serializeReadModel` in plans/[slug]/route.ts skips it.

**Files:**
- Modify: `src/app/api/plans/[slug]/route.ts:30-48` (serializeReadModel function)

**Step 1: Write failing test**

Add assertion in `src/app/plans/[slug]/__tests__/stop-detail.test.tsx`:

```tsx
it("receives audioUrl from API response", () => {
  const withAudio = { ...baseStop, audioUrl: "/api/audio/stops/s1" };
  render(<StopDetail stop={withAudio} onClose={() => {}} />);
  // Audio player should be present when audioUrl is non-null
  expect(document.querySelector("audio")).toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/app/plans/[slug]/__tests__/stop-detail.test.tsx`
Expected: PASS (component test, API bug is separate)

**Step 3: Fix API serializer**

In `src/app/api/plans/[slug]/route.ts`, add `audioUrl` to the stop serialization inside `serializeReadModel`:

```ts
stops: day.stops.map((stop) => ({
  id: stop.id,
  dayId: stop.dayId,
  title: stop.title,
  summary: stop.summary ?? null,
  description: stop.description,
  lat: stop.lat,
  lng: stop.lng,
  sortOrder: stop.sortOrder,
  links: stop.links.map((l) => ({ label: l.label, url: l.url })),
  googleMapsUrl: stop.googleMapsUrl,
  duration: stop.duration ?? null,
  cost: stop.cost ?? null,
  reservation: stop.reservation ?? null,
  bring: stop.bring ?? [],
  bestTime: stop.bestTime ?? null,
  warnings: stop.warnings ?? [],
  alternative: stop.alternative ?? null,
  audioUrl: stop.audioUrl ?? null,
})),
```

**Step 4: Verify manually**

Run: `npm run dev` → open a plan with audio → check network response contains `audioUrl`

**Step 5: Commit**

```bash
git add src/app/api/plans/[slug]/route.ts
git commit -m "fix(api): add audioUrl to plan serializer

Frontend was never receiving audioUrl — serializeReadModel skipped it."
```

---

## P1 — Deduplication (structural, prevents future bugs)

### Task 2: Extract shared `toStop` mapper to single file

**Objective:** Three copies of `toStop` (stop-repository.ts, read-model.ts, in-memory-stop-repository.ts) drift on every schema change. Single source of truth.

**Files:**
- Create: `src/adapters/db/mappers.ts`
- Modify: `src/adapters/db/stop-repository.ts`
- Modify: `src/adapters/db/read-model.ts`
- Modify: `src/fakes/in-memory-stop-repository.ts`

**Step 1: Create shared mapper file**

```ts
// src/adapters/db/mappers.ts
// Shared DAO → domain mappers. Single source of truth for field mapping.

import { StopId, DayId, PlanId, Slug } from "@/core/branded";
import type { Stop, StopCreateInput, StopUpdateInput } from "@/core/stop";
import type { Plan } from "@/core/plan";
import type { Day } from "@/core/day";
import type { StopLink } from "@/core/stop-link";
import type { DurationRange, CostInfo } from "@/core/stop-types";
import type { StopDAO } from "@/common/db/schema";

/** Convert a stop DAO row to domain Stop */
export const toStop = (row: StopDAO): Stop => ({
  id: StopId(row.id),
  dayId: DayId(row.dayId),
  title: row.title,
  summary: row.summary,
  description: row.description,
  lat: row.lat,
  lng: row.lng,
  sortOrder: row.sortOrder,
  links: (row.links ?? []) as ReadonlyArray<StopLink>,
  duration: (row.duration as DurationRange) ?? null,
  cost: (row.cost as CostInfo) ?? null,
  reservation: row.reservation ?? null,
  bring: (row.bring ?? []) as ReadonlyArray<string>,
  bestTime: row.bestTime ?? null,
  warnings: (row.warnings ?? []) as ReadonlyArray<string>,
  alternative: row.alternative ?? null,
  audioUrl: row.audioUrl ?? null,
});

/** Convert input fields to Drizzle insert shape */
export const toStopInsertDAO = (input: StopCreateInput, id: string) => ({
  id,
  dayId: DayId(input.dayId),
  title: input.title,
  summary: input.summary ?? null,
  description: input.description,
  lat: input.lat,
  lng: input.lng,
  sortOrder: input.sortOrder,
  links: (input.links ?? []) as Array<{ label: string; url: string }>,
  duration: input.duration ?? null,
  cost: input.cost ?? null,
  reservation: input.reservation ?? null,
  bring: input.bring ?? [],
  bestTime: input.bestTime ?? null,
  warnings: input.warnings ?? [],
  alternative: input.alternative ?? null,
  audioUrl: input.audioUrl ?? null,
});

/** Convert update input to Drizzle partial update shape */
export const toStopUpdateDAO = (input: StopUpdateInput): Partial<StopDAO> => ({
  ...(input.title !== undefined && { title: input.title }),
  ...(input.summary !== undefined && { summary: input.summary }),
  ...(input.description !== undefined && { description: input.description }),
  ...(input.lat !== undefined && { lat: input.lat }),
  ...(input.lng !== undefined && { lng: input.lng }),
  ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
  ...(input.links !== undefined && { links: input.links as Array<{ label: string; url: string }> }),
  ...(input.duration !== undefined && { duration: input.duration as DurationRange | null }),
  ...(input.cost !== undefined && { cost: input.cost as CostInfo | null }),
  ...(input.reservation !== undefined && { reservation: input.reservation as string | null }),
  ...(input.bring !== undefined && { bring: [...(input.bring ?? [])] }),
  ...(input.bestTime !== undefined && { bestTime: input.bestTime as string | null }),
  ...(input.warnings !== undefined && { warnings: [...(input.warnings ?? [])] }),
  ...(input.alternative !== undefined && { alternative: input.alternative as string | null }),
  ...(input.audioUrl !== undefined && { audioUrl: input.audioUrl as string | null }),
});
```

Note: also add `toDay` and `toPlan` mappers following same pattern, deduplicating from read-model.ts.

**Step 2: Update stop-repository.ts**

Replace inline `toStop`, `StopInsertDAO` construction, and `Partial<StopDAO>` construction with imports from `./mappers`:

```ts
import { toStop, toStopInsertDAO, toStopUpdateDAO } from "./mappers";
```

Remove the `toStop` function definition (lines 15-33). Replace `createStop` and `updateStop` bodies to use `toStopInsertDAO` / `toStopUpdateDAO`.

**Step 3: Update read-model.ts**

Replace inline `toStop`, `toDay`, `toPlan` with imports from `./mappers`:

```ts
import { toStop, toDay, toPlan } from "./mappers";
```

**Step 4: Update in-memory-stop-repository.ts**

The fake uses domain objects directly (no DAO). Extract a separate pure-domain helper:

```ts
// src/fakes/in-memory-stop-repository.ts
import { mergeUpdate } from "@/fakes/merge-helpers";
```

Create `src/fakes/merge-helpers.ts` with:

```ts
/** Merge a StopUpdateInput into existing Stop — pure domain, no DAO */
export const mergeStopUpdate = (existing: Stop, input: StopUpdateInput): Stop => ({
  ...existing,
  ...(input.title !== undefined && { title: input.title }),
  ...(input.summary !== undefined && { summary: input.summary }),
  ...(input.description !== undefined && { description: input.description }),
  ...(input.lat !== undefined && { lat: input.lat }),
  ...(input.lng !== undefined && { lng: input.lng }),
  ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
  ...(input.links !== undefined && { links: input.links }),
  ...(input.duration !== undefined && { duration: input.duration }),
  ...(input.cost !== undefined && { cost: input.cost }),
  ...(input.reservation !== undefined && { reservation: input.reservation }),
  ...(input.bring !== undefined && { bring: input.bring }),
  ...(input.bestTime !== undefined && { bestTime: input.bestTime }),
  ...(input.warnings !== undefined && { warnings: input.warnings }),
  ...(input.alternative !== undefined && { alternative: input.alternative }),
  ...(input.audioUrl !== undefined && { audioUrl: input.audioUrl }),
});
```

Use it in `in-memory-stop-repository.ts` replacing the spread-and-conditional block.

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/adapters/db/mappers.ts src/fakes/merge-helpers.ts src/adapters/db/stop-repository.ts src/adapters/db/read-model.ts src/fakes/in-memory-stop-repository.ts
git commit -m "refactor: extract toStop mapper to single source of truth

Three copies of toStop (stop-repo, read-model, in-memory) diverged on
every schema change. Now mappers.ts owns DAO→domain, merge-helpers.ts
owns domain merge logic. Adding a field = update 2 files, not 6."
```

---

### Task 3: Extract also `toDay` and `toPlan` to mappers.ts

**Objective:** read-model.ts has its own `toDay` (line 44) and `toPlan` (line 53). Move to mappers.ts.

**Files:**
- Modify: `src/adapters/db/mappers.ts` — add `toDay`, `toPlan`
- Modify: `src/adapters/db/read-model.ts` — import from mappers, delete inline versions

**Step 1: Add to mappers.ts**

```ts
import type { DayDAO, PlanDAO } from "@/common/db/schema";

export const toDay = (row: DayDAO): Day => ({
  id: DayId(row.id),
  planId: PlanId(row.planId),
  dayNumber: row.dayNumber,
  title: row.title,
  description: row.description,
});

export const toPlan = (row: PlanDAO): Plan => ({
  id: PlanId(row.id),
  slug: Slug(row.slug),
  title: row.title,
  description: row.description,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
```

**Step 2: Update read-model.ts — import instead of define**

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git commit -m "refactor: extract toDay/toPlan to shared mappers"
```

---

## P1 — Dependency inversion

### Task 4: Fix core/errors.ts inverted dependency

**Objective:** `core/errors.ts` imports from `features/` — core should not know features. Move error types to core or create shared error types.

**Files:**
- Modify: `src/core/errors.ts`
- Create: `src/core/validation-errors.ts` (move CoordinateValidationError, UrlValidationError, SlugValidationError here)
- Modify: `src/features/stop/stop.errors.ts` — re-export from core
- Modify: `src/features/plan/plan.errors.ts` — re-export from core
- Modify: `src/features/stop/stop.validation.ts` — import from core
- Modify: `src/core/validation.ts` — already imports from features, update

**Step 1: Create core/validation-errors.ts**

```ts
// src/core/validation-errors.ts
// Validation error types — owned by core, used by features

export type CoordinateValidationError = {
  readonly _tag: "CoordinateValidationError";
  readonly field: "lat" | "lng";
  readonly value: number;
  readonly message: string;
};

export type UrlValidationError = {
  readonly _tag: "UrlValidationError";
  readonly url: string;
  readonly message: string;
};

export type SlugValidationError = {
  readonly _tag: "SlugValidationError";
  readonly slug: string;
  readonly message: string;
};
```

**Step 2: Update feature error files to re-export from core**

`src/features/stop/stop.errors.ts`:
```ts
// Re-export from core for backward compatibility
export type { CoordinateValidationError, UrlValidationError } from "@/core/validation-errors";
```

`src/features/plan/plan.errors.ts`:
```ts
export type { SlugValidationError } from "@/core/validation-errors";
```

**Step 3: Update core/errors.ts**

Remove the re-export lines (lines 3-4). Types now live in `core/validation-errors.ts`.

**Step 4: Update imports in validation.ts and validation files**

`src/core/validation.ts` — import from `./validation-errors` instead of features.
`src/features/stop/stop.validation.ts` — import from `@/core/validation-errors` instead of local.

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 6: Commit**

```bash
git commit -m "refactor: move validation error types from features/ to core/

core/errors.ts imported from features — inverted dependency. Error types
now defined in core/validation-errors.ts, features re-export for compat."
```

---

## P1 — ID generation

### Task 5: Replace `Date.now()+random` IDs with `crypto.randomUUID()`

**Objective:** Two places generate IDs with collision-prone `Date.now() + Math.random()`. Use platform `crypto.randomUUID()`.

**Files:**
- Modify: `src/adapters/db/stop-repository.ts` — `createStop` (line 39)
- Modify: `src/fakes/in-memory-stop-repository.ts` — `createStop` (line 13)
- Also check `src/adapters/db/day-repository.ts` and `src/adapters/db/plan-repository.ts` for same pattern

**Step 1: Update all ID generation**

Replace:
```ts
const id = StopId(`stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
```

With:
```ts
const id = StopId(`stop-${crypto.randomUUID()}`);
```

Apply same for `DayId`, `PlanId` in respective repositories and fakes.

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git commit -m "refactor: use crypto.randomUUID() for ID generation

Date.now()+Math.random is collision-prone under concurrency. 
crypto.randomUUID() is zero-dependency and collision-safe."
```

---

## P1 — Data integrity

### Task 6: Wrap reorderStops in a Drizzle transaction

**Objective:** `reorderStops` does N individual UPDATEs — partial failure leaves data inconsistent. Wrap in transaction.

**Files:**
- Modify: `src/adapters/db/stop-repository.ts` — `reorderStops` method
- Modify: `src/adapters/db/day-repository.ts` — `reorderDays` if same pattern
- Modify: `src/adapters/db/client.ts` — may need to expose transaction helper

**Step 1: Check client.ts for transaction support**

Read `src/adapters/db/client.ts`. Drizzle supports `db.transaction()` — check if `DbClient` type exposes it.

**Step 2: Wrap reorderStops in transaction**

```ts
reorderStops: (items: Array<{ id: string; sortOrder: number }>) =>
  Effect.tryPromise({
    try: async () => {
      await db.transaction(async (tx) => {
        for (const item of items) {
          await tx.update(stops).set({ sortOrder: item.sortOrder }).where(eq(stops.id, item.id));
        }
      });
    },
    catch: (error): RepositoryError => RepositoryError.from(error),
  }),
```

**Step 3: Same for reorderDays if applicable**

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git commit -m "fix: wrap reorderStops/reorderDays in DB transaction

Individual UPDATEs without transaction = partial failure leaves
inconsistent sort order. Now atomic."
```

---

## P2 — DRY (low risk, improves maintainability)

### Task 7: Extract AUDIO_DIR shared constant

**Objective:** `AUDIO_DIR` duplicated in `stops/[stopId]/audio/route.ts:9` and `stops/[stopId]/tts/route.ts:9`.

**Files:**
- Create: `src/app/api/stops/[stopId]/audio-constants.ts`
- Modify: `src/app/api/stops/[stopId]/audio/route.ts`
- Modify: `src/app/api/stops/[stopId]/tts/route.ts`

**Step 1: Create shared constants**

```ts
// src/app/api/stops/[stopId]/audio-constants.ts
import { join } from "path";

export const AUDIO_DIR = join(process.cwd(), "storage", "audio", "stops");
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav",
  "audio/webm", "audio/mp4", "audio/x-m4a",
];
```

**Step 2: Update both route files to import from audio-constants.ts**

**Step 3: Run build** (no tests for route handlers currently)

Run: `npx vitest run && npm run build`
Expected: PASS + successful build

**Step 4: Commit**

```bash
git commit -m "refactor: extract AUDIO_DIR + audio constants to shared file"
```

---

### Task 8: Remove `Either` bypass helpers in stop.validation.ts

**Objective:** `validateLatitudeEither` etc. call `Effect.runSync(Effect.either(...))` — breaks referential transparency. If nobody uses them, delete. If tests use them, rewrite tests.

**Files:**
- Modify: `src/features/stop/stop.validation.ts`
- Search: any imports of `validateLatitudeEither`, `validateUrlEither`

**Step 1: Check usage**

Search codebase for `validateLatitudeEither`, `validateLongitudeEither`, `validateUrlEither`.

**Step 2: If unused — delete lines 93-100**

**Step 3: If tests use them — refactor tests to use `Effect.runPromiseExit` instead**

```ts
// Before:
const result = validateLatitudeEither(91);

// After (in test):
const result = await Effect.runPromiseExit(validateLatitude(91));
expect(result._tag).toBe("Failure");
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git commit -m "refactor: remove Either bypass helpers from validation

validateLatitudeEither etc. break referential transparency by calling
runSync inside. Tests now use Effect.runPromiseExit directly."
```

---

## P2 — Structural (bigger change, lower priority)

### Task 9: Split MCP server into tool files

**Objective:** `src/mcp/server.ts` is 660 lines. Split into `src/mcp/tools/` directory with one file per tool.

**Files:**
- Create: `src/mcp/tools/add-day.ts`
- Create: `src/mcp/tools/add-stop.ts`
- Create: `src/mcp/tools/update-stop.ts`
- Create: `src/mcp/tools/remove-stop.ts`
- Create: `src/mcp/tools/update-day.ts`
- Create: `src/mcp/tools/remove-day.ts`
- Create: `src/mcp/tools/list-itineraries.ts`
- Create: `src/mcp/tools/get-itinerary.ts`
- Create: `src/mcp/tools/create-plan.ts`
- Create: `src/mcp/tools/delete-plan.ts`
- Create: `src/mcp/helpers.ts` (serializePlan, okResult, errResult, googleMapsUrl, runEffect, runEffectSafe)
- Modify: `src/mcp/server.ts` — slim orchestrator that imports and registers all tools

**Pattern per tool file:**

```ts
// src/mcp/tools/add-stop.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runEffect, okResult, errResult } from "../helpers";

export function registerAddStop(server: McpServer) {
  server.registerTool("add_stop", { ... }, async (...) => { ... });
}
```

**Slim server.ts:**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAddDay } from "./tools/add-day";
import { registerAddStop } from "./tools/add-stop";
// ... etc

const server = new McpServer({ name: "turistguide-maps", version: "1.0.0" });

registerAddDay(server);
registerAddStop(server);
// ... etc

const transport = new StdioServerTransport();
server.connect(transport);
```

**Step 1: Extract helpers.ts** (serializePlan, okResult, errResult, googleMapsUrl, runEffect, runEffectSafe, stopSchema)

**Step 2: Extract tools one by one, registering from server.ts**

**Step 3: Run dev mode + test MCP manually**

Run: `npm run dev` → connect Hermes → test `list_itineraries` → test `get_itinerary`

**Step 4: Commit**

```bash
git commit -m "refactor(mcp): split 660-line server.ts into per-tool files

server.ts now 30 lines — just registers tools. Each tool in its own
file under tools/. Shared helpers extracted to helpers.ts."
```

---

### Task 10: Deduplicate `serializeReadModel` across API routes

**Objective:** `serializePlan` exists in both `plans/route.ts` and `plans/[slug]/route.ts`. `serializeReadModel` exists only in `plans/[slug]/route.ts` but should be shared.

**Files:**
- Create: `src/app/api/serializers.ts`
- Modify: `src/app/api/plans/route.ts` — import from serializers
- Modify: `src/app/api/plans/[slug]/route.ts` — import from serializers
- Modify: `src/mcp/server.ts` — `serializePlan` in MCP is different shape (for agents), keep it separate but consider

**Step 1: Create shared serializer**

```ts
// src/app/api/serializers.ts
import type { Plan } from "@/core/plan";
import type { PlanReadModel } from "@/core/ports/read-model-port";

export function serializePlan(p: Plan) { ... }
export function serializeReadModel(plan: PlanReadModel) { ... }
```

**Step 2: Update route files to import**

**Step 3: Run build + tests**

Run: `npx vitest run && npm run build`

**Step 4: Commit**

```bash
git commit -m "refactor(api): extract serializers to shared file"
```

---

## Task execution order

| # | Task | Priority | Risk | Est. |
|---|------|----------|------|------|
| 1 | audioUrl in API serializer | P0 bug | low | 5 min |
| 2 | Extract toStop/toDay/toPlan mappers | P1 | medium | 20 min |
| 3 | (included in Task 2) | — | — | — |
| 4 | Fix core→features inverted dep | P1 | low | 10 min |
| 5 | crypto.randomUUID() IDs | P1 | low | 5 min |
| 6 | Transaction for reorderStops | P1 | medium | 10 min |
| 7 | Extract AUDIO_DIR constant | P2 | low | 5 min |
| 8 | Remove Either bypass helpers | P2 | low | 5 min |
| 9 | Split MCP server into tool files | P2 | high | 30 min |
| 10 | Deduplicate API serializers | P2 | low | 10 min |

**Total estimate:** ~100 min

## Out of scope (not doing now)

- Shared Effect Runtime for API routes (requires Next.js App Router deep integration)
- Zod validation on API route bodies (replace `as Record<string, unknown>` casts — separate effort)
- Removing `as any` from MCP server (2 instances, low impact)