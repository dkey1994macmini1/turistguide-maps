import { Effect, Layer } from "effect";
import { StopRepositoryPort, type StopRepository } from "../core/ports/stop-repository-port";
import { RepositoryError } from "../core/errors";
import { StopId, DayId } from "../core/branded";
import type { Stop, StopCreateInput, StopUpdateInput } from "../core/stop";
import type { StopLink } from "../core/stop-link";

const makeFakeStopRepository = (): StopRepository => {
  const store = new Map<string, Stop>();

  return {
    createStop: (input: StopCreateInput) =>
      Effect.gen(function* () {
        const id = StopId(`stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const stop: Stop = {
          id,
          dayId: DayId(input.dayId),
          title: input.title,
          description: input.description,
          lat: input.lat,
          lng: input.lng,
          sortOrder: input.sortOrder,
          links: (input.links ?? []) as ReadonlyArray<StopLink>,
        };
        store.set(stop.id, stop);
        return stop;
      }),

    getStopById: (id: string) =>
      Effect.gen(function* () {
        const stop = store.get(id);
        if (!stop) yield* Effect.fail(RepositoryError.notFound(id));
        return stop!;
      }),

    listStopsByDayId: (dayId: string) =>
      Effect.gen(function* () {
        return Array.from(store.values())
          .filter((s) => s.dayId === DayId(dayId))
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }),

    updateStop: (id: string, input: StopUpdateInput) =>
      Effect.gen(function* () {
        const existing = store.get(id);
        if (!existing) yield* Effect.fail(RepositoryError.notFound(id));
        const updated: Stop = {
          ...existing!,
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.lat !== undefined && { lat: input.lat }),
          ...(input.lng !== undefined && { lng: input.lng }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
          ...(input.links !== undefined && { links: input.links as ReadonlyArray<StopLink> }),
        };
        store.set(id, updated);
        return updated;
      }),

    deleteStop: (id: string) =>
      Effect.gen(function* () {
        store.delete(id);
      }),

    reorderStops: (items: Array<{ id: string; sortOrder: number }>) =>
      Effect.gen(function* () {
        for (const item of items) {
          const existing = store.get(item.id);
          if (existing) {
            store.set(item.id, { ...existing, sortOrder: item.sortOrder });
          }
        }
      }),
  };
};

export const InMemoryStopRepositoryLive = Layer.succeed(
  StopRepositoryPort,
  StopRepositoryPort.of(makeFakeStopRepository())
);