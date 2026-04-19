// Database connection module
// Provides a Drizzle client connected to Postgres via Effect

import { Effect } from "effect";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type DatabaseConnectionError = {
  readonly _tag: "DatabaseConnectionError";
  readonly error: unknown;
};

export const createDbClient = (databaseUrl: string) =>
  Effect.try({
    try: () => {
      const sql = postgres(databaseUrl);
      return drizzle(sql);
    },
    catch: (error): DatabaseConnectionError => ({
      _tag: "DatabaseConnectionError" as const,
      error,
    }),
  });

export type DbClient = Effect.Effect.Success<ReturnType<typeof createDbClient>>;