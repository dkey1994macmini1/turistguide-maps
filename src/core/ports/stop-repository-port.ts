import { Context, Effect } from "effect";
import type { Stop, StopCreateInput, StopUpdateInput } from "../stop";
import type { RepositoryError } from "../errors";

export interface StopRepository {
  readonly createStop: (input: StopCreateInput) => Effect.Effect<Stop, RepositoryError>;
  readonly getStopById: (id: string) => Effect.Effect<Stop, RepositoryError>;
  readonly listStopsByDayId: (dayId: string) => Effect.Effect<Stop[], RepositoryError>;
  readonly updateStop: (id: string, input: StopUpdateInput) => Effect.Effect<Stop, RepositoryError>;
  readonly deleteStop: (id: string) => Effect.Effect<void, RepositoryError>;
  readonly reorderStops: (items: Array<{ id: string; sortOrder: number }>) => Effect.Effect<void, RepositoryError>;
}

export class StopRepositoryPort extends Context.Tag("StopRepository")<StopRepositoryPort, StopRepository>() {}