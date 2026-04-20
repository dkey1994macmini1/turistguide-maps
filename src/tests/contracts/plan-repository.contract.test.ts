import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { InMemoryPlanRepositoryLive } from "@/fakes/in-memory-plan-repository";
import { RepositoryError } from "@/core/errors";

// Helper to run an Effect with the in-memory plan repository
const runWithFakes = <A, E>(effect: Effect.Effect<A, E, PlanRepositoryPort>) =>
  Effect.runPromise(effect.pipe(Effect.provide(InMemoryPlanRepositoryLive)));

describe("PlanRepository Contract", () => {
  describe("InMemory implementation", () => {
    it("should create a plan and retrieve it by ID", async () => {
      const result = await runWithFakes(
        Effect.gen(function* () {
          const repo = yield* PlanRepositoryPort;
          const created = yield* repo.createPlan({
            slug: "test-trip",
            title: "Test Trip",
            description: "A test trip",
          });
          const found = yield* repo.getPlanById(created.id);
          return { created, found };
        })
      );
      expect(result.found.id).toBe(result.created.id);
      expect(result.found.slug).toBe("test-trip");
      expect(result.found.title).toBe("Test Trip");
    });

    it("should create a plan and retrieve it by slug", async () => {
      const result = await runWithFakes(
        Effect.gen(function* () {
          const repo = yield* PlanRepositoryPort;
          const created = yield* repo.createPlan({
            slug: "oahu-adventure",
            title: "Oahu Adventure",
            description: "Hawaii trip",
          });
          const found = yield* repo.getPlanBySlug("oahu-adventure");
          return { created, found };
        })
      );
      expect(result.found.id).toBe(result.created.id);
    });

    it("should return NotFoundError for non-existent plan by ID", async () => {
      const exit = await Effect.runPromiseExit(
        runWithFakes(
          Effect.gen(function* () {
            const repo = yield* PlanRepositoryPort;
            yield* repo.getPlanById("nonexistent");
          })
        )
      );
      expect(exit._tag).toBe("Failure");
    });

    it("should return NotFoundError for non-existent plan by slug", async () => {
      const exit = await Effect.runPromiseExit(
        runWithFakes(
          Effect.gen(function* () {
            const repo = yield* PlanRepositoryPort;
            yield* repo.getPlanBySlug("nonexistent");
          })
        )
      );
      expect(exit._tag).toBe("Failure");
    });

    it("should list all plans", async () => {
      const plans = await runWithFakes(
        Effect.gen(function* () {
          const repo = yield* PlanRepositoryPort;
          yield* repo.createPlan({ slug: "trip-1", title: "Trip 1", description: "First" });
          yield* repo.createPlan({ slug: "trip-2", title: "Trip 2", description: "Second" });
          return yield* repo.listPlans;
        })
      );
      expect(plans).toHaveLength(2);
      expect(plans.map((p) => p.slug)).toContain("trip-1");
      expect(plans.map((p) => p.slug)).toContain("trip-2");
    });

    it("should update a plan", async () => {
      const result = await runWithFakes(
        Effect.gen(function* () {
          const repo = yield* PlanRepositoryPort;
          const created = yield* repo.createPlan({
            slug: "original",
            title: "Original Title",
            description: "Original desc",
          });
          const updated = yield* repo.updatePlan(created.id, {
            title: "Updated Title",
          });
          return { created, updated };
        })
      );
      expect(result.updated.title).toBe("Updated Title");
      expect(result.updated.slug).toBe("original");
    });

    it("should delete a plan", async () => {
      await runWithFakes(
        Effect.gen(function* () {
          const repo = yield* PlanRepositoryPort;
          const created = yield* repo.createPlan({
            slug: "to-delete",
            title: "Delete Me",
            description: "Bye",
          });
          yield* repo.deletePlan(created.id);
          const plans = yield* repo.listPlans;
          expect(plans.find((p) => p.id === created.id)).toBeUndefined();
        })
      );
    });
  });
});