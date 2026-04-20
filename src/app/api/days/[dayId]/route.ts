import { NextResponse } from "next/server";
import { Effect } from "effect";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { AppLayer } from "@/composition-root";


// PATCH /api/days/[dayId] — update a day
export async function PATCH(
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

  const { dayNumber, title, description } = body as Record<string, unknown>;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* DayRepositoryPort;
      return yield* repo.updateDay(dayId, {
        ...(typeof dayNumber === "number" && { dayNumber }),
        ...(title !== undefined && { title: title as string | null }),
        ...(description !== undefined && { description: description as string | null }),
      });
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to update day" }, { status: 500 });
  }

  return NextResponse.json(result.value);
}

// DELETE /api/days/[dayId] — delete a day
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ dayId: string }> }
) {
  const { dayId } = await params;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* DayRepositoryPort;
      return yield* repo.deleteDay(dayId);
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to delete day" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}