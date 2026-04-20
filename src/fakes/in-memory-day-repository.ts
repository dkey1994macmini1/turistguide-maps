import { Effect, Layer } from "effect";
import { DayRepositoryPort, type DayRepository } from "../core/ports/day-repository-port";
import { RepositoryError } from "../core/errors";
import { DayId, PlanId } from "../core/branded";
import type { Day, DayCreateInput, DayUpdateInput } from "../core/day";

const makeFakeDayRepository = (): DayRepository => {
  const store = new Map<string, Day>();

  return {
    createDay: (input: DayCreateInput) =>
      Effect.gen(function* () {
        const id = DayId(`day-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const day: Day = {
          id,
          planId: PlanId(input.planId),
          dayNumber: input.dayNumber,
          title: input.title ?? null,
          description: input.description ?? null,
        };
        store.set(day.id, day);
        return day;
      }),

    getDayById: (id: string) =>
      Effect.gen(function* () {
        const day = store.get(id);
        if (!day) yield* Effect.fail(RepositoryError.notFound(id));
        return day!;
      }),

    listDaysByPlanId: (planId: string) =>
      Effect.gen(function* () {
        return Array.from(store.values())
          .filter((d) => d.planId === PlanId(planId))
          .sort((a, b) => a.dayNumber - b.dayNumber);
      }),

    updateDay: (id: string, input: DayUpdateInput) =>
      Effect.gen(function* () {
        const existing = store.get(id);
        if (!existing) yield* Effect.fail(RepositoryError.notFound(id));
        const updated: Day = {
          ...existing!,
          ...(input.dayNumber !== undefined && { dayNumber: input.dayNumber }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
        };
        store.set(id, updated);
        return updated;
      }),

    deleteDay: (id: string) =>
      Effect.gen(function* () {
        store.delete(id);
      }),

    reorderDays: (items: Array<{ id: string; dayNumber: number }>) =>
      Effect.gen(function* () {
        for (const item of items) {
          const existing = store.get(item.id);
          if (existing) {
            store.set(item.id, { ...existing, dayNumber: item.dayNumber });
          }
        }
      }),
  };
};

export const InMemoryDayRepositoryLive = Layer.succeed(
  DayRepositoryPort,
  DayRepositoryPort.of(makeFakeDayRepository())
);