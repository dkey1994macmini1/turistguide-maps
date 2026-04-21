// Postgres Day Repository — implements DayRepositoryPort as an Effect Layer

import { Effect, Layer } from "effect";
import { DayRepositoryPort, type DayRepository } from "../../core/ports/day-repository-port";
import { RepositoryError } from "../../core/errors";
import { DayId, PlanId } from "../../core/branded";
import type { DayCreateInput, DayUpdateInput } from "../../core/day";
import { days, type DayDAO, type DayInsertDAO } from "@/common/db/schema";
import { eq } from "drizzle-orm";
import { DbClientLive, type DbClient } from "./client";
import { toDay } from "./mappers";

const makePostgresDayRepository = (db: DbClient): DayRepository => ({
  createDay: (input: DayCreateInput) =>
    Effect.tryPromise({
      try: async () => {
        const id = DayId(`day-${crypto.randomUUID()}`);
        const insertData: DayInsertDAO = {
          id,
          planId: PlanId(input.planId),
          dayNumber: input.dayNumber,
          title: input.title ?? null,
          description: input.description ?? null,
        };
        const [row] = await db.insert(days).values(insertData).returning();
        return toDay(row);
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),

  getDayById: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db.select().from(days).where(eq(days.id, id)).limit(1);
        if (!row) throw { _tag: "NotFoundError" as const, id };
        return toDay(row);
      },
      catch: (error): RepositoryError => {
        if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
          return error as RepositoryError;
        return RepositoryError.from(error);
      },
    }),

  listDaysByPlanId: (planId: string) =>
    Effect.tryPromise({
      try: async () => {
        const rows = await db.select().from(days).where(eq(days.planId, planId)).orderBy(days.dayNumber);
        return rows.map(toDay);
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),

  updateDay: (id: string, input: DayUpdateInput) =>
    Effect.tryPromise({
      try: async () => {
        const updateData: Partial<DayDAO> = {
          ...(input.dayNumber !== undefined && { dayNumber: input.dayNumber }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
        };
        const [row] = await db.update(days).set(updateData).where(eq(days.id, id)).returning();
        if (!row) throw { _tag: "NotFoundError" as const, id };
        return toDay(row);
      },
      catch: (error): RepositoryError => {
        if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
          return error as RepositoryError;
        return RepositoryError.from(error);
      },
    }),

  deleteDay: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        await db.delete(days).where(eq(days.id, id));
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),

  reorderDays: (items: Array<{ id: string; dayNumber: number }>) =>
    Effect.tryPromise({
      try: async () => {
        await db.transaction(async (tx) => {
          for (const item of items) {
            await tx.update(days).set({ dayNumber: item.dayNumber }).where(eq(days.id, item.id));
          }
        });
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),
});

export const PostgresDayRepositoryLive = Layer.effect(
  DayRepositoryPort,
  Effect.gen(function* () {
    const db = yield* DbClientLive;
    return DayRepositoryPort.of(makePostgresDayRepository(db));
  })
);