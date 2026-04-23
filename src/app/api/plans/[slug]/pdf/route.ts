import { NextResponse } from "next/server";
import { Effect } from "effect";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { AppLayer } from "@/composition-root";
import { serializeReadModel } from "../../../serializers";

// Resolve font directory — in production it's under .next/server, in dev under project root
const FONT_DIRS = [
  path.join(process.cwd(), "public", "pdf-fonts"),
  path.join(process.cwd(), "node_modules", "pdfkit", "js", "data"),
];

function findFontDir(): string {
  for (const dir of FONT_DIRS) {
    if (fs.existsSync(path.join(dir, "Helvetica.afm"))) return dir;
  }
  throw new Error("PDF font files not found");
}

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
  const fontDir = findFontDir();

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: plan.title,
      Author: "TuristGuide",
    },
  });

  // Register built-in fonts from resolved directory
  const fontData: Record<string, string> = {
    "Helvetica": "Helvetica.afm",
    "Helvetica-Bold": "Helvetica-Bold.afm",
    "Helvetica-Oblique": "Helvetica-Oblique.afm",
    "Helvetica-BoldOblique": "Helvetica-BoldOblique.afm",
    "Courier": "Courier.afm",
    "Courier-Bold": "Courier-Bold.afm",
    "Times-Roman": "Times-Roman.afm",
    "Times-Bold": "Times-Bold.afm",
  };
  for (const [name, file] of Object.entries(fontData)) {
    const filePath = path.join(fontDir, file);
    if (fs.existsSync(filePath)) {
      doc.registerFont(name, filePath);
    }
  }

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // --- Title ---
  doc.font("Helvetica").fontSize(22).fillColor("#2d6a4f").text(plan.title, { align: "center" });
  if (plan.description) {
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10).fillColor("#666").text(plan.description, { align: "center" });
  }
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.8);

  // --- Days & Stops ---
  for (const day of plan.days) {
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#2d6a4f").text(`Dzień ${day.dayNumber}: ${day.title || ""}`);
    if (day.description) {
      doc.font("Helvetica").fontSize(9).fillColor("#888").text(day.description);
    }
    doc.moveDown(0.4);

    for (const stop of day.stops) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#333").text(`• ${stop.title}`);
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
        doc.font("Helvetica").fontSize(9).fillColor("#666").text(`  ${details.join(" | ")}`);
      }
      if (stop.warnings && stop.warnings.length > 0) {
        doc.font("Helvetica").fontSize(8).fillColor("#c0392b").text(`  [!] ${stop.warnings.join(", ")}`);
      }
      if (stop.bring && stop.bring.length > 0) {
        doc.font("Helvetica").fontSize(8).fillColor("#888").text(`  Przynies: ${stop.bring.join(", ")}`);
      }
      // Google Maps link
      if (stop.googleMapsUrl) {
        doc.font("Helvetica").fontSize(8).fillColor("#2d6a4f").text(`  Mapa: ${stop.googleMapsUrl}`, { link: stop.googleMapsUrl });
      }
      doc.moveDown(0.3);
    }
    doc.moveDown(0.5);
  }

  // --- Footer ---
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(8).fillColor("#aaa").text(
    `Wygenerowano: ${new Date().toLocaleString("pl-PL")} | turistguide.karwackid.cloud`,
    { align: "center" }
  );

  doc.end();

  // Wait for PDF generation to complete
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