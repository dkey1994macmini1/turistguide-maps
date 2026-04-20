import { Context, Effect } from "effect";
import type { Plan } from "../plan";
import type { Day } from "../day";
import type { Stop } from "../stop";
import type { RepositoryError } from "../errors";

export type PlanReadModel = Plan & {
  days: Array<Day & { stops: Stop[] }>;
};

export interface ReadModel {
  readonly getPlanReadModelBySlug: (slug: string) => Effect.Effect<PlanReadModel, RepositoryError>;
  readonly getPlanReadModelById: (id: string) => Effect.Effect<PlanReadModel, RepositoryError>;
}

export class ReadModelPort extends Context.Tag("ReadModel")<ReadModelPort, ReadModel>() {}