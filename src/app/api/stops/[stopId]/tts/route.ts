import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { Effect } from "effect";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { AppLayer } from "@/composition-root";
import { AUDIO_DIR } from "../audio-constants";
import { preprocessTtsText } from "@/lib/tts-preprocess";
import { fishAudioPrepare, callFishAudioTts, EMOTION_MAP } from "@/lib/adapters/fish-audio";

// POST /api/stops/[stopId]/tts — generate audio via Fish Audio TTS
export async function POST(
  request: Request,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;

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

  // Body overrides
  let bodyText: string | null = null;
  let bodyReferenceId: string | null = null;
  let bodyLang: string = "pl";
  let bodyEmotion: string | null = null;
  try {
    const body = await request.json();
    if (typeof body.text === "string" && body.text.trim().length > 0) {
      bodyText = body.text;
    }
    if (typeof body.reference_id === "string") {
      bodyReferenceId = body.reference_id;
    }
    if (typeof body.language === "string" && body.language) {
      bodyLang = body.language;
    }
    if (typeof body.emotion === "string" && body.emotion) {
      bodyEmotion = body.emotion;
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  const effectiveLang: "pl" | "en" = bodyLang === "en" ? "en" : "pl";
  const rawDescription = bodyText ?? text;

  // Generic cleanup (provider-agnostic)
  const cleaned = preprocessTtsText(rawDescription);

  // Fish Audio-specific: pauses + emotion tag + voice ref
  const { text: ttsText, referenceId } = fishAudioPrepare(cleaned, {
    language: effectiveLang,
    emotion: bodyEmotion ?? EMOTION_MAP.default,
  });

  const finalReferenceId = bodyReferenceId ?? referenceId;

  try {
    const audioData = await callFishAudioTts(ttsText, finalReferenceId);

    if (!existsSync(AUDIO_DIR)) {
      await mkdir(AUDIO_DIR, { recursive: true });
    }

    const filename = `${stopId}.mp3`;
    const filepath = join(AUDIO_DIR, filename);
    await writeFile(filepath, Buffer.from(audioData));

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
  } catch (err: any) {
    console.error("Fish Audio TTS error:", err.message);
    return NextResponse.json(
      { error: "TTS generation failed", details: err.message },
      { status: 502 }
    );
  }
}
