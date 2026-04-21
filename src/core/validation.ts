import { Effect } from "effect";
import type { CoordinateValidationError, UrlValidationError, SlugValidationError } from "./validation-errors";
import type { Slug } from "@/core/branded";
import { Slug as SlugBrand } from "@/core/branded";

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

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

export const validateCoordinates = (
  lat: number,
  lng: number,
): Effect.Effect<{ lat: number; lng: number }, CoordinateValidationError> =>
  Effect.gen(function* () {
    const validLat = yield* validateLatitude(lat);
    const validLng = yield* validateLongitude(lng);
    return { lat: validLat, lng: validLng };
  });

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
