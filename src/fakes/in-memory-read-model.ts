import { Effect, Layer } from "effect";
import { ReadModelPort, type ReadModel, type PlanReadModel, type StopReadModel, googleMapsUrl } from "@/core/ports/read-model-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { RepositoryError } from "@/core/errors";
import type { Day } from "@/core/day";
import type { Stop } from "@/core/stop";
import { makeInMemoryPlanRepositoryLayer } from "./in-memory-plan-repository";
import { makeInMemoryDayRepositoryLayer } from "./in-memory-day-repository";
import { makeInMemoryStopRepositoryLayer } from "./in-memory-stop-repository";

/** Convert Stop to StopReadModel with computed googleMapsUrl */
const toStopReadModel = (stop: Stop): StopReadModel => ({
  ...stop,
  googleMapsUrl: googleMapsUrl(stop.lat, stop.lng),
});

const makeInMemoryReadModel = (
  planRepo: typeof PlanRepositoryPort.Service,
  dayRepo: typeof DayRepositoryPort.Service,
  stopRepo: typeof StopRepositoryPort.Service,
): ReadModel => ({
  listPlanSlugs: Effect.gen(function* () {
    const plans = yield* planRepo.listPlans();
    return plans.map((p) => ({ slug: p.slug, title: p.title }));
  }) as Effect.Effect<Array<{ slug: string; title: string }>, RepositoryError>,

  getPlanReadModelBySlug: (slug: string) =>
    Effect.gen(function* () {
      const plan = yield* planRepo.getPlanBySlug(slug);
      const days = yield* dayRepo.listDaysByPlanId(plan.id);
      const daysWithStops: Array<Day & { stops: StopReadModel[] }> = yield* Effect.forEach(days, (day) =>
        Effect.gen(function* () {
          const stops = yield* stopRepo.listStopsByDayId(day.id);
          return { ...day, stops: stops.map(toStopReadModel) };
        })
      );
      return { ...plan, days: daysWithStops } as PlanReadModel;
    }) as Effect.Effect<PlanReadModel, RepositoryError>,

  getPlanReadModelById: (id: string) =>
    Effect.gen(function* () {
      const plan = yield* planRepo.getPlanById(id);
      const days = yield* dayRepo.listDaysByPlanId(plan.id);
      const daysWithStops: Array<Day & { stops: StopReadModel[] }> = yield* Effect.forEach(days, (day) =>
        Effect.gen(function* () {
          const stops = yield* stopRepo.listStopsByDayId(day.id);
          return { ...day, stops: stops.map(toStopReadModel) };
        })
      );
      return { ...plan, days: daysWithStops } as PlanReadModel;
    }) as Effect.Effect<PlanReadModel, RepositoryError>,
});

// Build a ReadModel layer that depends on external repo layers (shared state)
export const makeInMemoryReadModelLayer = (
  repoLayer: Layer.Layer<PlanRepositoryPort | DayRepositoryPort | StopRepositoryPort>,
) =>
  Layer.effect(
    ReadModelPort,
    Effect.gen(function* () {
      const planRepo = yield* PlanRepositoryPort;
      const dayRepo = yield* DayRepositoryPort;
      const stopRepo = yield* StopRepositoryPort;
      return ReadModelPort.of(makeInMemoryReadModel(planRepo, dayRepo, stopRepo));
    }),
  ).pipe(Layer.provide(repoLayer));

// Convenience: full in-memory layer with fresh repos
export const makeInMemoryFullLayer = () => {
  const repoLayer = Layer.merge(
    Layer.merge(makeInMemoryPlanRepositoryLayer(), makeInMemoryDayRepositoryLayer()),
    makeInMemoryStopRepositoryLayer(),
  );
  return Layer.merge(makeInMemoryReadModelLayer(repoLayer), repoLayer);
};

export const InMemoryReadModelLive = makeInMemoryReadModelLayer(
  Layer.merge(
    Layer.merge(makeInMemoryPlanRepositoryLayer(), makeInMemoryDayRepositoryLayer()),
    makeInMemoryStopRepositoryLayer(),
  ),
);