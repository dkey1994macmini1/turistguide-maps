// Shared repository errors plus compatibility re-exports for feature validation errors.

export { type CoordinateValidationError, type UrlValidationError } from "@/features/stop/stop.errors";
export { type SlugValidationError } from "@/features/plan/plan.errors";

export type RepositoryError =
  | { readonly _tag: "RepositoryError"; readonly cause: unknown }
  | { readonly _tag: "NotFoundError"; readonly id: string };

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
