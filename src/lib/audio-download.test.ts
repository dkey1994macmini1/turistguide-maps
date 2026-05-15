// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchAudioBlob,
  triggerFileDownload,
  shareAudioFile,
} from "./audio-download";
import * as db from "@/features/offline/db";

describe("fetchAudioBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns offline blob from IndexedDB when available", async () => {
    const mockBlob = new Blob(["audio"], { type: "audio/mpeg" });
    vi.spyOn(db, "getAudio").mockResolvedValue(mockBlob);

    const result = await fetchAudioBlob("trip-1", "stop-a", "/api/audio/stops/stop-a");

    expect(result.ok).toBe(true);
    expect(result.blob).toBe(mockBlob);
    expect(result.filename).toBe("stop-a.mp3");
  });

  it("falls back to server when IndexedDB has no blob", async () => {
    vi.spyOn(db, "getAudio").mockResolvedValue(null);

    const serverBlob = new Blob(["server-audio"], { type: "audio/mpeg" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => serverBlob,
    } as Response);

    const result = await fetchAudioBlob("trip-1", "stop-b", "/api/audio/stops/stop-b");

    expect(result.ok).toBe(true);
    expect(result.blob).toBe(serverBlob);
    expect(global.fetch).toHaveBeenCalledWith("/api/audio/stops/stop-b");
  });

  it("returns error when both IndexedDB and server fail", async () => {
    vi.spyOn(db, "getAudio").mockResolvedValue(null);
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));

    const result = await fetchAudioBlob("trip-1", "stop-c", "/api/audio/stops/stop-c");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Błąd pobierania z serwera");
  });

  it("returns error when no serverUrl and no offline blob", async () => {
    vi.spyOn(db, "getAudio").mockResolvedValue(null);

    const result = await fetchAudioBlob("trip-1", "stop-d", null);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("offline");
  });
});

describe("triggerFileDownload", () => {
  it("is exported as a function", () => {
    expect(typeof triggerFileDownload).toBe("function");
  });
});

describe("shareAudioFile", () => {
  it("returns false when navigator.share is unavailable", async () => {
    const originalShare = navigator.share;
    const originalCanShare = navigator.canShare;
    // @ts-expect-error — deleting for test
    delete navigator.share;
    // @ts-expect-error
    delete navigator.canShare;

    const result = await shareAudioFile(
      new Blob(["x"]),
      "a.mp3",
      "Audio"
    );
    expect(result).toBe(false);

    // Restore
    // @ts-expect-error
    navigator.share = originalShare;
    // @ts-expect-error
    navigator.canShare = originalCanShare;
  });

  it("returns true on successful share", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);
    // @ts-expect-error
    navigator.share = shareMock;
    // @ts-expect-error
    navigator.canShare = canShareMock;

    const blob = new Blob(["audio-data"], { type: "audio/mpeg" });
    const result = await shareAudioFile(blob, "stop-1.mp3", "Przystanek 1");

    expect(result).toBe(true);
    expect(shareMock).toHaveBeenCalled();
    const shareArg = shareMock.mock.calls[0][0] as ShareData;
    expect(shareArg.title).toBe("Przystanek 1");
    expect(shareArg.files).toHaveLength(1);
    expect(shareArg.files![0].name).toBe("stop-1.mp3");

    // Restore
    // @ts-expect-error
    delete navigator.share;
    // @ts-expect-error
    delete navigator.canShare;
  });
});
