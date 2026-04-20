// Postgres Stop Repository — implements StopRepositoryPort as an Effect Layer

import { Effect, Layer } from "effect";
import { StopRepositoryPort, type StopRepository } from "../../core/ports/stop-repository-port";
import { RepositoryError } from "../../core/errors";
import { StopId, DayId } from "../../core/branded";
import type { Stop, StopCreateInput, StopUpdateInput } from "../../core/stop";
import type { StopLink } from "../../core/stop-link";
import { stops, type StopDAO, type StopInsertDAO } from "./schema";
import { eq } from "drizzle-orm";
import { DbClientLive, type DbClient } from "./client";

/** Convert a DAO row to domain Stop */
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

const makePostgresStopRepository = (db: DbClient): StopRepository => ({
  createStop: (input: StopCreateInput) =>
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
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),

  getStopById: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db.select().from(stops).where(eq(stops.id, id)).limit(1);
        if (!row) throw { _tag: "NotFoundError" as const, id };
        return toStop(row);
      },
      catch: (error): RepositoryError => {
        if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
          return error as RepositoryError;
        return RepositoryError.from(error);
      },
    }),

  listStopsByDayId: (dayId: string) =>
    Effect.tryPromise({
      try: async () => {
        const rows = await db.select().from(stops).where(eq(stops.dayId, dayId)).orderBy(stops.sortOrder);
        return rows.map(toStop);
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),

  updateStop: (id: string, input: StopUpdateInput) =>
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
        return RepositoryError.from(error);
      },
    }),

  deleteStop: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        await db.delete(stops).where(eq(stops.id, id));
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),

  reorderStops: (items: Array<{ id: string; sortOrder: number }>) =>
    Effect.tryPromise({
      try: async () => {
        for (const item of items) {
          await db.update(stops).set({ sortOrder: item.sortOrder }).where(eq(stops.id, item.id));
        }
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),
});

export const PostgresStopRepositoryLive = Layer.effect(
  StopRepositoryPort,
  Effect.gen(function* () {
    const db = yield* DbClientLive;
    return StopRepositoryPort.of(makePostgresStopRepository(db));
  })
);