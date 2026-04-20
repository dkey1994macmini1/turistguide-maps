// Domain error types — Effect tagged errors for machine-readable error handling

export type CoordinateValidationError = {
  readonly _tag: "CoordinateValidationError";
  readonly field: "lat" | "lng";
  readonly value: number;
  readonly message: string;
};

export type UrlValidationError = {
  readonly _tag: "UrlValidationError";
  readonly url: string;
  readonly message: string;
};

export type SlugValidationError = {
  readonly _tag: "SlugValidationError";
  readonly slug: string;
  readonly message: string;
};

// Repository error types — for data access layer
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