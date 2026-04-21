import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const AUDIO_DIR = join(process.cwd(), "storage", "audio", "stops");
const POSSIBLE_EXTS = ["mp3", "ogg", "wav", "m4a", "webm"];
const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  webm: "audio/webm",
};

// GET /api/audio/stops/[stopId] — serve audio file for a stop
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;

  // Find audio file with any supported extension
  for (const ext of POSSIBLE_EXTS) {
    const filepath = join(AUDIO_DIR, `${stopId}.${ext}`);
    if (existsSync(filepath)) {
      const fileStat = await stat(filepath);
      const data = await readFile(filepath);

      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
          "Content-Length": String(fileStat.size),
          "Cache-Control": "public, max-age=86400",
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  return NextResponse.json({ error: "Audio not found" }, { status: 404 });
}