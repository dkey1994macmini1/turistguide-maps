import { NextResponse } from "next/server";
import { Effect } from "effect";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { AppLayer } from "@/composition-root";


// POST /api/days/reorder — batch reorder days
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { items } = body as { items?: Array<{ id: string; dayNumber: number }> };

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* DayRepositoryPort;
      return yield* repo.reorderDays(items);
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to reorder days" }, { status: 500 });
  }

  return NextResponse.json({ reordered: true });
}