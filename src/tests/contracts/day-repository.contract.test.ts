import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { makeInMemoryDayRepositoryLayer } from "@/fakes/in-memory-day-repository";
import { makeInMemoryPlanRepositoryLayer } from "@/fakes/in-memory-plan-repository";
import { RepositoryError } from "@/core/errors";

describe("DayRepository Contract", () => {
  describe("InMemory implementation", () => {
    // Fresh layers per test for isolation
    const makeTestLayer = () =>
      Layer.merge(makeInMemoryPlanRepositoryLayer(), makeInMemoryDayRepositoryLayer());

    it("should create a day and retrieve it by ID", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const plan = yield* planRepo.createPlan({
            slug: "test-trip",
            title: "Test Trip",
            description: "A test",
          });
          const day = yield* dayRepo.createDay({
            planId: plan.id,
            dayNumber: 1,
            title: "Day 1",
          });
          const found = yield* dayRepo.getDayById(day.id);
          return { day, found };
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.found.id).toBe(result.day.id);
      expect(result.found.dayNumber).toBe(1);
    });

    it("should list days for a plan", async () => {
      const TestLayer = makeTestLayer();
      const days = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const plan = yield* planRepo.createPlan({
            slug: "multi-day",
            title: "Multi Day",
            description: "Multi",
          });
          yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          yield* dayRepo.createDay({ planId: plan.id, dayNumber: 2 });
          return yield* dayRepo.listDaysByPlanId(plan.id);
        }).pipe(Effect.provide(TestLayer))
      );
      expect(days).toHaveLength(2);
      expect(days[0].dayNumber).toBe(1);
      expect(days[1].dayNumber).toBe(2);
    });

    it("should return NotFoundError for non-existent day", async () => {
      const TestLayer = makeTestLayer();
      const exit = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const repo = yield* DayRepositoryPort;
          yield* repo.getDayById("nonexistent");
        }).pipe(Effect.provide(TestLayer))
      );
      expect(exit._tag).toBe("Failure");
    });

    it("should update a day", async () => {
      const TestLayer = makeTestLayer();
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const plan = yield* planRepo.createPlan({ slug: "update-day", title: "Update", description: "" });
          const day = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1, title: "Old Title" });
          const updated = yield* dayRepo.updateDay(day.id, { title: "New Title" });
          return { day, updated };
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.updated.title).toBe("New Title");
    });

    it("should delete a day", async () => {
      const TestLayer = makeTestLayer();
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const plan = yield* planRepo.createPlan({ slug: "del-day", title: "Del", description: "" });
          const day = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          yield* dayRepo.deleteDay(day.id);
          const days = yield* dayRepo.listDaysByPlanId(plan.id);
          expect(days).toHaveLength(0);
        }).pipe(Effect.provide(TestLayer))
      );
    });

    it("should reorder days", async () => {
      const TestLayer = makeTestLayer();
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const plan = yield* planRepo.createPlan({ slug: "reorder-days", title: "Reorder", description: "" });
          const day1 = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 1 });
          const day2 = yield* dayRepo.createDay({ planId: plan.id, dayNumber: 2 });
          yield* dayRepo.reorderDays([
            { id: day1.id, dayNumber: 2 },
            { id: day2.id, dayNumber: 1 },
          ]);
          const d1 = yield* dayRepo.getDayById(day1.id);
          const d2 = yield* dayRepo.getDayById(day2.id);
          expect(d1.dayNumber).toBe(2);
          expect(d2.dayNumber).toBe(1);
        }).pipe(Effect.provide(TestLayer))
      );
    });
  });
});