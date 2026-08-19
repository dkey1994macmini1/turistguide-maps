import { NextResponse } from "next/server";
import { Effect } from "effect";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { AppLayer } from "@/composition-root";
import { isValidStopPhoto, validateCoordinates, validateUrl } from "@/core/validation";
import type { StopLink } from "@/core/stop-link";
import type { DurationRange, CostInfo } from "@/core/stop-types";


// PATCH /api/stops/[stopId] — update a stop
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, summary, lat, lng, sortOrder, links, duration, cost, reservation, bring, bestTime, warnings, alternative, audioUrl, photo, visited } = body as Record<string, unknown>;

  if (typeof lat === "number" && typeof lng === "number") {
    const coordResult = Effect.runSyncExit(validateCoordinates(lat, lng));
    if (coordResult._tag === "Failure") {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
  }

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

  if (photo !== undefined && photo !== null && !isValidStopPhoto(photo)) {
    return NextResponse.json({ error: "Invalid stop photo" }, { status: 400 });
  }

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* StopRepositoryPort;
      return yield* repo.updateStop(stopId, {
        ...(typeof title === "string" && { title }),
        ...(typeof description === "string" && { description }),
        ...(typeof summary === "string" && { summary }),
        ...(typeof lat === "number" && { lat }),
        ...(typeof lng === "number" && { lng }),
        ...(typeof sortOrder === "number" && { sortOrder }),
        ...(Array.isArray(links) && { links }),
        ...(duration !== undefined && { duration: (duration && typeof duration === "object" && "min" in duration && "max" in duration) ? duration as DurationRange : null }),
        ...(cost !== undefined && { cost: (cost && typeof cost === "object" && "amount" in cost && "currency" in cost && "per" in cost) ? cost as CostInfo : null }),
        ...(reservation !== undefined && { reservation: typeof reservation === "string" ? reservation : null }),
        ...(Array.isArray(bring) && { bring }),
        ...(bestTime !== undefined && { bestTime: typeof bestTime === "string" ? bestTime : null }),
        ...(Array.isArray(warnings) && { warnings }),
        ...(alternative !== undefined && { alternative: typeof alternative === "string" ? alternative : null }),
        ...(audioUrl !== undefined && { audioUrl: typeof audioUrl === "string" ? audioUrl : null }),
        ...(photo !== undefined && { photo: photo === null ? null : photo }),
        ...(visited !== undefined && { visited: typeof visited === "boolean" ? visited : undefined }),
      });
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to update stop" }, { status: 500 });
  }

  return NextResponse.json(result.value);
}

// DELETE /api/stops/[stopId] — delete a stop
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* StopRepositoryPort;
      return yield* repo.deleteStop(stopId);
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to delete stop" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}