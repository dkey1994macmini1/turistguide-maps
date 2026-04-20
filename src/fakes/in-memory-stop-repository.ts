import { Effect, Layer } from "effect";
import { StopRepositoryPort, type StopRepository } from "@/core/ports/stop-repository-port";
import { RepositoryError } from "@/core/errors";
import { StopId, DayId } from "@/core/branded";
import type { Stop, StopCreateInput, StopUpdateInput } from "@/core/stop";

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
          links: input.links ?? [],
        };
        store.set(stop.id, stop);
        return stop;
      }) as Effect.Effect<Stop, RepositoryError>,

    getStopById: (id: string) =>
      Effect.gen(function* () {
        const stop = store.get(id);
        if (!stop) return yield* Effect.fail(RepositoryError.notFound(id));
        return stop;
      }) as Effect.Effect<Stop, RepositoryError>,

    listStopsByDayId: (dayId: string) =>
      Effect.gen(function* () {
        return Array.from(store.values()).filter((s) => s.dayId === dayId).sort((a, b) => a.sortOrder - b.sortOrder);
      }) as Effect.Effect<Stop[], RepositoryError>,

    updateStop: (id: string, input: StopUpdateInput) =>
      Effect.gen(function* () {
        const existing = store.get(id);
        if (!existing) return yield* Effect.fail(RepositoryError.notFound(id));
        const updated: Stop = {
          ...existing,
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.lat !== undefined && { lat: input.lat }),
          ...(input.lng !== undefined && { lng: input.lng }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
          ...(input.links !== undefined && { links: input.links }),
        };
        store.set(id, updated);
        return updated;
      }) as Effect.Effect<Stop, RepositoryError>,

    deleteStop: (id: string) =>
      Effect.gen(function* () {
        store.delete(id);
      }) as Effect.Effect<void, RepositoryError>,

    reorderStops: (items: Array<{ id: string; sortOrder: number }>) =>
      Effect.gen(function* () {
        for (const item of items) {
          const existing = store.get(item.id);
          if (existing) {
            store.set(item.id, { ...existing, sortOrder: item.sortOrder });
          }
        }
      }) as Effect.Effect<void, RepositoryError>,
  };
};

// Factory for test isolation
export const makeInMemoryStopRepositoryLayer = () =>
  Layer.succeed(StopRepositoryPort, StopRepositoryPort.of(makeFakeStopRepository()));

export const InMemoryStopRepositoryLive = makeInMemoryStopRepositoryLayer();