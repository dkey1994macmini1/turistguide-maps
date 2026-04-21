import { Effect, Layer } from "effect";
import { DayRepositoryPort, type DayRepository } from "@/core/ports/day-repository-port";
import { RepositoryError } from "@/core/errors";
import { DayId, PlanId } from "@/core/branded";
import type { Day, DayCreateInput, DayUpdateInput } from "@/core/day";

const makeFakeDayRepository = (): DayRepository => {
  const store = new Map<string, Day>();

  return {
    createDay: (input: DayCreateInput) =>
      Effect.gen(function* () {
        const id = DayId(`day-${crypto.randomUUID()}`);
        const day: Day = {
          id,
          planId: PlanId(input.planId),
          dayNumber: input.dayNumber,
          title: input.title ?? null,
          description: input.description ?? null,
        };
        store.set(day.id, day);
        return day;
      }) as Effect.Effect<Day, RepositoryError>,

    getDayById: (id: string) =>
      Effect.gen(function* () {
        const day = store.get(id);
        if (!day) return yield* Effect.fail(RepositoryError.notFound(id));
        return day;
      }) as Effect.Effect<Day, RepositoryError>,

    listDaysByPlanId: (planId: string) =>
      Effect.gen(function* () {
        return Array.from(store.values()).filter((d) => d.planId === planId).sort((a, b) => a.dayNumber - b.dayNumber);
      }) as Effect.Effect<Day[], RepositoryError>,

    updateDay: (id: string, input: DayUpdateInput) =>
      Effect.gen(function* () {
        const existing = store.get(id);
        if (!existing) return yield* Effect.fail(RepositoryError.notFound(id));
        const updated: Day = {
          ...existing,
          ...(input.dayNumber !== undefined && { dayNumber: input.dayNumber }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
        };
        store.set(id, updated);
        return updated;
      }) as Effect.Effect<Day, RepositoryError>,

    deleteDay: (id: string) =>
      Effect.gen(function* () {
        store.delete(id);
      }) as Effect.Effect<void, RepositoryError>,

    reorderDays: (items: Array<{ id: string; dayNumber: number }>) =>
      Effect.gen(function* () {
        for (const item of items) {
          const existing = store.get(item.id);
          if (existing) {
            store.set(item.id, { ...existing, dayNumber: item.dayNumber });
          }
        }
      }) as Effect.Effect<void, RepositoryError>,
  };
};

// Factory for test isolation
export const makeInMemoryDayRepositoryLayer = () =>
  Layer.succeed(DayRepositoryPort, DayRepositoryPort.of(makeFakeDayRepository()));

export const InMemoryDayRepositoryLive = makeInMemoryDayRepositoryLayer();