import { describe, expect, it } from "vitest";
import {
  fishAudioPrepare,
  callFishAudioTts,
  EMOTION_MAP,
  REFERENCE_ID_PL,
  REFERENCE_ID_EN,
} from "./fish-audio";

// Mock fetch for callFishAudioTts tests
describe("fishAudioPrepare – Polish", () => {
  const raw = "Kościół św. Marii z XIV wieku. Ołtarz jest piękny, warto zobaczyć.";

  it("injects (long-break) after sentences (except last)", () => {
    const { text } = fishAudioPrepare(raw, { language: "pl", emotion: "spokojnie" });
    expect(text).toContain("wieku.(long-break)");
    expect(text).not.toContain("zobaczyć.(long-break)"); // last sentence, nothing follows
  });

  it("injects (break) after phrases", () => {
    const { text } = fishAudioPrepare(raw, { language: "pl", emotion: "spokojnie" });
    expect(text).toContain("piękny,(break)");
  });

  it("adds emotion tag for Polish", () => {
    const { text } = fishAudioPrepare(raw, { language: "pl", emotion: "ciepło" });
    expect(text.startsWith("[ciepło] ")).toBe(true);
  });

  it("does not double-inject pauses if already present", () => {
    const alreadyTagged = "Hello(long-break) world.";
    const { text } = fishAudioPrepare(alreadyTagged, { language: "pl" });
    expect(text.match(/long-break/g)).toHaveLength(1);
  });

  it("uses REFERENCE_ID_PL for Polish", () => {
    const { referenceId } = fishAudioPrepare("test", { language: "pl" });
    expect(referenceId).toBe(REFERENCE_ID_PL);
  });

  it("default emotion falls back", () => {
    const { text } = fishAudioPrepare("test", { language: "pl" });
    expect(text.startsWith("[spokojnie, narracyjnie] ")).toBe(true);
  });
});

describe("fishAudioPrepare – English", () => {
  const raw = "Hello world. This is a test, thanks.";

  it("does NOT add pauses for English", () => {
    const { text } = fishAudioPrepare(raw, { language: "en" });
    expect(text).not.toContain("(break)");
    expect(text).not.toContain("(long-break)");
  });

  it("does NOT add emotion tag for English", () => {
    const { text } = fishAudioPrepare(raw, { language: "en", emotion: "happy" });
    expect(text.startsWith("[happy]")).toBe(false);
    expect(text).toBe(raw);
  });

  it("uses REFERENCE_ID_EN for English", () => {
    const { referenceId } = fishAudioPrepare("test", { language: "en" });
    expect(referenceId).toBe(REFERENCE_ID_EN);
  });
});

describe("EMOTION_MAP", () => {
  it("has expected keys", () => {
    expect(EMOTION_MAP.default).toBe("spokojnie, narracyjnie");
    expect(EMOTION_MAP.guide).toBe("ciepło, z lokalną pasją");
    expect(EMOTION_MAP.title).toBe("z naciskiem, profesjonalnie");
  });
});
