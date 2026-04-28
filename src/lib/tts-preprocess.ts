// ── Generic TTS text preprocessing ─────────────────────────────────
// Language-agnostic cleaning. Provider-specific normalization
// (numbers, abbreviations, currency, pauses, emotion tags) lives in
// the provider adapter (e.g. src/lib/adapters/fish-audio.ts).

export function preprocessTtsText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
