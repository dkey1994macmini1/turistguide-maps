import { NextResponse } from "next/server";
import { Effect } from "effect";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { AppLayer } from "@/composition-root";


// GET /api/plans/[slug]/days — list days for a plan
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const planRepo = yield* PlanRepositoryPort;
      const dayRepo = yield* DayRepositoryPort;
      const plan = yield* planRepo.getPlanBySlug(slug);
      return yield* dayRepo.listDaysByPlanId(plan.id);
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to list days" }, { status: 500 });
  }

  return NextResponse.json(result.value);
}

// POST /api/plans/[slug]/days — create a day for a plan
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { dayNumber, title, description } = body as Record<string, unknown>;

  if (typeof dayNumber !== "number") {
    return NextResponse.json({ error: "dayNumber is required" }, { status: 400 });
  }

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const planRepo = yield* PlanRepositoryPort;
      const dayRepo = yield* DayRepositoryPort;
      const plan = yield* planRepo.getPlanBySlug(slug);
      return yield* dayRepo.createDay({
        planId: plan.id,
        dayNumber,
        title: typeof title === "string" ? title : undefined,
        description: typeof description === "string" ? description : undefined,
      });
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to create day" }, { status: 500 });
  }

  return NextResponse.json(result.value, { status: 201 });
}