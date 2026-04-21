import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { Effect } from "effect";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { AppLayer } from "@/composition-root";
import { AUDIO_DIR } from "../audio-constants";
import { preprocessTtsText } from "@/lib/tts-preprocess";

const FISH_AUDIO_API = "https://api.fish.audio/v1/tts";
const REFERENCE_ID_PL = "2532d01f4c59446d9e2144803b73e9da"; // Polish voice ref
const REFERENCE_ID_EN = "bf322df2096a46f18c579d0baa36f41d"; // English voice ref

// POST /api/stops/[stopId]/tts — generate audio via Fish Audio TTS
export async function POST(
  request: Request,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;

  // Get stop to find description
  const stopResult = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* StopRepositoryPort;
      return yield* repo.getStopById(stopId);
    }).pipe(Effect.provide(AppLayer))
  );

  if (stopResult._tag === "Failure") {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  const stop = stopResult.value;
  const text = stop.description;

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: "Stop has no description to synthesize" }, { status: 400 });
  }

  // Allow override: body can specify text and reference_id
  let bodyText: string | null = null;
  let bodyReferenceId: string | null = null;
  try {
    const body = await request.json();
    if (typeof body.text === "string" && body.text.trim().length > 0) {
      bodyText = body.text;
    }
    if (typeof body.reference_id === "string") {
      bodyReferenceId = body.reference_id;
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  const ttsText = preprocessTtsText(bodyText ?? text);
  const referenceId = bodyReferenceId ?? REFERENCE_ID_PL;

  // Call Fish Audio API
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Fish Audio API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(FISH_AUDIO_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "model": "s2-pro",
      },
      body: JSON.stringify({
        text: ttsText,
        reference_id: referenceId,
        temperature: 0.7,
        top_p: 0.7,
        prosody: { speed: 1, volume: 0, normalize_loudness: true },
        chunk_length: 300,
        normalize: true,
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
      console.error("Fish Audio TTS error:", response.status, errorText);
      return NextResponse.json(
        { error: `Fish Audio TTS failed: ${response.status}`, details: errorText },
        { status: 502 }
      );
    }

    // Read audio data
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Ensure directory exists
    if (!existsSync(AUDIO_DIR)) {
      await mkdir(AUDIO_DIR, { recursive: true });
    }

    // Save as mp3
    const filename = `${stopId}.mp3`;
    const filepath = join(AUDIO_DIR, filename);
    await writeFile(filepath, audioBuffer);

    // Update stop with audioUrl
    const audioUrlPath = `/api/audio/stops/${stopId}`;
    const updateResult = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* StopRepositoryPort;
        return yield* repo.updateStop(stopId, { audioUrl: audioUrlPath });
      }).pipe(Effect.provide(AppLayer))
    );

    if (updateResult._tag === "Failure") {
      return NextResponse.json({ error: "Failed to update stop" }, { status: 500 });
    }

    return NextResponse.json({ audioUrl: audioUrlPath, stop: updateResult.value });
  } catch (err) {
    console.error("Fish Audio TTS unexpected error:", err);
    return NextResponse.json(
      { error: "TTS generation failed" },
      { status: 500 }
    );
  }
}