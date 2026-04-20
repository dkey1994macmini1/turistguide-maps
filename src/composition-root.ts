// Composition Root — wires all layers for the application
// Production: Postgres layers, Development: In-memory layers

import { Layer, Effect } from "effect";
import { DbClientLive, createDbClient } from "@/adapters/db/client";
import { PostgresPlanRepositoryLive } from "@/adapters/db/plan-repository";
import { PostgresDayRepositoryLive } from "@/adapters/db/day-repository";
import { PostgresStopRepositoryLive } from "@/adapters/db/stop-repository";
import { PostgresReadModelLive } from "@/adapters/db/read-model";
import { makeInMemoryFullLayer } from "@/fakes/in-memory-read-model";

// Create the DB client layer from DATABASE_URL
const DbClientLayer = Layer.effect(
  DbClientLive,
  Effect.gen(function* () {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const client = yield* createDbClient(url);
    return client;
  })
);

// Production layer: Postgres implementations
const RepoLayer = Layer.merge(
  Layer.merge(
    PostgresPlanRepositoryLive,
    PostgresDayRepositoryLive,
  ),
  Layer.merge(
    PostgresStopRepositoryLive,
    PostgresReadModelLive,
  ),
);

export const ProductionLayer = RepoLayer.pipe(Layer.provide(DbClientLayer));

// Development layer: In-memory implementations (no DB needed)
export const DevelopmentLayer = makeInMemoryFullLayer();