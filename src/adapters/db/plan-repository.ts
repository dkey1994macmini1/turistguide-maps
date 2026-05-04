// Postgres Plan Repository — implements PlanRepositoryPort as an Effect Layer

import { Effect, Layer } from "effect";
import { PlanRepositoryPort, type PlanRepository } from "../../core/ports/plan-repository-port";
import { RepositoryError } from "../../core/errors";
import { PlanId, Slug } from "../../core/branded";
import type { PlanCreateInput, PlanUpdateInput } from "../../core/plan";
import { plans, type PlanDAO, type PlanInsertDAO } from "@/common/db/schema";
import { eq } from "drizzle-orm";
import { DbClientLive, type DbClient } from "./client";
import { toPlan } from "./mappers";

const makePostgresPlanRepository = (db: DbClient): PlanRepository => ({
  createPlan: (input: PlanCreateInput) =>
    Effect.tryPromise({
      try: async () => {
        const id = PlanId(`plan-${crypto.randomUUID()}`);
        const slug = Slug(input.slug);
        const now = new Date();
        const insertData: PlanInsertDAO = {
          id,
          slug,
          title: input.title,
          description: input.description,
          startDate: input.startDate ?? null,
          createdAt: now,
          updatedAt: now,
        };
        const [row] = await db.insert(plans).values(insertData).returning();
        return toPlan(row);
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),

  getPlanById: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
        if (!row) throw { _tag: "NotFoundError" as const, id };
        return toPlan(row);
      },
      catch: (error): RepositoryError => {
        if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
          return error as RepositoryError;
        return RepositoryError.from(error);
      },
    }),

  getPlanBySlug: (slug: string) =>
    Effect.tryPromise({
      try: async () => {
        const [row] = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
        if (!row) throw { _tag: "NotFoundError" as const, id: slug };
        return toPlan(row);
      },
      catch: (error): RepositoryError => {
        if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
          return error as RepositoryError;
        return RepositoryError.from(error);
      },
    }),

  listPlans:
    Effect.tryPromise({
      try: async () => {
        const rows = await db.select().from(plans).orderBy(plans.createdAt);
        return rows.map(toPlan);
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),

  updatePlan: (id: string, input: PlanUpdateInput) =>
    Effect.tryPromise({
      try: async () => {
        const updateData: Partial<PlanDAO> = {
          ...(input.slug !== undefined && { slug: Slug(input.slug) }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.startDate !== undefined && { startDate: input.startDate }),
          updatedAt: new Date(),
        };
        const [row] = await db.update(plans).set(updateData).where(eq(plans.id, id)).returning();
        if (!row) throw { _tag: "NotFoundError" as const, id };
        return toPlan(row);
      },
      catch: (error): RepositoryError => {
        if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
          return error as RepositoryError;
        return RepositoryError.from(error);
      },
    }),

  deletePlan: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        await db.delete(plans).where(eq(plans.id, id));
      },
      catch: (error): RepositoryError => RepositoryError.from(error),
    }),
});

export const PostgresPlanRepositoryLive = Layer.effect(
  PlanRepositoryPort,
  Effect.gen(function* () {
    const db = yield* DbClientLive;
    return PlanRepositoryPort.of(makePostgresPlanRepository(db));
  })
);