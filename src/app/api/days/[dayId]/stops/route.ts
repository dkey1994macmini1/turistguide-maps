import { NextResponse } from "next/server";
import { Effect } from "effect";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { AppLayer } from "@/composition-root";
import { validateCoordinates, validateUrl } from "@/core/validation";
import type { StopLink } from "@/core/stop-link";


// GET /api/days/[dayId]/stops — list stops for a day
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* StopRepositoryPort;
      return yield* repo.listStopsByDayId(dayId);
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to list stops" }, { status: 500 });
  }

  return NextResponse.json(result.value);
}

// POST /api/days/[dayId]/stops — create a stop
export async function POST(
  request: Request,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, lat, lng, sortOrder, links } = body as Record<string, unknown>;

  if (typeof title !== "string" || typeof lat !== "number" || typeof lng !== "number" || typeof sortOrder !== "number") {
    return NextResponse.json({ error: "title, lat, lng, and sortOrder are required" }, { status: 400 });
  }

  // Validate coordinates
  const coordResult = Effect.runSyncExit(validateCoordinates(lat, lng));
  if (coordResult._tag === "Failure") {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // Validate links if present
  if (Array.isArray(links)) {
    for (const link of links as StopLink[]) {
      if (typeof link.url === "string") {
        const urlResult = Effect.runSyncExit(validateUrl(link.url));
        if (urlResult._tag === "Failure") {
          return NextResponse.json({ error: `Invalid URL in link: ${link.url}` }, { status: 400 });
        }
      }
    }
  }

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* StopRepositoryPort;
      return yield* repo.createStop({
        dayId,
        title,
        description: typeof description === "string" ? description : "",
        lat,
        lng,
        sortOrder,
        links: Array.isArray(links) ? links : [],
      });
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to create stop" }, { status: 500 });
  }

  return NextResponse.json(result.value, { status: 201 });
}