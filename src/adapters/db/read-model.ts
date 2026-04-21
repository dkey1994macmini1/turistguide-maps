// Postgres Read Model — implements ReadModelPort as an Effect Layer
// Returns full plan with nested days and stops

import { Effect, Layer } from "effect";
import { ReadModelPort, type ReadModel, type PlanReadModel, type StopReadModel, googleMapsUrl } from "../../core/ports/read-model-port";
import { RepositoryError } from "../../core/errors";
import { PlanId, DayId, StopId, Slug } from "../../core/branded";
import type { Plan } from "../../core/plan";
import type { Day } from "../../core/day";
import type { Stop } from "../../core/stop";
import type { StopLink } from "../../core/stop-link";
import { plans, days, stops } from "@/common/db/schema";
import { eq, inArray } from "drizzle-orm";
import { DbClientLive, type DbClient } from "./client";

/** Convert a stop DAO row to domain Stop */
const toStop = (row: typeof stops.$inferSelect): Stop => ({
  id: StopId(row.id),
  dayId: DayId(row.dayId),
  title: row.title,
  summary: row.summary,
  description: row.description,
  lat: row.lat,
  lng: row.lng,
  sortOrder: row.sortOrder,
  links: (row.links ?? []) as ReadonlyArray<StopLink>,
  duration: (row.duration as import("../../core/stop-types").DurationRange) ?? null,
  cost: (row.cost as import("../../core/stop-types").CostInfo) ?? null,
  reservation: row.reservation ?? null,
  bring: (row.bring ?? []) as ReadonlyArray<string>,
  bestTime: row.bestTime ?? null,
  warnings: (row.warnings ?? []) as ReadonlyArray<string>,
  alternative: row.alternative ?? null,
});

/** Convert a Stop to StopReadModel with computed googleMapsUrl */
const toStopReadModel = (stop: Stop): StopReadModel => ({
  ...stop,
  googleMapsUrl: googleMapsUrl(stop.lat, stop.lng),
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
      .map((row) => toStopReadModel(toStop(row))),
  })),
});

const makePostgresReadModel = (db: DbClient): ReadModel => ({
  listPlanSlugs: Effect.tryPromise({
    try: async () => {
      const rows = await db.select({ slug: plans.slug, title: plans.title }).from(plans);
      return rows;
    },
    catch: (error): RepositoryError => RepositoryError.from(error),
  }),

  getPlanReadModelBySlug: (slug: string) =>
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
        return RepositoryError.from(error);
      },
    }),

  getPlanReadModelById: (id: string) =>
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
        return RepositoryError.from(error);
      },
    }),
});

export const PostgresReadModelLive = Layer.effect(
  ReadModelPort,
  Effect.gen(function* () {
    const db = yield* DbClientLive;
    return ReadModelPort.of(makePostgresReadModel(db));
  })
);