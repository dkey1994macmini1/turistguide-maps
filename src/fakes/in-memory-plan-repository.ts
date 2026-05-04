import { Effect, Layer } from "effect";
import { PlanRepositoryPort, type PlanRepository } from "@/core/ports/plan-repository-port";
import { RepositoryError } from "@/core/errors";
import { PlanId, Slug } from "@/core/branded";
import type { Plan, PlanCreateInput, PlanUpdateInput } from "@/core/plan";

const makeFakePlanRepository = (): PlanRepository => {
  const store = new Map<string, Plan>();

  return {
    createPlan: (input: PlanCreateInput) =>
      Effect.gen(function* () {
        const id = PlanId(`plan-${crypto.randomUUID()}`);
        const slug = Slug(input.slug);
        const now = new Date();
        const plan: Plan = { id, slug, title: input.title, description: input.description, startDate: input.startDate ?? null, createdAt: now, updatedAt: now };
        store.set(plan.id, plan);
        return plan;
      }) as Effect.Effect<Plan, RepositoryError>,

    getPlanById: (id: string) =>
      Effect.gen(function* () {
        const plan = store.get(id);
        if (!plan) return yield* Effect.fail(RepositoryError.notFound(id));
        return plan;
      }) as Effect.Effect<Plan, RepositoryError>,

    getPlanBySlug: (slug: string) =>
      Effect.gen(function* () {
        for (const plan of store.values()) {
          if (plan.slug === slug) return plan;
        }
        return yield* Effect.fail(RepositoryError.notFound(slug));
      }) as Effect.Effect<Plan, RepositoryError>,

    listPlans: Effect.gen(function* () {
      return Array.from(store.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }) as Effect.Effect<Plan[], RepositoryError>,

    updatePlan: (id: string, input: PlanUpdateInput) =>
      Effect.gen(function* () {
        const existing = store.get(id);
        if (!existing) return yield* Effect.fail(RepositoryError.notFound(id));
        const updated: Plan = {
          ...existing,
          ...(input.slug !== undefined && { slug: Slug(input.slug) }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.startDate !== undefined && { startDate: input.startDate }),
          updatedAt: new Date(),
        };
        store.set(id, updated);
        return updated;
      }) as Effect.Effect<Plan, RepositoryError>,

    deletePlan: (id: string) =>
      Effect.gen(function* () {
        store.delete(id);
      }) as Effect.Effect<void, RepositoryError>,
  };
};

// Factory for test isolation — creates a fresh Layer with fresh state each time
export const makeInMemoryPlanRepositoryLayer = () =>
  Layer.succeed(PlanRepositoryPort, PlanRepositoryPort.of(makeFakePlanRepository()));

// Singleton for production wiring (shared state)
export const InMemoryPlanRepositoryLive = makeInMemoryPlanRepositoryLayer();