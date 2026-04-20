import { Effect, Either } from "effect";
import type { CoordinateValidationError, UrlValidationError } from "./stop.errors";

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

export const validateLatitudeEither = (lat: number): Either.Either<number, CoordinateValidationError> =>
  Effect.runSync(Effect.either(validateLatitude(lat)));

export const validateLongitudeEither = (lng: number): Either.Either<number, CoordinateValidationError> =>
  Effect.runSync(Effect.either(validateLongitude(lng)));

export const validateUrlEither = (url: string): Either.Either<string, UrlValidationError> =>
  Effect.runSync(Effect.either(validateUrl(url)));
