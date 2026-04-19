// Database connection module
// Re-exports from the adapters/db module for backward compatibility

export { createDbClient, type DbClient, type DatabaseConnectionError } from "../../adapters/db/client";
export { RepositoryError } from "../../adapters/db/client";
export type { RepositoryError as RepositoryErrorType } from "../../adapters/db/client";