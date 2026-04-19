// Day repository — CRUD operations using Effect with tagged RepositoryError

import { Effect } from "effect";
import { eq } from "drizzle-orm";
import type { DbClient, RepositoryError } from "./client";
import { RepositoryError as RepoErr } from "./client";
import { days, type DayDAO, type DayInsertDAO } from "./schema";
import type { Day, DayCreateInput, DayUpdateInput } from "@/domain/day";
import { DayId, PlanId } from "@/domain/branded";

/** Convert a DAO row to a domain Day */
const toDay = (row: DayDAO): Day => ({
  id: DayId(row.id),
  planId: PlanId(row.planId),
  dayNumber: row.dayNumber,
  title: row.title,
  description: row.description,
});

/** Create a new day */
export const createDay = (db: DbClient) => (input: DayCreateInput): Effect.Effect<Day, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const id = DayId(`day-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
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
    catch: (error): RepositoryError => RepoErr.from(error),
  });

/** Get a day by ID */
export const getDayById = (db: DbClient) => (id: string): Effect.Effect<Day, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db.select().from(days).where(eq(days.id, id)).limit(1);
      if (!row) throw { _tag: "NotFoundError" as const, id };
      return toDay(row);
    },
    catch: (error): RepositoryError => {
      if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
        return error as RepositoryError;
      return RepoErr.from(error);
    },
  });

/** List days for a plan */
export const listDaysByPlanId = (db: DbClient) => (planId: string): Effect.Effect<Day[], RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(days).where(eq(days.planId, planId)).orderBy(days.dayNumber);
      return rows.map(toDay);
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });

/** Update a day */
export const updateDay = (db: DbClient) => (id: string, input: DayUpdateInput): Effect.Effect<Day, RepositoryError> =>
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
      return RepoErr.from(error);
    },
  });

/** Delete a day */
export const deleteDay = (db: DbClient) => (id: string): Effect.Effect<void, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      await db.delete(days).where(eq(days.id, id));
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });

/** Reorder days within a plan — updates dayNumber for specified day IDs */
export const reorderDays = (db: DbClient) => (reorderInput: Array<{ id: string; dayNumber: number }>): Effect.Effect<void, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      for (const item of reorderInput) {
        await db.update(days).set({ dayNumber: item.dayNumber }).where(eq(days.id, item.id));
      }
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });