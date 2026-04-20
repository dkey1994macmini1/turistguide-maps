// Domain validation functions
// All validation returns Effect<Either> patterns with tagged errors

import { Effect, Either } from "effect";
import type {
  CoordinateValidationError,
  UrlValidationError,
  SlugValidationError,
} from "./errors";
import type { Slug } from "./branded";
import { Slug as SlugBrand } from "./branded";

// --- Coordinate Validation ---

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

/**
 * Validate a latitude value. Returns Effect that fails with CoordinateValidationError
 * if the value is outside [-90, 90] or is not a finite number.
 */
export const validateLatitude = (lat: number): Effect.Effect<number, CoordinateValidationError> => {
  if (!Number.isFinite(lat)) {
    return Effect.fail({
      _tag: "CoordinateValidationError" as const,
      field: "lat" as const,
      value: lat,
      message: `Latitude must be a finite number, got ${lat}`,
    });
  }
  if (lat < LAT_MIN || lat > LAT_MAX) {
    return Effect.fail({
      _tag: "CoordinateValidationError" as const,
      field: "lat" as const,
      value: lat,
      message: `Latitude must be between ${LAT_MIN} and ${LAT_MAX}, got ${lat}`,
    });
  }
  return Effect.succeed(lat);
};

/**
 * Validate a longitude value. Returns Effect that fails with CoordinateValidationError
 * if the value is outside [-180, 180] or is not a finite number.
 */
export const validateLongitude = (lng: number): Effect.Effect<number, CoordinateValidationError> => {
  if (!Number.isFinite(lng)) {
    return Effect.fail({
      _tag: "CoordinateValidationError" as const,
      field: "lng" as const,
      value: lng,
      message: `Longitude must be a finite number, got ${lng}`,
    });
  }
  if (lng < LNG_MIN || lng > LNG_MAX) {
    return Effect.fail({
      _tag: "CoordinateValidationError" as const,
      field: "lng" as const,
      value: lng,
      message: `Longitude must be between ${LNG_MIN} and ${LNG_MAX}, got ${lng}`,
    });
  }
  return Effect.succeed(lng);
};

/**
 * Validate both latitude and longitude together.
 */
export const validateCoordinates = (
  lat: number,
  lng: number,
): Effect.Effect<{ lat: number; lng: number }, CoordinateValidationError> =>
  Effect.gen(function* (_) {
    const validLat = yield* _(validateLatitude(lat));
    const validLng = yield* _(validateLongitude(lng));
    return { lat: validLat, lng: validLng };
  });

// --- URL Validation ---

const URL_PATTERN = /^https?:\/\/.+/;

/**
 * Validate a URL string. Returns Effect that fails with UrlValidationError
 * if the URL is not a valid http/https URL.
 */
export const validateUrl = (url: string): Effect.Effect<string, UrlValidationError> => {
  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return Effect.fail({
      _tag: "UrlValidationError" as const,
      url,
      message: "URL must not be empty",
    });
  }

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Effect.fail({
        _tag: "UrlValidationError" as const,
        url,
        message: `URL must use http or https protocol, got ${parsed.protocol}`,
      });
    }
    return Effect.succeed(trimmed);
  } catch {
    return Effect.fail({
      _tag: "UrlValidationError" as const,
      url,
      message: `Invalid URL format: ${url}`,
    });
  }
};

// --- Slug Validation ---

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validate and brand a slug string. Returns Effect that fails with SlugValidationError
 * if the slug doesn't match the pattern: lowercase alphanumeric with hyphens.
 */
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

// --- Either helpers for synchronous validation ---

/**
 * Validate latitude returning Either instead of Effect.
 * Useful in test assertions and synchronous contexts.
 */
export const validateLatitudeEither = (lat: number): Either.Either<number, CoordinateValidationError> =>
  Effect.runSync(Effect.either(validateLatitude(lat)));

/**
 * Validate longitude returning Either instead of Effect.
 */
export const validateLongitudeEither = (lng: number): Either.Either<number, CoordinateValidationError> =>
  Effect.runSync(Effect.either(validateLongitude(lng)));

/**
 * Validate URL returning Either instead of Effect.
 */
export const validateUrlEither = (url: string): Either.Either<string, UrlValidationError> =>
  Effect.runSync(Effect.either(validateUrl(url)));

/**
 * Validate slug returning Either instead of Effect.
 */
export const validateSlugEither = (slug: string): Either.Either<Slug, SlugValidationError> =>
  Effect.runSync(Effect.either(validateSlug(slug)));