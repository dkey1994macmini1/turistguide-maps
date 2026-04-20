import { Context, Effect } from "effect";
import type { Plan } from "../plan";
import type { Day } from "../day";
import type { Stop } from "../stop";
import type { RepositoryError } from "../errors";

/** Computed Google Maps URL from lat/lng */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Stop with computed fields for API/MCP consumption */
export type StopReadModel = Stop & {
  readonly googleMapsUrl: string;
};

export type PlanReadModel = Plan & {
  days: Array<Day & { stops: StopReadModel[] }>;
};

export interface ReadModel {
  readonly getPlanReadModelBySlug: (slug: string) => Effect.Effect<PlanReadModel, RepositoryError>;
  readonly getPlanReadModelById: (id: string) => Effect.Effect<PlanReadModel, RepositoryError>;
  readonly listPlanSlugs: Effect.Effect<Array<{ slug: string; title: string }>, RepositoryError>;
}

export class ReadModelPort extends Context.Tag("ReadModel")<ReadModelPort, ReadModel>() {}