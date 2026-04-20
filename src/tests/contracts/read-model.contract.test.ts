import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { ReadModelPort, type PlanReadModel } from "@/core/ports/read-model-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { InMemoryReadModelLive } from "@/fakes/in-memory-read-model";
import { InMemoryPlanRepositoryLive } from "@/fakes/in-memory-plan-repository";
import { InMemoryDayRepositoryLive } from "@/fakes/in-memory-day-repository";
import { InMemoryStopRepositoryLive } from "@/fakes/in-memory-stop-repository";

const TestLayer = Layer.merge(
  Layer.merge(
    Layer.merge(InMemoryPlanRepositoryLive, InMemoryDayRepositoryLive),
    InMemoryStopRepositoryLive
  ),
  InMemoryReadModelLive
);

type Repos = ReadModelPort | PlanRepositoryPort | DayRepositoryPort | StopRepositoryPort;

const runWithFakes = <A, E>(effect: Effect.Effect<A, E, Repos>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)));

describe("ReadModel Contract", () => {
  describe("InMemory implementation", () => {
    it("should return a full plan read model by slug", async () => {
      const result = await runWithFakes(
        Effect.gen(function* () {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const readModel = yield* ReadModelPort;
          const plan = yield* planRepo.createPlan({ slug: "oahu", title: "Oahu Trip", description: "Hawaii" });
          const day1 = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1, title: "Day 1" });
          yield* stopRepo.createStop({ dayId: day1.id, title: "Beach", description: "Nice", lat: 21.3, lng: -157.8, sortOrder: 1 });
          return yield* readModel.getPlanReadModelBySlug("oahu");
        })
      );
      expect(result.slug).toBe("oahu");
      expect(result.days).toHaveLength(1);
      expect(result.days[0].stops).toHaveLength(1);
      expect(result.days[0].stops[0].title).toBe("Beach");
    });

    it("should return a full plan read model by ID", async () => {
      const result = await runWithFakes(
        Effect.gen(function* () {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const readModel = yield* ReadModelPort;
          const plan = yield* planRepo.createPlan({ slug: "maui", title: "Maui Trip", description: "Maui" });
          const day1 = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          yield* stopRepo.createStop({ dayId: day1.id, title: "Haleakala", description: "Volcano", lat: 20.7, lng: -156.3, sortOrder: 1 });
          return yield* readModel.getPlanReadModelById(plan.id);
        })
      );
      expect(result.title).toBe("Maui Trip");
      expect(result.days).toHaveLength(1);
      expect(result.days[0].stops[0].title).toBe("Haleakala");
    });

    it("should return NotFoundError for non-existent slug", async () => {
      const exit = await Effect.runPromiseExit(
        runWithFakes(
          Effect.gen(function* () {
            const readModel = yield* ReadModelPort;
            yield* readModel.getPlanReadModelBySlug("nonexistent");
          })
        )
      );
      expect(exit._tag).toBe("Failure");
    });

    it("should return empty days for plan with no days", async () => {
      const result = await runWithFakes(
        Effect.gen(function* () {
          const planRepo = yield* PlanRepositoryPort;
          const readModel = yield* ReadModelPort;
          const plan = yield* planRepo.createPlan({ slug: "empty", title: "Empty", description: "" });
          return yield* readModel.getPlanReadModelById(plan.id);
        })
      );
      expect(result.days).toHaveLength(0);
    });
  });
});