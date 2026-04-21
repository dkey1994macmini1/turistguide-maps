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
