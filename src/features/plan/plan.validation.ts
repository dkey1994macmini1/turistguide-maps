import { Effect, Either } from "effect";
import type { SlugValidationError } from "./plan.errors";
import type { Slug } from "@/core/branded";
import { Slug as SlugBrand } from "@/core/branded";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const validateSlug = (slug: string): Effect.Effect<Slug, SlugValidationError> => {
  if (slug.length === 0) {
    return Effect.fail({
      _tag: "SlugValidationError" as const,
      slug,
      message: "Slug must not be empty",
    });
  }

  if (slug.length > 100) {
    return Effect.fail({
      _tag: "SlugValidationError" as const,
      slug,
      message: `Slug must be at most 100 characters, got ${slug.length}`,
    });
  }

  if (!SLUG_PATTERN.test(slug)) {
    return Effect.fail({
      _tag: "SlugValidationError" as const,
      slug,
      message: `Slug must be lowercase alphanumeric with hyphens (e.g. "my-trip"), got "${slug}"`,
    });
  }

  return Effect.succeed(SlugBrand(slug));
};

export const validateSlugEither = (slug: string): Either.Either<Slug, SlugValidationError> =>
  Effect.runSync(Effect.either(validateSlug(slug)));
