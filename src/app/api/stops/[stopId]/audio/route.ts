import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { Effect } from "effect";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { AppLayer } from "@/composition-root";

const AUDIO_DIR = join(process.cwd(), "storage", "audio", "stops");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/webm", "audio/mp4", "audio/x-m4a"];

// POST /api/stops/[stopId]/audio — upload audio file for a stop
export async function POST(
  request: Request,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;

  // Verify stop exists
  const stopResult = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* StopRepositoryPort;
      return yield* repo.getStopById(stopId);
    }).pipe(Effect.provide(AppLayer))
  );

  if (stopResult._tag === "Failure") {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith(".mp3") && !file.name.endsWith(".ogg") && !file.name.endsWith(".wav") && !file.name.endsWith(".m4a")) {
    return NextResponse.json({ error: "Unsupported audio type. Allowed: mp3, ogg, wav, m4a, webm" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max 20MB" }, { status: 400 });
  }

  // Determine extension
  const ext = file.name.split(".").pop() || "mp3";
  const filename = `${stopId}.${ext}`;
  const filepath = join(AUDIO_DIR, filename);

  // Ensure directory exists
  if (!existsSync(AUDIO_DIR)) {
    await mkdir(AUDIO_DIR, { recursive: true });
  }

  // Write file
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

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
}

// DELETE /api/stops/[stopId]/audio — remove audio from a stop
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;

  // Find and delete audio file (any extension)
  const possibleExts = ["mp3", "ogg", "wav", "m4a", "webm"];
  let deleted = false;
  for (const ext of possibleExts) {
    const filepath = join(AUDIO_DIR, `${stopId}.${ext}`);
    if (existsSync(filepath)) {
      const { unlink } = await import("fs/promises");
      await unlink(filepath);
      deleted = true;
      break;
    }
  }

  // Clear audioUrl on stop
  const updateResult = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* StopRepositoryPort;
      return yield* repo.updateStop(stopId, { audioUrl: null });
    }).pipe(Effect.provide(AppLayer))
  );

  if (updateResult._tag === "Failure") {
    return NextResponse.json({ error: "Failed to update stop" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, fileRemoved: deleted });
}