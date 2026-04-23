import { NextResponse } from "next/server";
import { Effect } from "effect";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { AppLayer } from "@/composition-root";
import { serializeReadModel } from "../../../serializers";
import fs from "fs/promises";
import path from "path";
import { AUDIO_DIR } from "../../../stops/[stopId]/audio-constants";

// GET /api/plans/[slug]/snapshot — full plan + audio file metadata for offline download
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      return yield* readModel.getPlanReadModelBySlug(slug);
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const plan = serializeReadModel(result.value);

  // Collect audio file metadata
  const audioFiles: { stopId: string; url: string; size: number }[] = [];
  let totalAudioSize = 0;

  for (const day of plan.days) {
    for (const stop of day.stops) {
      if (stop.audioUrl) {
        const audioPath = path.join(AUDIO_DIR, `${stop.id}.mp3`);
        try {
          const stat = await fs.stat(audioPath);
          audioFiles.push({
            stopId: stop.id,
            url: stop.audioUrl,
            size: stat.size,
          });
          totalAudioSize += stat.size;
        } catch {
          // Audio file doesn't exist on disk — skip
        }
      }
    }
  }

  return NextResponse.json({
    plan,
    audioFiles,
    totalAudioSize,
  });
}