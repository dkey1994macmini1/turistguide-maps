import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { makeInMemoryStopRepositoryLayer } from "@/fakes/in-memory-stop-repository";
import { makeInMemoryDayRepositoryLayer } from "@/fakes/in-memory-day-repository";
import { makeInMemoryPlanRepositoryLayer } from "@/fakes/in-memory-plan-repository";

describe("StopRepository Contract", () => {
  describe("InMemory implementation", () => {
    const makeTestLayer = () =>
      Layer.merge(
        Layer.merge(makeInMemoryPlanRepositoryLayer(), makeInMemoryDayRepositoryLayer()),
        makeInMemoryStopRepositoryLayer()
      );

    it("should create a stop and retrieve it by ID", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const plan = yield* planRepo.createPlan({ slug: "stop-test", title: "Test", description: "" });
          const day = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          const stop = yield* stopRepo.createStop({
            dayId: day.id,
            title: "Test Stop",
            description: "A stop",
            lat: 21.3,
            lng: -157.8,
            sortOrder: 1,
          });
          const found = yield* stopRepo.getStopById(stop.id);
          return { stop, found };
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.found.id).toBe(result.stop.id);
      expect(result.found.title).toBe("Test Stop");
    });

    it("should list stops for a day", async () => {
      const TestLayer = makeTestLayer();
      const stops = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const plan = yield* planRepo.createPlan({ slug: "stop-list", title: "List", description: "" });
          const day = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          yield* stopRepo.createStop({ dayId: day.id, title: "Stop 1", description: "", lat: 0, lng: 0, sortOrder: 1 });
          yield* stopRepo.createStop({ dayId: day.id, title: "Stop 2", description: "", lat: 0, lng: 0, sortOrder: 2 });
          return yield* stopRepo.listStopsByDayId(day.id);
        }).pipe(Effect.provide(TestLayer))
      );
      expect(stops).toHaveLength(2);
      expect(stops[0].sortOrder).toBe(1);
    });

    it("should return NotFoundError for non-existent stop", async () => {
      const TestLayer = makeTestLayer();
      const exit = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const repo = yield* StopRepositoryPort;
          yield* repo.getStopById("nonexistent");
        }).pipe(Effect.provide(TestLayer))
      );
      expect(exit._tag).toBe("Failure");
    });

    it("should update a stop including links", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const plan = yield* planRepo.createPlan({ slug: "stop-upd", title: "Upd", description: "" });
          const day = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          const stop = yield* stopRepo.createStop({ dayId: day.id, title: "Old Title", description: "", lat: 0, lng: 0, sortOrder: 1 });
          const updated = yield* stopRepo.updateStop(stop.id, {
            title: "New Title",
            links: [{ label: "Website", url: "https://example.com" }],
          });
          return { stop, updated };
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.updated.title).toBe("New Title");
      expect(result.updated.links).toHaveLength(1);
    });

    it("should delete a stop", async () => {
      const TestLayer = makeTestLayer();
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const plan = yield* planRepo.createPlan({ slug: "stop-del", title: "Del", description: "" });
          const day = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          const stop = yield* stopRepo.createStop({ dayId: day.id, title: "Del", description: "", lat: 0, lng: 0, sortOrder: 1 });
          yield* stopRepo.deleteStop(stop.id);
          const stops = yield* stopRepo.listStopsByDayId(day.id);
          expect(stops).toHaveLength(0);
        }).pipe(Effect.provide(TestLayer))
      );
    });

    it("should reorder stops", async () => {
      const TestLayer = makeTestLayer();
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;
          const plan = yield* planRepo.createPlan({ slug: "stop-reorder", title: "Reorder", description: "" });
          const day = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          const s1 = yield* stopRepo.createStop({ dayId: day.id, title: "A", description: "", lat: 0, lng: 0, sortOrder: 1 });
          const s2 = yield* stopRepo.createStop({ dayId: day.id, title: "B", description: "", lat: 0, lng: 0, sortOrder: 2 });
          yield* stopRepo.reorderStops([
            { id: s1.id, sortOrder: 2 },
            { id: s2.id, sortOrder: 1 },
          ]);
          const found1 = yield* stopRepo.getStopById(s1.id);
          const found2 = yield* stopRepo.getStopById(s2.id);
          expect(found1.sortOrder).toBe(2);
          expect(found2.sortOrder).toBe(1);
        }).pipe(Effect.provide(TestLayer))
      );
    });
  });
});