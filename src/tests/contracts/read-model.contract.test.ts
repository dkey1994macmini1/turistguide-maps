import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { ReadModelPort, type PlanReadModel } from "@/core/ports/read-model-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { makeInMemoryFullLayer } from "@/fakes/in-memory-read-model";

describe("ReadModel Contract", () => {
  describe("InMemory implementation", () => {
    // Fresh full layer per test — shared state between repos and read model
    const makeTestLayer = () => makeInMemoryFullLayer();

    it("should return NotFoundError for non-existent slug", async () => {
      const TestLayer = makeTestLayer();
      const exit = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const readModel = yield* ReadModelPort;
          yield* readModel.getPlanReadModelBySlug("nonexistent");
        }).pipe(Effect.provide(TestLayer))
      );
      expect(exit._tag).toBe("Failure");
    });

    it("should return a full plan read model by slug", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const readModel = yield* ReadModelPort;
          const plan = yield* planRepo.createPlan({ slug: "hawaii", title: "Hawaii", description: "Trip" });
          const day1 = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1, title: "Day 1" });
          yield* stopRepo.createStop({ dayId: day1.id, title: "Beach", description: "", lat: 21.3, lng: -157.8, sortOrder: 1 });
          return yield* readModel.getPlanReadModelBySlug("hawaii");
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.slug).toBe("hawaii");
      expect(result.days).toHaveLength(1);
      expect(result.days[0].stops).toHaveLength(1);
      expect(result.days[0].stops[0].title).toBe("Beach");
    });

    it("should return a full plan read model by ID", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const readModel = yield* ReadModelPort;
          const plan = yield* planRepo.createPlan({ slug: "oahu", title: "Oahu", description: "Island" });
          const day1 = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          return yield* readModel.getPlanReadModelById(plan.id);
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.id).toBeDefined();
      expect(result.days).toHaveLength(1);
    });

    it("should return empty days for plan with no days", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const readModel = yield* ReadModelPort;
          const plan = yield* planRepo.createPlan({ slug: "empty", title: "Empty", description: "No days" });
          return yield* readModel.getPlanReadModelBySlug("empty");
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.days).toHaveLength(0);
    });

    it("should return googleMapsUrl for each stop", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const readModel = yield* ReadModelPort;
          const plan = yield* planRepo.createPlan({ slug: "maps-test", title: "Maps", description: "" });
          const day1 = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          yield* stopRepo.createStop({ dayId: day1.id, title: "Diamond Head", description: "", lat: 21.2728, lng: -157.8081, sortOrder: 1 });
          return yield* readModel.getPlanReadModelBySlug("maps-test");
        }).pipe(Effect.provide(TestLayer))
      );
      const stop = result.days[0].stops[0];
      expect(stop.googleMapsUrl).toBe("https://www.google.com/maps/search/?api=1&query=21.2728,-157.8081");
    });

    it("should list plan slugs", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const readModel = yield* ReadModelPort;
          yield* planRepo.createPlan({ slug: "paris", title: "Paris Trip", description: "" });
          yield* planRepo.createPlan({ slug: "tokyo", title: "Tokyo Trip", description: "" });
          return yield* readModel.listPlanSlugs;
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe("paris");
      expect(result[1].slug).toBe("tokyo");
    });

    it("should omit archived plans from listed slugs", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const readModel = yield* ReadModelPort;
          yield* planRepo.createPlan({ slug: "paris", title: "Paris Trip", description: "" });
          const tokyo = yield* planRepo.createPlan({ slug: "tokyo", title: "Tokyo Trip", description: "" });
          yield* planRepo.updatePlan(tokyo.id, { archivedAt: new Date() });
          return yield* readModel.listPlanSlugs;
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.map((p) => p.slug)).toEqual(["paris"]);
    });
  });
});