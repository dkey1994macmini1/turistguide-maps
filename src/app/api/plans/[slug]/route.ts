import { NextResponse } from "next/server";
import { Effect } from "effect";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { AppLayer } from "@/composition-root";
import { serializeReadModel } from "../../serializers";

// GET /api/plans/[slug] — full plan read model by slug
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

  return NextResponse.json(serializeReadModel(result.value));
}

// DELETE /api/plans/[slug] — delete plan by slug
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Find plan by slug first
  const planResult = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* PlanRepositoryPort;
      return yield* repo.getPlanBySlug(slug);
    }).pipe(Effect.provide(AppLayer))
  );

  if (planResult._tag === "Failure") {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const deleteResult = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* PlanRepositoryPort;
      return yield* repo.deletePlan(planResult.value.id);
    }).pipe(Effect.provide(AppLayer))
  );

  if (deleteResult._tag === "Failure") {
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

// PATCH /api/plans/[slug] — update plan fields (startDate, title, description)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const planResult = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* PlanRepositoryPort;
      return yield* repo.getPlanBySlug(slug);
    }).pipe(Effect.provide(AppLayer))
  );

  if (planResult._tag === "Failure") {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { startDate, title, description } = body as Record<string, unknown>;

  const updateData: { startDate?: Date | null; title?: string; description?: string } = {};

  if (startDate !== undefined) {
    if (startDate === null) {
      updateData.startDate = null;
    } else if (typeof startDate === "string") {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid startDate format. Use YYYY-MM-DD." }, { status: 400 });
      }
      updateData.startDate = parsed;
    } else {
      return NextResponse.json({ error: "startDate must be a string (YYYY-MM-DD) or null" }, { status: 400 });
    }
  }

  if (title !== undefined) {
    if (typeof title !== "string") {
      return NextResponse.json({ error: "title must be a string" }, { status: 400 });
    }
    updateData.title = title;
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      return NextResponse.json({ error: "description must be a string" }, { status: 400 });
    }
    updateData.description = description;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updateResult = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* PlanRepositoryPort;
      return yield* repo.updatePlan(planResult.value.id, updateData);
    }).pipe(Effect.provide(AppLayer))
  );

  if (updateResult._tag === "Failure") {
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }

  // Re-fetch full read model for response
  const readModelResult = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const rm = yield* ReadModelPort;
      return yield* rm.getPlanReadModelBySlug(slug);
    }).pipe(Effect.provide(AppLayer))
  );

  if (readModelResult._tag === "Failure") {
    return NextResponse.json({ updated: true });
  }

  return NextResponse.json(serializeReadModel(readModelResult.value));
}