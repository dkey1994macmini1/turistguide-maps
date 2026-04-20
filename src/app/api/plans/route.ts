import { NextResponse } from "next/server";
import { Effect } from "effect";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { AppLayer } from "@/composition-root";
import { validateSlug } from "@/core/validation";
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

// GET /api/plans — list all plans
export async function GET() {
  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* PlanRepositoryPort;
      return yield* repo.listPlans;
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to list plans" }, { status: 500 });
  }

  return NextResponse.json(result.value.map(serializePlan));
}

// POST /api/plans — create a plan
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, title, description } = body as Record<string, unknown>;

  if (typeof slug !== "string" || typeof title !== "string") {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }

  const slugResult = Effect.runSyncExit(validateSlug(slug));
  if (slugResult._tag === "Failure") {
    return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
  }

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const repo = yield* PlanRepositoryPort;
      return yield* repo.createPlan({
        slug,
        title,
        description: typeof description === "string" ? description : "",
      });
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }

  return NextResponse.json(serializePlan(result.value), { status: 201 });
}