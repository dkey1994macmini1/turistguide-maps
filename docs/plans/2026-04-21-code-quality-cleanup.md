# Code Quality Cleanup Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix 6 concrete code quality issues identified during codebase review — deduplication, inverted dependencies, ID safety, data integrity, and DRY constants.

**Architecture:** Incremental refactoring within existing Ports & Adapters structure. No new patterns, no new libraries. Each task is independently deployable.

**Tech Stack:** TypeScript, Effect TS, Drizzle ORM, Vitest, Next.js 15

**Stats:** ~4392 LOC src, ~1397 LOC tests, 10 API routes, 10 MCP tools

**Already done:** Task 1 (audioUrl in API serializer) — shipped in commit 10faee2.

---

## P1 — Deduplication

### Task 2: Extract `toStop`, `toDay`, `toPlan` mappers to single file

**Objective:** `toStop` exists in `stop-repository.ts` and `read-model.ts` (two copies). `toDay` and `toPlan` exist only in `read-model.ts`. Extract all three DAO→domain mappers to a single `mappers.ts`. Leave insert/update DAO construction inline in `stop-repository.ts` — those aren't duplicated.

**Files:**
- Create: `src/adapters/db/mappers.ts`
- Modify: `src/adapters/db/stop-repository.ts` — import `toStop` from mappers, delete inline definition
- Modify: `src/adapters/db/read-model.ts` — import `toStop`, `toDay`, `toPlan` from mappers, delete inline definitions

**Note:** `in-memory-stop-repository.ts` operates on domain objects directly (no DAO rows) — leave its update merge logic inline, no changes needed there.

**Step 1: Create mappers.ts**

```ts
// src/adapters/db/mappers.ts
import { StopId, DayId, PlanId, Slug } from "@/core/branded";
import type { Stop } from "@/core/stop";
import type { Plan } from "@/core/plan";
import type { Day } from "@/core/day";
import type { StopLink } from "@/core/stop-link";
import type { DurationRange, CostInfo } from "@/core/stop-types";
import type { StopDAO, DayDAO, PlanDAO } from "@/common/db/schema";

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

**Step 2: Update stop-repository.ts**

Replace the inline `toStop` function (lines 15-33) with:
```ts
import { toStop } from "./mappers";
```

**Step 3: Update read-model.ts**

Replace the inline `toStop`, `toDay`, `toPlan` definitions with:
```ts
import { toStop, toDay, toPlan } from "./mappers";
```

**Step 4: Run all tests**

```bash
npx vitest run
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/adapters/db/mappers.ts src/adapters/db/stop-repository.ts src/adapters/db/read-model.ts
git commit -m "refactor: extract toStop/toDay/toPlan to shared mappers

Three mapper functions spread across stop-repo and read-model drifted on
every schema change. mappers.ts is now the single source of truth."
```

---

## P1 — Dependency inversion

### Task 4: Fix inverted dependencies — core importing from features

**Objective:** Both `core/errors.ts` and `core/validation.ts` import from `features/` — core should not know about features. Fix by:
1. Moving error types to `core/validation-errors.ts`
2. Moving validation implementations into `core/validation.ts` (make it canonical, not a shim)
3. Deleting the now-empty feature files (`stop.errors.ts`, `plan.errors.ts`, `stop.validation.ts`, `plan.validation.ts`)
4. Updating `core/errors.ts` to not import from features
5. Updating core tests to import from core

**Files:**
- Create: `src/core/validation-errors.ts`
- Modify: `src/core/validation.ts` — becomes canonical (real implementations, not re-exports)
- Modify: `src/core/errors.ts` — remove imports from features
- Delete: `src/features/stop/stop.errors.ts`
- Delete: `src/features/plan/plan.errors.ts`
- Delete: `src/features/stop/stop.validation.ts`
- Delete: `src/features/plan/plan.validation.ts`
- Modify: `src/core/__tests__/validation.test.ts` — update imports to core
- Modify: `src/core/__tests__/plan.test.ts` — update imports to core

**Step 1: Create core/validation-errors.ts**

```ts
// src/core/validation-errors.ts
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

**Step 2: Rewrite core/validation.ts as canonical**

Replace the shim content with the actual implementations from `features/stop/stop.validation.ts` and `features/plan/plan.validation.ts`. Remove the Either bypass helpers (`validateLatitudeEither`, `validateLongitudeEither`, `validateUrlEither`, `validateSlugEither`) — they're dead code, nothing consumes them.

The canonical `core/validation.ts` should export:
- `validateLatitude`, `validateLongitude`, `validateCoordinates` (from stop.validation.ts)
- `validateUrl` (from stop.validation.ts)
- `validateSlug` (from plan.validation.ts)

Import error types from `./validation-errors`.

**Step 3: Update core/errors.ts**

Remove the two re-export lines:
```ts
// DELETE these:
export { type CoordinateValidationError, type UrlValidationError } from "@/features/stop/stop.errors";
export { type SlugValidationError } from "@/features/plan/plan.errors";
```

**Step 4: Delete the four feature files**

```bash
rm src/features/stop/stop.errors.ts
rm src/features/plan/plan.errors.ts
rm src/features/stop/stop.validation.ts
rm src/features/plan/plan.validation.ts
```

**Step 5: Update core tests**

`src/core/__tests__/validation.test.ts` — change imports:
```ts
// Before:
import { validateLatitude, ... } from "@/features/stop/stop.validation";
import { validateSlug } from "@/features/plan/plan.validation";
import type { CoordinateValidationError, UrlValidationError } from "@/features/stop/stop.errors";
import type { SlugValidationError } from "@/features/plan/plan.errors";

// After:
import { validateLatitude, ... } from "@/core/validation";
import { validateSlug } from "@/core/validation";
import type { CoordinateValidationError, UrlValidationError, SlugValidationError } from "@/core/validation-errors";
```

