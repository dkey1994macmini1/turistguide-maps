// Database client — wraps Drizzle with Effect for connection creation
// Provides a typed DbClient that includes schema relations
// RepositoryError and NotFoundError moved to core/errors.ts

import { Effect, Context } from "effect";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DatabaseConnectionError = {
  readonly _tag: "DatabaseConnectionError";
  readonly error: unknown;
};

export const createDbClient = (databaseUrl: string) =>
  Effect.try({
    try: () => {
      const sql = postgres(databaseUrl);
      return drizzle(sql, { schema }) as DbClient;
    },
    catch: (error): DatabaseConnectionError => ({
      _tag: "DatabaseConnectionError" as const,
      error,
    }),
  });

// Typed client that includes schema relations for relational queries
export type DbClient = ReturnType<typeof drizzle<typeof schema, any>>;

// Effect Service for DB client — used in Layer wiring
export class DbClientLive extends Context.Tag("DbClient")<DbClientLive, DbClient>() {}