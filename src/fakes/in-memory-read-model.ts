import { Effect, Layer } from "effect";
import { ReadModelPort, type ReadModel, type PlanReadModel } from "../core/ports/read-model-port";
import { PlanRepositoryPort } from "../core/ports/plan-repository-port";
import { DayRepositoryPort } from "../core/ports/day-repository-port";
import { StopRepositoryPort } from "../core/ports/stop-repository-port";
import { RepositoryError } from "../core/errors";
import type { Day } from "../core/day";
import type { Stop } from "../core/stop";

const makeInMemoryReadModel = (
  planRepo: typeof PlanRepositoryPort.Service,
  dayRepo: typeof DayRepositoryPort.Service,
  stopRepo: typeof StopRepositoryPort.Service,
): ReadModel => ({
  getPlanReadModelBySlug: (slug: string) =>
    Effect.gen(function* () {
      const plan = yield* planRepo.getPlanBySlug(slug);
      const days = yield* dayRepo.listDaysByPlanId(plan.id);
      const daysWithStops: Array<Day & { stops: Stop[] }> = yield* Effect.forEach(days, (day) =>
        Effect.gen(function* () {
          const stops = yield* stopRepo.listStopsByDayId(day.id);
          return { ...day, stops: [...stops] };
        })
      );
      return { ...plan, days: daysWithStops } as PlanReadModel;
    }),

  getPlanReadModelById: (id: string) =>
    Effect.gen(function* () {
      const plan = yield* planRepo.getPlanById(id);
      const days = yield* dayRepo.listDaysByPlanId(plan.id);
      const daysWithStops: Array<Day & { stops: Stop[] }> = yield* Effect.forEach(days, (day) =>
        Effect.gen(function* () {
          const stops = yield* stopRepo.listStopsByDayId(day.id);
          return { ...day, stops: [...stops] };
        })
      );
      return { ...plan, days: daysWithStops } as PlanReadModel;
    }),
});

export const InMemoryReadModelLive = Layer.effect(
  ReadModelPort,
  Effect.gen(function* () {
    const planRepo = yield* PlanRepositoryPort;
    const dayRepo = yield* DayRepositoryPort;
    const stopRepo = yield* StopRepositoryPort;
    return ReadModelPort.of(makeInMemoryReadModel(planRepo, dayRepo, stopRepo));
  })
);