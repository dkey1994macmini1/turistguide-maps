// Composition Root — wires all layers for the application
// Single PostgreSQL layer (no dev/prod split)

import { Layer, Effect } from "effect";
import { DbClientLive, createDbClient } from "@/adapters/db/client";
import { PostgresPlanRepositoryLive } from "@/adapters/db/plan-repository";
import { PostgresDayRepositoryLive } from "@/adapters/db/day-repository";
import { PostgresStopRepositoryLive } from "@/adapters/db/stop-repository";
import { PostgresReadModelLive } from "@/adapters/db/read-model";

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

// Postgres implementations
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

export const AppLayer = RepoLayer.pipe(Layer.provide(DbClientLayer));