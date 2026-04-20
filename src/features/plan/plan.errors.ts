// Plan validation errors

export type SlugValidationError = {
  readonly _tag: "SlugValidationError";
  readonly slug: string;
  readonly message: string;
};
