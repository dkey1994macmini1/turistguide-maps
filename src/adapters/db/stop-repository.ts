// Postgres Stop Repository — implements StopRepositoryPort as an Effect Layer

import { Effect, Layer } from "effect";
import { StopRepositoryPort, type StopRepository } from "../../core/ports/stop-repository-port";
import { RepositoryError } from "../../core/errors";
import { StopId, DayId } from "../../core/branded";
import type { Stop, StopCreateInput, StopUpdateInput } from "../../core/stop";
import type { DurationRange, CostInfo } from "../../core/stop-types";
import { stops, type StopDAO, type StopInsertDAO } from "@/common/db/schema";
import { eq } from "drizzle-orm";
import { DbClientLive, type DbClient } from "./client";
import { toStop } from "./mappers";

const makePostgresStopRepository = (db: DbClient): StopRepository => ({
  createStop: (input: StopCreateInput) =>
    Effect.tryPromise({
      try: async () => {
        const id = StopId(`stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const insertData: StopInsertDAO = {
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