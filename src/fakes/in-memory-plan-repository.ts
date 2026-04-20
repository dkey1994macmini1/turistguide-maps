import { Effect, Layer } from "effect";
import { PlanRepositoryPort, type PlanRepository } from "../core/ports/plan-repository-port";
import { RepositoryError } from "../core/errors";
import { PlanId, Slug } from "../core/branded";
import type { Plan, PlanCreateInput, PlanUpdateInput } from "../core/plan";

const makeFakePlanRepository = (): PlanRepository => {
  const store = new Map<string, Plan>();

  return {
    createPlan: (input: PlanCreateInput) =>
      Effect.gen(function* () {
        const id = PlanId(`plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const slug = Slug(input.slug);
        const now = new Date();
        const plan: Plan = { id, slug, title: input.title, description: input.description, createdAt: now, updatedAt: now };
        store.set(plan.id, plan);
        return plan;
      }),

    getPlanById: (id: string) =>
      Effect.gen(function* () {
        const plan = store.get(id);
        if (!plan) yield* Effect.fail(RepositoryError.notFound(id));
        return plan!;
      }),

    getPlanBySlug: (slug: string) =>
      Effect.gen(function* () {
        let found: Plan | undefined;
        for (const plan of store.values()) {
          if (plan.slug === slug) {
            found = plan;
            break;
          }
        }
        if (!found) yield* Effect.fail(RepositoryError.notFound(slug));
        return found;
      }),

    listPlans: Effect.gen(function* () {
      return Array.from(store.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }),

    updatePlan: (id: string, input: PlanUpdateInput) =>
      Effect.gen(function* () {
        const existing = store.get(id);
        if (!existing) yield* Effect.fail(RepositoryError.notFound(id));
        const updated: Plan = {
          ...existing!,
          ...(input.slug !== undefined && { slug: Slug(input.slug) }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          updatedAt: new Date(),
        };
        store.set(id, updated);
        return updated;
      }),

    deletePlan: (id: string) =>
      Effect.gen(function* () {
        store.delete(id);
      }),
  };
};

export const InMemoryPlanRepositoryLive = Layer.succeed(
  PlanRepositoryPort,
  PlanRepositoryPort.of(makeFakePlanRepository())
);