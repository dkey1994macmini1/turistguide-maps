// Fish Audio S2 Adapter — provider-specific TTS preprocessing + API

const FISH_AUDIO_API = "https://api.fish.audio/v1/tts";

export const REFERENCE_ID_PL = "2532d01f4c59446d9e2144803b73e9da";
export const REFERENCE_ID_EN = "bf322df2096a46f18c579d0baa36f41d";

export const EMOTION_MAP: Record<string, string> = {
  title: "z naciskiem, profesjonalnie",
  facts: "spokojnie, zwięźle",
  guide: "ciepło, z lokalną pasją",
  mustdo: "energicznie, zachęcająco",
  practical: "spokojnie, praktycznie",
  tips: "przyjaźnie, pomocnie",
  nearby: "",
  default: "spokojnie, narracyjnie",
};

const PAUSE_TAG_RE = /\(break\)|\(long-break\)/;

/**
 * Insert Fish Audio S2 pause tags:
 *   - sentence endings (., ?, !) → (long-break)
 *   - phrase boundaries (, ;)  → (break)
 *
 * Skips silently if tags already present.
 */
function insertPauses(text: string): string {
  if (PAUSE_TAG_RE.test(text)) return text;
  return (
    text
      .replace(
        /([.!?])(\s+)(?=[A-ZĄĆĘŁŃÓŚŹŻ])/gu,
        (_, punct, spaces) => `${punct}(long-break)${spaces}`
      )
      .replace(
        /([,;])(\s+)(?=[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ])/g,
        (_, punct, spaces) => `${punct}(break)${spaces}`
      )
  );
}

function addEmotionTag(text: string, emotion: string): string {
  return emotion ? `[${emotion}] ${text}` : text;
}

/**
 * Full Fish-Audio-specific preprocessing pipeline.
 * Called *after* generic language normalization (number→words, etc.).
 */
export function fishAudioPrepare(
  normalizedText: string,
  opts: {
    emotion?: string;
    language?: "pl" | "en";
  } = {}
): { text: string; referenceId: string } {
  const lang = opts.language ?? "pl";
  const emotion = opts.emotion ?? EMOTION_MAP.default;

  let result = normalizedText;
  if (lang === "pl") {
    result = insertPauses(result);
    result = addEmotionTag(result, emotion);
  }

  return {
    text: result,
    referenceId: lang === "pl" ? REFERENCE_ID_PL : REFERENCE_ID_EN,
  };
}

/**
 * Call Fish Audio TTS API.
 */
export async function callFishAudioTts(text: string, referenceId: string): Promise<Uint8Array> {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    throw new Error("FISH_AUDIO_API_KEY not set");
  }

  const response = await fetch(FISH_AUDIO_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: "s2-pro",
    },
    body: JSON.stringify({
      text,
      reference_id: referenceId,
      temperature: 0.7,
      top_p: 0.7,
      prosody: { speed: 1, volume: 0, normalize_loudness: true },
      chunk_length: 300,
      normalize: false,
      format: "mp3",
      sample_rate: 44100,
      mp3_bitrate: 128,
      latency: "normal",
      max_new_tokens: 1024,
      repetition_penalty: 1.2,
      min_chunk_length: 50,
      condition_on_previous_chunks: true,
      early_stop_threshold: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fish Audio TTS ${response.status}: ${errorText}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}
