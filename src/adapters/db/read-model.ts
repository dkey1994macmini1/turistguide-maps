// Read model — returns full plan with nested days and stops
// Uses Drizzle queries with inArray for efficient multi-stop loading

import { Effect } from "effect";
import { eq, inArray } from "drizzle-orm";
import type { DbClient, RepositoryError } from "./client";
import { RepositoryError as RepoErr } from "./client";
import { plans, days, stops } from "./schema";
import { PlanId, DayId, StopId, Slug } from "@/domain/branded";
import type { Plan } from "@/domain/plan";
import type { Day } from "@/domain/day";
import type { Stop } from "@/domain/stop";
import type { StopLink } from "@/domain/stop-link";

/** Full plan read model — plan with nested days and stops */
export type PlanReadModel = Plan & {
  days: Array<Day & {
    stops: Stop[];
  }>;
};

/** Convert a stop DAO row to domain Stop */
const toStop = (row: typeof stops.$inferSelect): Stop => ({
  id: StopId(row.id),
  dayId: DayId(row.dayId),
  title: row.title,
  description: row.description,
  lat: row.lat,
  lng: row.lng,
  sortOrder: row.sortOrder,
  links: (row.links ?? []) as ReadonlyArray<StopLink>,
});

/** Convert a day DAO row to domain Day */
const toDay = (row: typeof days.$inferSelect): Day => ({
  id: DayId(row.id),
  planId: PlanId(row.planId),
  dayNumber: row.dayNumber,
  title: row.title,
  description: row.description,
});

/** Convert a plan DAO row to domain Plan */
const toPlan = (row: typeof plans.$inferSelect): Plan => ({
  id: PlanId(row.id),
  slug: Slug(row.slug),
  title: row.title,
  description: row.description,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Build a PlanReadModel from a plan row, day rows, and stop rows */
const buildReadModel = (
  planRow: typeof plans.$inferSelect,
  dayRows: typeof days.$inferSelect[],
  stopRows: typeof stops.$inferSelect[],
): PlanReadModel => ({
  ...toPlan(planRow),
  days: dayRows.map((dayRow) => ({
    ...toDay(dayRow),
    stops: stopRows
      .filter((s) => s.dayId === dayRow.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toStop),
  })),
});

/** Get a full plan by slug with nested days and stops */
export const getPlanReadModelBySlug = (db: DbClient) => (slug: string): Effect.Effect<PlanReadModel, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const [planRow] = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
      if (!planRow) throw { _tag: "NotFoundError" as const, id: slug };

      const dayRows = await db.select().from(days).where(eq(days.planId, planRow.id)).orderBy(days.dayNumber);
      const dayIds = dayRows.map((d) => d.id);

      const stopRows = dayIds.length > 0
        ? await db.select().from(stops).where(inArray(stops.dayId, dayIds)).orderBy(stops.sortOrder)
        : [];

      return buildReadModel(planRow, dayRows, stopRows);
    },
    catch: (error): RepositoryError => {
      if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
        return error as RepositoryError;
      return RepoErr.from(error);
    },
  });

/** Get a full plan by ID with nested days and stops */
export const getPlanReadModelById = (db: DbClient) => (id: string): Effect.Effect<PlanReadModel, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const [planRow] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
      if (!planRow) throw { _tag: "NotFoundError" as const, id };

      const dayRows = await db.select().from(days).where(eq(days.planId, planRow.id)).orderBy(days.dayNumber);
      const dayIds = dayRows.map((d) => d.id);

      const stopRows = dayIds.length > 0
        ? await db.select().from(stops).where(inArray(stops.dayId, dayIds)).orderBy(stops.sortOrder)
        : [];

      return buildReadModel(planRow, dayRows, stopRows);
    },
    catch: (error): RepositoryError => {
      if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
        return error as RepositoryError;
      return RepoErr.from(error);
    },
  });