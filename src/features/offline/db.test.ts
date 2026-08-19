/** @vitest-environment jsdom */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import {
  saveOfflinePlan,
  getOfflinePlan,
  listOfflinePlans,
  deleteOfflinePlan,
  saveMapImage,
  getMapImage,
  saveAudio,
  getAudio,
  getAudioMetaForPlan,
  _resetDB,
  type OfflinePlan,
} from "./db";
import type { PlanReadModel } from "@/types/api";

// Reset IDB module cache + close DB between tests for isolation
beforeEach(async () => {
  await _resetDB();
  indexedDB.deleteDatabase("turistguide-offline");
});

afterEach(async () => {
  await _resetDB();
  indexedDB.deleteDatabase("turistguide-offline");
});

function makePlan(slug: string): PlanReadModel {
  return {
    id: "plan-1",
    slug,
    title: `Plan ${slug}`,
    description: "Test plan",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    days: [
      {
        id: "day-1",
        planId: "plan-1",
        dayNumber: 1,
        title: "Day 1",
        description: null,
        stops: [
          {
            id: "stop-1",
            dayId: "day-1",
            title: "Stop 1",
            summary: null,
            description: "A nice stop",
            lat: 21.45,
            lng: -157.97,
            sortOrder: 1,
            links: [],
            googleMapsUrl: "https://maps.google.com",
            duration: null,
            cost: null,
            reservation: null,
            bring: [],
            bestTime: null,
            warnings: [],
            alternative: null,
            audioUrl: null,
            photo: null,
          },
        ],
      },
    ],
  };
}

describe("offline db — plans", () => {
  it("saves and reads an offline plan", async () => {
    const plan = makePlan("oahu-hawaii");
    const entry: OfflinePlan = {
      slug: "oahu-hawaii",
      plan,
      downloadedAt: "2025-06-01T12:00:00.000Z",
      serverUpdatedAt: plan.updatedAt,
    };

    await saveOfflinePlan(entry);
    const result = await getOfflinePlan("oahu-hawaii");

    expect(result).not.toBeNull();
    expect(result!.slug).toBe("oahu-hawaii");
    expect(result!.plan.title).toBe("Plan oahu-hawaii");
    expect(result!.downloadedAt).toBe("2025-06-01T12:00:00.000Z");
  });

  it("returns null for non-existent plan", async () => {
    const result = await getOfflinePlan("non-existent");
    expect(result).toBeNull();
  });

  it("overwrite on re-save (idempotent)", async () => {
    const plan = makePlan("oahu-hawaii");
    await saveOfflinePlan({
      slug: "oahu-hawaii",
      plan,
      downloadedAt: "2025-06-01T12:00:00.000Z",
      serverUpdatedAt: null,
    });
    await saveOfflinePlan({
      slug: "oahu-hawaii",
      plan,
      downloadedAt: "2025-06-02T12:00:00.000Z",
      serverUpdatedAt: null,
    });

    const result = await getOfflinePlan("oahu-hawaii");
    expect(result!.downloadedAt).toBe("2025-06-02T12:00:00.000Z");
  });

  it("deletes an offline plan with all associated data", async () => {
    const slug = "oahu-hawaii";
    await saveOfflinePlan({
      slug,
      plan: makePlan(slug),
      downloadedAt: "2025-06-01T12:00:00.000Z",
      serverUpdatedAt: null,
    });
    await saveMapImage(slug, new Blob(["image-data"], { type: "image/png" }));
    await saveAudio(slug, "stop-1", new Blob(["audio-data"], { type: "audio/mpeg" }));

    await deleteOfflinePlan(slug);

    expect(await getOfflinePlan(slug)).toBeNull();
    expect(await getMapImage(slug)).toBeNull();
    expect(await getAudio(slug, "stop-1")).toBeNull();
  });

  it("lists all offline plan slugs", async () => {
    await saveOfflinePlan({
      slug: "plan-a",
      plan: makePlan("plan-a"),
      downloadedAt: "2025-06-01T12:00:00.000Z",
      serverUpdatedAt: null,
    });
    await saveOfflinePlan({
      slug: "plan-b",
      plan: makePlan("plan-b"),
      downloadedAt: "2025-06-02T12:00:00.000Z",
      serverUpdatedAt: null,
    });

    const list = await listOfflinePlans();
    const slugs = list.map((e) => e.slug).sort();
    expect(slugs).toEqual(["plan-a", "plan-b"]);
  });
});

describe("offline db — images", () => {
  it("saves and reads a map image blob", async () => {
    const blob = new Blob(["fake-png-data"], { type: "image/png" });
    await saveMapImage("test-plan", blob);

    const result = await getMapImage("test-plan");
    expect(result).not.toBeNull();
    // Use duck-typing — jsdom Blob !== global Blob (instanceof fails across realms)
    expect(result && "size" in result).toBe(true);
    expect((result as Blob).size).toBe(13);
  });

  it("returns null for non-existent image", async () => {
    const result = await getMapImage("non-existent");
    expect(result).toBeNull();
  });
});

describe("offline db — audio", () => {
  it("saves and reads audio blob", async () => {
    const blob = new Blob(["fake-mp3-data"], { type: "audio/mpeg" });
    await saveAudio("test-plan", "stop-1", blob);

    const result = await getAudio("test-plan", "stop-1");
    expect(result).not.toBeNull();
    // Use duck-typing — jsdom Blob !== global Blob (instanceof fails across realms)
    expect(result && "size" in result).toBe(true);
    expect((result as Blob).size).toBe(13);
  });

  it("returns null for non-existent audio", async () => {
    const result = await getAudio("test-plan", "stop-999");
    expect(result).toBeNull();
  });

  it("stores audio metadata for plan listing", async () => {
    await saveAudio(
      "test-plan",
      "stop-1",
      new Blob(["data"], { type: "audio/mpeg" }),
      1024
    );
    await saveAudio(
      "test-plan",
      "stop-2",
      new Blob(["data2"], { type: "audio/mpeg" }),
      2048
    );

    const meta = await getAudioMetaForPlan("test-plan");
    expect(meta).toHaveLength(2);
    const stopIds = meta.map((m) => m.stopId).sort();
    expect(stopIds).toEqual(["stop-1", "stop-2"]);
    expect(meta.find((m) => m.stopId === "stop-1")!.size).toBe(1024);
  });

  it("deletes audio when plan is deleted", async () => {
    const slug = "delete-test-plan";
    await saveOfflinePlan({
      slug,
      plan: makePlan(slug),
      downloadedAt: "2025-06-01T12:00:00.000Z",
      serverUpdatedAt: null,
    });
    await saveAudio(
      slug,
      "stop-1",
      new Blob(["data"], { type: "audio/mpeg" })
    );

    await deleteOfflinePlan(slug);
    expect(await getAudio(slug, "stop-1")).toBeNull();
    expect(await getAudioMetaForPlan(slug)).toHaveLength(0);
  });
});