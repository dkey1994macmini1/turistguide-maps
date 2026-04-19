import { describe, it, expect } from "vitest";
import { Effect, Either } from "effect";
import {
  validateLatitude,
  validateLongitude,
  validateCoordinates,
  validateUrl,
  validateSlug,
} from "../validation";
import type {
  CoordinateValidationError,
  UrlValidationError,
  SlugValidationError,
} from "../errors";

// --- Coordinate Validation ---

describe("validateLatitude", () => {
  it("should accept valid latitude values", async () => {
    const values = [0, -90, 90, 45.123, -45.654, 0.000001];
    for (const lat of values) {
      const result = await Effect.runPromise(Effect.either(validateLatitude(lat)));
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe(lat);
      }
    }
  });

  it("should reject latitude above 90", async () => {
    const result = await Effect.runPromise(Effect.either(validateLatitude(91)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err._tag).toBe("CoordinateValidationError");
      expect(err.field).toBe("lat");
      expect(err.value).toBe(91);
      expect(err.message).toContain("between -90 and 90");
    }
  });

  it("should reject latitude below -90", async () => {
    const result = await Effect.runPromise(Effect.either(validateLatitude(-91)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lat");
      expect(err.value).toBe(-91);
    }
  });

  it("should reject NaN latitude", async () => {
    const result = await Effect.runPromise(Effect.either(validateLatitude(NaN)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lat");
      expect(err.message).toContain("finite number");
    }
  });

  it("should reject Infinity latitude", async () => {
    const result = await Effect.runPromise(Effect.either(validateLatitude(Infinity)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lat");
      expect(err.message).toContain("finite number");
    }
  });

  it("should reject -Infinity latitude", async () => {
    const result = await Effect.runPromise(Effect.either(validateLatitude(-Infinity)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lat");
    }
  });

  it("should produce deterministic error message for boundary violations", async () => {
    const result = await Effect.runPromise(Effect.either(validateLatitude(100)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.message).toBe("Latitude must be between -90 and 90, got 100");
    }
  });
});

describe("validateLongitude", () => {
  it("should accept valid longitude values", async () => {
    const values = [0, -180, 180, 90.5, -90.5, 0.000001];
    for (const lng of values) {
      const result = await Effect.runPromise(Effect.either(validateLongitude(lng)));
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe(lng);
      }
    }
  });

  it("should reject longitude above 180", async () => {
    const result = await Effect.runPromise(Effect.either(validateLongitude(181)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err._tag).toBe("CoordinateValidationError");
      expect(err.field).toBe("lng");
      expect(err.value).toBe(181);
      expect(err.message).toContain("between -180 and 180");
    }
  });

  it("should reject longitude below -180", async () => {
    const result = await Effect.runPromise(Effect.either(validateLongitude(-181)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lng");
      expect(err.value).toBe(-181);
    }
  });

  it("should reject NaN longitude", async () => {
    const result = await Effect.runPromise(Effect.either(validateLongitude(NaN)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lng");
      expect(err.message).toContain("finite number");
    }
  });

  it("should reject Infinity longitude", async () => {
    const result = await Effect.runPromise(Effect.either(validateLongitude(Infinity)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lng");
    }
  });

  it("should produce deterministic error message for boundary violations", async () => {
    const result = await Effect.runPromise(Effect.either(validateLongitude(200)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.message).toBe("Longitude must be between -180 and 180, got 200");
    }
  });
});

describe("validateCoordinates", () => {
  it("should accept valid coordinate pair", async () => {
    const result = await Effect.runPromise(Effect.either(validateCoordinates(21.3069, -157.8583)));
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toEqual({ lat: 21.3069, lng: -157.8583 });
    }
  });

  it("should fail if latitude is invalid", async () => {
    const result = await Effect.runPromise(Effect.either(validateCoordinates(100, 0)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lat");
    }
  });

  it("should fail if longitude is invalid", async () => {
    const result = await Effect.runPromise(Effect.either(validateCoordinates(0, 200)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      expect(err.field).toBe("lng");
    }
  });

  it("should fail with latitude error when both are invalid (short-circuits)", async () => {
    const result = await Effect.runPromise(Effect.either(validateCoordinates(100, 200)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as CoordinateValidationError;
      // Latitude is validated first, so it short-circuits on lat error
      expect(err.field).toBe("lat");
    }
  });
});

// --- URL Validation ---

describe("validateUrl", () => {
  it("should accept valid https URLs", async () => {
    const urls = [
      "https://example.com",
      "https://example.com/path",
      "https://example.com/path?q=1&r=2",
      "https://sub.example.com:8080/path",
    ];
    for (const url of urls) {
      const result = await Effect.runPromise(Effect.either(validateUrl(url)));
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe(url);
      }
    }
  });

  it("should accept valid http URLs", async () => {
    const result = await Effect.runPromise(Effect.either(validateUrl("http://example.com")));
    expect(Either.isRight(result)).toBe(true);
  });

  it("should trim whitespace from URLs", async () => {
    const result = await Effect.runPromise(Effect.either(validateUrl("  https://example.com  ")));
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toBe("https://example.com");
    }
  });

  it("should reject empty URL", async () => {
    const result = await Effect.runPromise(Effect.either(validateUrl("")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as UrlValidationError;
      expect(err._tag).toBe("UrlValidationError");
      expect(err.message).toContain("empty");
    }
  });

  it("should reject whitespace-only URL", async () => {
    const result = await Effect.runPromise(Effect.either(validateUrl("   ")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as UrlValidationError;
      expect(err.message).toContain("empty");
    }
  });

  it("should reject URL without protocol", async () => {
    const result = await Effect.runPromise(Effect.either(validateUrl("example.com")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as UrlValidationError;
      expect(err._tag).toBe("UrlValidationError");
      expect(err.message).toContain("Invalid URL");
    }
  });

  it("should reject ftp URL", async () => {
    const result = await Effect.runPromise(Effect.either(validateUrl("ftp://example.com")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as UrlValidationError;
      expect(err.message).toContain("http or https protocol");
    }
  });

  it("should reject malformed URL", async () => {
    const result = await Effect.runPromise(Effect.either(validateUrl("https://")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as UrlValidationError;
      expect(err._tag).toBe("UrlValidationError");
    }
  });

  it("should preserve original URL in error for debugging", async () => {
    const badUrl = "not-a-url";
    const result = await Effect.runPromise(Effect.either(validateUrl(badUrl)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as UrlValidationError;
      expect(err.url).toBe(badUrl);
    }
  });
});

// --- Slug Validation ---

describe("validateSlug", () => {
  it("should accept valid slugs", async () => {
    const slugs = ["my-trip", "hawaii-2024", "a", "123", "abc-123-def"];
    for (const slug of slugs) {
      const result = await Effect.runPromise(Effect.either(validateSlug(slug)));
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe(slug);
      }
    }
  });

  it("should reject empty slug", async () => {
    const result = await Effect.runPromise(Effect.either(validateSlug("")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as SlugValidationError;
      expect(err._tag).toBe("SlugValidationError");
      expect(err.message).toContain("empty");
    }
  });

  it("should reject slug with uppercase", async () => {
    const result = await Effect.runPromise(Effect.either(validateSlug("My-Trip")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as SlugValidationError;
      expect(err.message).toContain("lowercase alphanumeric");
    }
  });

  it("should reject slug with spaces", async () => {
    const result = await Effect.runPromise(Effect.either(validateSlug("my trip")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as SlugValidationError;
      expect(err.message).toContain("lowercase alphanumeric");
    }
  });

  it("should reject slug with special characters", async () => {
    const result = await Effect.runPromise(Effect.either(validateSlug("my_trip!")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as SlugValidationError;
      expect(err.message).toContain("lowercase alphanumeric");
    }
  });

  it("should reject slug starting with hyphen", async () => {
    const result = await Effect.runPromise(Effect.either(validateSlug("-my-trip")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as SlugValidationError;
      expect(err.message).toContain("lowercase alphanumeric");
    }
  });

  it("should reject slug ending with hyphen", async () => {
    const result = await Effect.runPromise(Effect.either(validateSlug("my-trip-")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as SlugValidationError;
      expect(err.message).toContain("lowercase alphanumeric");
    }
  });

  it("should reject slug with consecutive hyphens", async () => {
    const result = await Effect.runPromise(Effect.either(validateSlug("my--trip")));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as SlugValidationError;
      expect(err.message).toContain("lowercase alphanumeric");
    }
  });

  it("should reject slug exceeding 100 characters", async () => {
    const longSlug = "a".repeat(101);
    const result = await Effect.runPromise(Effect.either(validateSlug(longSlug)));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      const err = result.left as SlugValidationError;
      expect(err.message).toContain("at most 100 characters");
    }
  });

  it("should accept slug at exactly 100 characters", async () => {
    // Create a valid slug pattern of exactly 100 chars
    const slug = "a".repeat(100);
    const result = await Effect.runPromise(Effect.either(validateSlug(slug)));
    expect(Either.isRight(result)).toBe(true);
  });

  it("should return branded Slug type on success", async () => {
    const result = await Effect.runPromise(Effect.either(validateSlug("hawaii-trip")));
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      // The branded slug should be usable as a string
      expect(typeof result.right).toBe("string");
      expect(result.right).toBe("hawaii-trip");
    }
  });
});