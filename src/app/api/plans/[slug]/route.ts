import { NextResponse } from "next/server";
import { Effect } from "effect";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { AppLayer } from "@/composition-root";
import type { PlanReadModel as DomainPlanReadModel } from "@/core/ports/read-model-port";
import type { Plan } from "@/core/plan";


function serializePlan(p: Plan) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeReadModel(plan: DomainPlanReadModel) {
  return {
    ...serializePlan(plan),
    days: plan.days.map((day) => ({
      id: day.id,
      planId: day.planId,
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      stops: day.stops.map((stop) => ({
        id: stop.id,
        dayId: stop.dayId,
        title: stop.title,
        summary: stop.summary ?? null,
        description: stop.description,
        lat: stop.lat,
        lng: stop.lng,
        sortOrder: stop.sortOrder,
        links: stop.links.map((l) => ({ label: l.label, url: l.url })),
        googleMapsUrl: stop.googleMapsUrl,
        duration: stop.duration ?? null,
        cost: stop.cost ?? null,
        reservation: stop.reservation ?? null,
        bring: stop.bring ?? [],
        bestTime: stop.bestTime ?? null,
        warnings: stop.warnings ?? [],
        alternative: stop.alternative ?? null,
      })),
    })),
  };
}

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