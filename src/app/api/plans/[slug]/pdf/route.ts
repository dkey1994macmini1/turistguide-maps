import { NextResponse } from "next/server";
import { Effect } from "effect";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { AppLayer } from "@/composition-root";
import { serializeReadModel } from "../../../serializers";
import { renderPlanPdf } from "./pdf-layout";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      return yield* readModel.getPlanReadModelBySlug(slug);
    }).pipe(Effect.provide(AppLayer)),
  );

  if (result._tag === "Failure") {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const plan = serializeReadModel(result.value);

  const pdfBuffer = await renderPlanPdf({
    title: plan.title,
    description: plan.description,
    days: plan.days.map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      stops: day.stops.map((stop) => ({
        title: stop.title,
        summary: stop.summary ?? null,
        duration: stop.duration ?? null,
        cost: stop.cost ?? null,
        bestTime: stop.bestTime ?? null,
        warnings: stop.warnings ?? [],
        bring: stop.bring ?? [],
        googleMapsUrl: stop.googleMapsUrl,
        lat: stop.lat,
        lng: stop.lng,
      })),
    })),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}.pdf"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}