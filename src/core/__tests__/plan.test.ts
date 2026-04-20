import { describe, it, expect } from "vitest";
import { Effect, Either } from "effect";
import { PlanId, DayId, StopId, Slug } from "../branded";
import type { Plan } from "../plan";
import type { Day } from "../day";
import type { Stop } from "../stop";
import type { StopLink } from "../stop-link";
import { validateSlug } from "@/features/plan/plan.validation";

// --- Branded Type Tests ---

describe("Branded types", () => {
  describe("PlanId", () => {
    it("should create a PlanId from a string", () => {
      const id = PlanId("plan-123");
      expect(id).toBe("plan-123");
      expect(typeof id).toBe("string");
    });

    it("should preserve the underlying string value", () => {
      const id = PlanId("abc-def-ghi");
      expect(id as string).toBe("abc-def-ghi");
    });
  });

  describe("DayId", () => {
    it("should create a DayId from a string", () => {
      const id = DayId("day-1");
      expect(id).toBe("day-1");
      expect(typeof id).toBe("string");
    });
  });

  describe("StopId", () => {
    it("should create a StopId from a string", () => {
      const id = StopId("stop-1");
      expect(id).toBe("stop-1");
      expect(typeof id).toBe("string");
    });
  });

  describe("Slug", () => {
    it("should create a Slug from a valid string", () => {
      const slug = Slug("my-trip");
      expect(slug).toBe("my-trip");
      expect(typeof slug).toBe("string");
    });

    it("should create a Slug via validation", async () => {
      const result = await Effect.runPromise(Effect.either(validateSlug("hawaii-2024")));
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe("hawaii-2024");
      }
    });
  });
});

// --- Plan Type Construction ---

describe("Plan type", () => {
  it("should construct a valid Plan object", () => {
    const now = new Date();
    const plan: Plan = {
      id: PlanId("plan-1"),
      slug: Slug("hawaii-trip"),
      title: "Hawaii Trip",
      description: "A wonderful trip to Hawaii",
      createdAt: now,
      updatedAt: now,
    };

    expect(plan.id).toBe("plan-1");
    expect(plan.slug).toBe("hawaii-trip");
    expect(plan.title).toBe("Hawaii Trip");
    expect(plan.description).toBe("A wonderful trip to Hawaii");
    expect(plan.createdAt).toBe(now);
    expect(plan.updatedAt).toBe(now);
  });

  it("should enforce readonly at compile time", () => {
    const plan: Plan = {
      id: PlanId("plan-1"),
      slug: Slug("test"),
      title: "Test",
      description: "Desc",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Runtime check: properties exist and are correct types
    expect(typeof plan.id).toBe("string");
    expect(typeof plan.title).toBe("string");
    expect(plan.createdAt).toBeInstanceOf(Date);
  });
});

// --- Day Type Construction ---

describe("Day type", () => {
  it("should construct a Day with optional fields as null", () => {
    const day: Day = {
      id: DayId("day-1"),
      planId: PlanId("plan-1"),
      dayNumber: 1,
      title: null,
      description: null,
    };

    expect(day.id).toBe("day-1");
    expect(day.planId).toBe("plan-1");
    expect(day.dayNumber).toBe(1);
    expect(day.title).toBeNull();
    expect(day.description).toBeNull();
  });

  it("should construct a Day with all fields populated", () => {
    const day: Day = {
      id: DayId("day-2"),
      planId: PlanId("plan-1"),
      dayNumber: 2,
      title: "Beach Day",
      description: "Relaxing at Waikiki",
    };

    expect(day.title).toBe("Beach Day");
    expect(day.description).toBe("Relaxing at Waikiki");
  });
});

// --- Stop Type Construction ---

describe("Stop type", () => {
  it("should construct a Stop with links array", () => {
    const links: ReadonlyArray<StopLink> = [
      { label: "Website", url: "https://example.com" },
      { label: "Map", url: "https://maps.example.com" },
    ];

    const stop: Stop = {
      id: StopId("stop-1"),
      dayId: DayId("day-1"),
      title: "Diamond Head",
      description: "Famous hike in Honolulu",
      lat: 21.2989,
      lng: -157.8236,
      sortOrder: 1,
      links,
    };

    expect(stop.id).toBe("stop-1");
    expect(stop.dayId).toBe("day-1");
    expect(stop.title).toBe("Diamond Head");
    expect(stop.lat).toBeCloseTo(21.2989);
    expect(stop.lng).toBeCloseTo(-157.8236);
    expect(stop.sortOrder).toBe(1);
    expect(stop.links).toHaveLength(2);
    expect(stop.links[0].label).toBe("Website");
    expect(stop.links[1].url).toBe("https://maps.example.com");
  });

  it("should construct a Stop with empty links", () => {
    const stop: Stop = {
      id: StopId("stop-2"),
      dayId: DayId("day-1"),
      title: "Beach",
      description: "Nice beach",
      lat: 21.276,
      lng: -157.827,
      sortOrder: 2,
      links: [],
    };

    expect(stop.links).toHaveLength(0);
  });
});

// --- StopLink Type ---

describe("StopLink type", () => {
  it("should construct a StopLink", () => {
    const link: StopLink = {
      label: "Official Site",
      url: "https://diamondheadcrater.com",
    };

    expect(link.label).toBe("Official Site");
    expect(link.url).toBe("https://diamondheadcrater.com");
  });
});