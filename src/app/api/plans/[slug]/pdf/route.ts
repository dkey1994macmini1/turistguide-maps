import { NextResponse } from "next/server";
import { Effect } from "effect";
import PDFDocument from "pdfkit";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { AppLayer } from "@/composition-root";
import { serializeReadModel } from "../../../serializers";

// GET /api/plans/[slug]/pdf — generate a shareable PDF of the plan
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

  const plan = serializeReadModel(result.value);

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: plan.title,
      Author: "TuristGuide",
    },
  });

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // --- Title ---
  doc.fontSize(22).fillColor("#2d6a4f").text(plan.title, { align: "center" });
  if (plan.description) {
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#666").text(plan.description, { align: "center" });
  }
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.8);

  // --- Days & Stops ---
  for (const day of plan.days) {
    doc.fontSize(14).fillColor("#2d6a4f").text(`Dzien ${day.dayNumber}: ${day.title || ""}`);
    if (day.description) {
      doc.fontSize(9).fillColor("#888").text(day.description);
    }
    doc.moveDown(0.4);

    for (const stop of day.stops) {
      doc.fontSize(11).fillColor("#333").text(`- ${stop.title}`);
      const details: string[] = [];
      if (stop.summary) details.push(stop.summary);
      if (stop.duration) {
        const d = stop.duration;
        details.push(`${d.min}${d.max && d.max !== d.min ? `-${d.max}` : ""} min`);
      }
      if (stop.cost) {
        details.push(`${stop.cost.amount} ${stop.cost.currency}`);
      }
      if (stop.bestTime) details.push(stop.bestTime);
      if (details.length > 0) {
        doc.fontSize(9).fillColor("#666").text(`  ${details.join(" | ")}`);
      }
      if (stop.warnings && stop.warnings.length > 0) {
        doc.fontSize(8).fillColor("#c0392b").text(`  [!] ${stop.warnings.join(", ")}`);
      }
      if (stop.bring && stop.bring.length > 0) {
        doc.fontSize(8).fillColor("#888").text(`  Przynies: ${stop.bring.join(", ")}`);
      }
      if (stop.googleMapsUrl) {
        doc.fontSize(8).fillColor("#2d6a4f").text(`  Mapa: ${stop.googleMapsUrl}`, { link: stop.googleMapsUrl });
      }
      doc.moveDown(0.3);
    }
    doc.moveDown(0.5);
  }

  // --- Footer ---
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor("#aaa").text(
    `Wygenerowano: ${new Date().toLocaleString("pl-PL")} | turistguide.karwackid.cloud`,
    { align: "center" }
  );

  doc.end();

  await new Promise<void>((resolve) => {
    doc.on("end", resolve);
  });

  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}.pdf"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}