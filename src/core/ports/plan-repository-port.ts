import { Context, Effect } from "effect";
import type { Plan, PlanCreateInput, PlanUpdateInput } from "../plan";
import type { RepositoryError } from "../errors";

export interface PlanRepository {
  readonly createPlan: (input: PlanCreateInput) => Effect.Effect<Plan, RepositoryError>;
  readonly getPlanById: (id: string) => Effect.Effect<Plan, RepositoryError>;
  readonly getPlanBySlug: (slug: string) => Effect.Effect<Plan, RepositoryError>;
  readonly listPlans: Effect.Effect<Plan[], RepositoryError>;
  readonly updatePlan: (id: string, input: PlanUpdateInput) => Effect.Effect<Plan, RepositoryError>;
  readonly deletePlan: (id: string) => Effect.Effect<void, RepositoryError>;
}

export class PlanRepositoryPort extends Context.Tag("PlanRepository")<PlanRepositoryPort, PlanRepository>() {}