`src/core/__tests__/plan.test.ts` — same pattern for `validateSlug`.

**Step 6: Run all tests**

```bash
npx vitest run
```
Expected: ALL PASS

**Step 7: Commit**

```bash
git commit -m "refactor: fix inverted dependencies — core no longer imports from features

core/errors.ts and core/validation.ts both imported from features/.
Error types now live in core/validation-errors.ts. Validation functions
live in core/validation.ts (canonical, not a shim). Four feature files
deleted. Either bypass helpers removed — they were dead code."
```

---

## P1 — ID generation

### Task 5: Replace `Date.now()+random` IDs with `crypto.randomUUID()`

**Objective:** Five places generate IDs with collision-prone `Date.now() + Math.random()`. Use platform `crypto.randomUUID()`.

**Files:**
- `src/adapters/db/stop-repository.ts` — `createStop` (line 39)
- `src/adapters/db/day-repository.ts` — `createDay`
- `src/adapters/db/plan-repository.ts` — `createPlan`
- `src/fakes/in-memory-stop-repository.ts` — `createStop` (line 13)
- `src/fakes/in-memory-day-repository.ts` — `createDay`
- `src/fakes/in-memory-plan-repository.ts` — `createPlan`

**Step 1: Update all ID generation**

Replace pattern:
```ts
const id = StopId(`stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
```

With:
```ts
const id = StopId(`stop-${crypto.randomUUID()}`);
```

Apply same for `DayId` and `PlanId` in respective repositories and fakes.

**Step 2: Run all tests**

```bash
npx vitest run
```
Expected: ALL PASS

**Step 3: Commit**

```bash
git commit -m "refactor: use crypto.randomUUID() for ID generation

Date.now()+Math.random is collision-prone under concurrency.
crypto.randomUUID() is zero-dependency and collision-safe."
```

---

## P1 — Data integrity

### Task 6: Wrap reorderStops and reorderDays in DB transactions

**Objective:** Both `reorderStops` (stop-repository.ts) and `reorderDays` (day-repository.ts) run N individual UPDATEs — partial failure leaves inconsistent sort order. Wrap both in transactions.

**Files:**
- `src/adapters/db/stop-repository.ts` — `reorderStops`
- `src/adapters/db/day-repository.ts` — `reorderDays`

**Step 1: Wrap reorderStops in transaction**

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

**Step 2: Same for reorderDays**

Apply same transaction wrapping pattern to `reorderDays` in `day-repository.ts`.

**Step 3: Run all tests**

```bash
npx vitest run
```
Expected: ALL PASS

**Step 4: Commit**

```bash
git commit -m "fix: wrap reorderStops and reorderDays in DB transactions

Individual UPDATEs without a transaction = partial failure leaves
inconsistent sort order. Both reorder operations are now atomic."
```

---

## P2 — DRY

### Task 7: Extract AUDIO_DIR shared constant

**Objective:** `AUDIO_DIR` (and related constants) duplicated in `stops/[stopId]/audio/route.ts` and `stops/[stopId]/tts/route.ts`.

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

**Step 3: Run build**

```bash
npx vitest run && npm run build
```
Expected: PASS + successful build

**Step 4: Commit**

```bash
git commit -m "refactor: extract AUDIO_DIR and audio constants to shared file"
```

---

### Task 10: Deduplicate `serializePlan` across API routes

**Objective:** `serializePlan` duplicated in `plans/route.ts` and `plans/[slug]/route.ts`. `serializeReadModel` exists only in `plans/[slug]/route.ts` but should be shared. Extract both to `src/app/api/serializers.ts`.

Note: MCP's `serializePlan` has a different shape (agent-facing) — keep it separate in `mcp/server.ts`.

**Files:**
- Create: `src/app/api/serializers.ts`
- Modify: `src/app/api/plans/route.ts` — import from serializers
- Modify: `src/app/api/plans/[slug]/route.ts` — import from serializers

**Step 1: Create shared serializer**

```ts
// src/app/api/serializers.ts
import type { Plan } from "@/core/plan";
import type { PlanReadModel } from "@/core/ports/read-model-port";

export function serializePlan(p: Plan) { ... }
export function serializeReadModel(plan: PlanReadModel) { ... }
```

Copy implementations from the existing route files.

**Step 2: Update both route files to import from serializers**

**Step 3: Run build + tests**

```bash
npx vitest run && npm run build
```

**Step 4: Commit**

```bash
git commit -m "refactor(api): extract serializePlan and serializeReadModel to shared file"
```

---

## Task execution order

| # | Task | Priority | Risk | Est. |
|---|------|----------|------|------|
| 2 | Extract toStop/toDay/toPlan mappers | P1 | low | 15 min |
| 4 | Fix core→features inverted deps | P1 | medium | 20 min |
| 5 | crypto.randomUUID() IDs | P1 | low | 5 min |
| 6 | Transactions for reorderStops+Days | P1 | low | 10 min |
| 7 | Extract AUDIO_DIR constant | P2 | low | 5 min |
| 10 | Deduplicate API serializers | P2 | low | 10 min |

**Total estimate:** ~65 min

## Out of scope

- Task 9 (Split MCP server into tool files) — deferred, high risk, no automated tests
- Task 8 (Either bypass helpers) — subsumed by Task 4
- Task 1 (audioUrl in API serializer) — already shipped
- Shared Effect Runtime for API routes
- Zod validation on API route bodies
- Removing `as any` from MCP server
