// Plan repository — CRUD operations using Effect with tagged RepositoryError

import { Effect } from "effect";
import { eq } from "drizzle-orm";
import type { DbClient, RepositoryError } from "./client";
import { RepositoryError as RepoErr } from "./client";
import { plans, type PlanDAO, type PlanInsertDAO } from "./schema";
import type { Plan, PlanCreateInput, PlanUpdateInput } from "@/domain/plan";
import { PlanId, Slug } from "@/domain/branded";

/** Convert a DAO row to a domain Plan */
const toPlan = (row: PlanDAO): Plan => ({
  id: PlanId(row.id),
  slug: Slug(row.slug),
  title: row.title,
  description: row.description,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Create a new plan */
export const createPlan = (db: DbClient) => (input: PlanCreateInput): Effect.Effect<Plan, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const id = PlanId(`plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      const slug = Slug(input.slug);
      const now = new Date();
      const insertData: PlanInsertDAO = {
        id,
        slug,
        title: input.title,
        description: input.description,
        createdAt: now,
        updatedAt: now,
      };
      const [row] = await db.insert(plans).values(insertData).returning();
      return toPlan(row);
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });

/** Get a plan by ID */
export const getPlanById = (db: DbClient) => (id: string): Effect.Effect<Plan, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
      if (!row) throw { _tag: "NotFoundError" as const, id };
      return toPlan(row);
    },
    catch: (error): RepositoryError => {
      if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
        return error as RepositoryError;
      return RepoErr.from(error);
    },
  });

/** Get a plan by slug */
export const getPlanBySlug = (db: DbClient) => (slug: string): Effect.Effect<Plan, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const [row] = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
      if (!row) throw { _tag: "NotFoundError" as const, id: slug };
      return toPlan(row);
    },
    catch: (error): RepositoryError => {
      if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
        return error as RepositoryError;
      return RepoErr.from(error);
    },
  });

/** List all plans */
export const listPlans = (db: DbClient): Effect.Effect<Plan[], RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(plans).orderBy(plans.createdAt);
      return rows.map(toPlan);
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });

/** Update a plan */
export const updatePlan = (db: DbClient) => (id: string, input: PlanUpdateInput): Effect.Effect<Plan, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      const updateData: Partial<PlanDAO> = {
        ...(input.slug !== undefined && { slug: Slug(input.slug) }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        updatedAt: new Date(),
      };
      const [row] = await db.update(plans).set(updateData).where(eq(plans.id, id)).returning();
      if (!row) throw { _tag: "NotFoundError" as const, id };
      return toPlan(row);
    },
    catch: (error): RepositoryError => {
      if (error && typeof error === "object" && "_tag" in error && error._tag === "NotFoundError")
        return error as RepositoryError;
      return RepoErr.from(error);
    },
  });

/** Delete a plan */
export const deletePlan = (db: DbClient) => (id: string): Effect.Effect<void, RepositoryError> =>
  Effect.tryPromise({
    try: async () => {
      await db.delete(plans).where(eq(plans.id, id));
    },
    catch: (error): RepositoryError => RepoErr.from(error),
  });