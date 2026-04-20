import { NextResponse } from "next/server";
import { Effect } from "effect";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { AppLayer } from "@/composition-root";


// POST /api/stops/reorder — batch reorder stops
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { items } = body as { items?: Array<{ id: string; sortOrder: number }> };

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* StopRepositoryPort;
      return yield* repo.reorderStops(items);
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to reorder stops" }, { status: 500 });
  }

  return NextResponse.json({ reordered: true });
}