// Database client — wraps Drizzle with Effect for connection creation
// Provides a typed DbClient that includes schema relations

import { Effect } from "effect";
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

// Repository error type — tagged for Effect pattern matching
export type RepositoryError =
  | { _tag: "RepositoryError"; cause: unknown }
  | { _tag: "NotFoundError"; id: string };

export const RepositoryError = {
  from: (cause: unknown): RepositoryError => ({
    _tag: "RepositoryError" as const,
    cause,
  }),
  notFound: (id: string): RepositoryError => ({
    _tag: "NotFoundError" as const,
    id,
  }),
};