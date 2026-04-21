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