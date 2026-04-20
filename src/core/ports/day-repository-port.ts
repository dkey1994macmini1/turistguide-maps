import { Context, Effect } from "effect";
import type { Day, DayCreateInput, DayUpdateInput } from "../day";
import type { RepositoryError } from "../errors";

export interface DayRepository {
  readonly createDay: (input: DayCreateInput) => Effect.Effect<Day, RepositoryError>;
  readonly getDayById: (id: string) => Effect.Effect<Day, RepositoryError>;
  readonly listDaysByPlanId: (planId: string) => Effect.Effect<Day[], RepositoryError>;
  readonly updateDay: (id: string, input: DayUpdateInput) => Effect.Effect<Day, RepositoryError>;
  readonly deleteDay: (id: string) => Effect.Effect<void, RepositoryError>;
  readonly reorderDays: (items: Array<{ id: string; dayNumber: number }>) => Effect.Effect<void, RepositoryError>;
}

export class DayRepositoryPort extends Context.Tag("DayRepository")<DayRepositoryPort, DayRepository>() {}