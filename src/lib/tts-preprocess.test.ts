import { describe, expect, it } from "vitest";
import { preprocessTtsText } from "./tts-preprocess";

describe("preprocessTtsText – generic cleaning", () => {
  it("trims whitespace", () => {
    expect(preprocessTtsText("  Hello world  ")).toBe("Hello world");
  });

  it("collapses multiple spaces", () => {
    expect(preprocessTtsText("Hello    world")).toBe("Hello world");
  });

  it("passes clean text through unchanged", () => {
    expect(preprocessTtsText("Zamek w Krakowie.")).toBe("Zamek w Krakowie.");
  });
});
