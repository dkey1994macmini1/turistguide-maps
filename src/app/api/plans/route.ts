import { NextResponse } from "next/server";
import { Effect } from "effect";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { ProductionLayer, DevelopmentLayer } from "@/composition-root";

const AppLayer = process.env.NODE_ENV === "production" ? ProductionLayer : DevelopmentLayer;

export async function GET() {
  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      const plans = yield* readModel.getPlanReadModelBySlug("usa-southwest-2025");
      return plans;
    }).pipe(Effect.provide(AppLayer))
  );

  if (result._tag === "Failure") {
    // NotFoundError or other repo error — return empty plans for now
    return NextResponse.json({ plans: [] });
  }

  return NextResponse.json({ plans: [result.value] });
}