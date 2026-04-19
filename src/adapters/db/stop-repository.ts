// Stop repository — CRUD operations using Effect with tagged RepositoryError

import { Effect } from "effect";
import { eq } from "drizzle-orm";
import type { DbClient, RepositoryError } from "./client";
import { RepositoryError as RepoErr } from "./client";
import { stops, type StopDAO, type StopInsertDAO } from "./schema";
import type { Stop, StopCreateInput, StopUpdateInput } from "@/domain/stop";
import type { StopLink } from "@/domain/stop-link";
import { StopId, DayId } from "@/domain/branded";

/** Convert a DAO row to a domain Stop */
const toStop = (row: StopDAO): Stop => ({
  id: StopId(row.id),
  dayId: DayId(row.dayId),
  title: row.title,
  description: row.description,
  lat: row.lat,
  lng: row.lng,
  sortOrder: row.sortOrder,
  links: (row.links ?? []) as ReadonlyArray<StopLink>,
});

/** Create a new stop */
export const createStop = (db: DbClient) => (input: StopCreateInput): Effect.Effect<Stop, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const id = StopId(`stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      const insertData: StopInsertDAO = {
        id,
        dayId: DayId(input.dayId),
        title: input.title,
        description: input.description,
        lat: input.lat,
        lng: input.lng,
        sortOrder: input.sortOrder,
        links: (input.links ?? []) as Array<{ label: string; url: string }>,
      };
      const [row] = await db.insert(stops).values(insertData).returning();
      return toStop(row);
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });

/** Get a stop by ID */
export const getStopById = (db: DbClient) => (id: string): Effect.Effect<Stop, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db.select().from(stops).where(eq(stops.id, id)).limit(1);
      if (!row) throw { _tag: "NotFoundError" as const, id };
      return toStop(row);
    },
    catch: (error): RepositoryError => {
      if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
        return error as RepositoryError;
      return RepoErr.from(error);
    },
  });

/** List stops for a day */
export const listStopsByDayId = (db: DbClient) => (dayId: string): Effect.Effect<Stop[], RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(stops).where(eq(stops.dayId, dayId)).orderBy(stops.sortOrder);
      return rows.map(toStop);
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });

/** Update a stop */
export const updateStop = (db: DbClient) => (id: string, input: StopUpdateInput): Effect.Effect<Stop, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const updateData: Partial<StopDAO> = {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.lat !== undefined && { lat: input.lat }),
        ...(input.lng !== undefined && { lng: input.lng }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.links !== undefined && { links: input.links as Array<{ label: string; url: string }> }),
      };
      const [row] = await db.update(stops).set(updateData).where(eq(stops.id, id)).returning();
      if (!row) throw { _tag: "NotFoundError" as const, id };
      return toStop(row);
    },
    catch: (error): RepositoryError => {
      if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
        return error as RepositoryError;
      return RepoErr.from(error);
      return RepoErr.from(error);
    },
  });

/** Delete a stop */
export const deleteStop = (db: DbClient) => (id: string): Effect.Effect<void, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      await db.delete(stops).where(eq(stops.id, id));
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });

/** Reorder stops within a day — updates sortOrder for specified stop IDs */
export const reorderStops = (db: DbClient) => (reorderInput: Array<{ id: string; sortOrder: number }>): Effect.Effect<void, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      for (const item of reorderInput) {
        await db.update(stops).set({ sortOrder: item.sortOrder }).where(eq(stops.id, item.id));
      }
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });