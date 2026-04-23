import { NextResponse } from "next/server";
import { Effect } from "effect";
import path from "path";
import PDFDocument from "pdfkit";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { AppLayer } from "@/composition-root";
import { serializeReadModel } from "../../../serializers";

const FONTS_DIR = path.join(process.cwd(), "public", "pdf-fonts");
const FONT_REGULAR = path.join(FONTS_DIR, "NotoSans-Regular.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "NotoSans-Bold.ttf");

// Colors
const C = {
  primary: "#2d6a4f",
  dark: "#1b4332",
  text: "#333333",
  muted: "#666666",
  light: "#999999",
  accent: "#40916c",
  warning: "#c0392b",
  divider: "#cccccc",
  bgLight: "#f5faf7",
};

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
    margins: { top: 50, bottom: 60, left: 55, right: 55 },
    bufferPages: true,
    info: {
      Title: plan.title,
      Author: "TuristGuide",
      Creator: "TuristGuide",
    },
  });

  doc.registerFont("NotoSans", FONT_REGULAR);
  doc.registerFont("NotoSansBold", FONT_BOLD);
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ─── Title block ───
  doc.rect(0, 0, doc.page.width, 120).fill(C.dark);
  doc.font("NotoSansBold").fontSize(26).fillColor("#ffffff").text(plan.title, 55, 40, { align: "center", width: pageWidth });
  if (plan.description) {
    doc.moveDown(0.2);
    doc.font("NotoSans").fontSize(10).fillColor("#b7e4c7").text(plan.description, { align: "center", width: pageWidth });
  }
  doc.y = 135;

  // ─── Days & Stops ───
  for (const day of plan.days) {
    checkPageSpace(doc, 80);

    // Day header with background bar
    const dayTitle = `Dzień ${day.dayNumber}${day.title ? `: ${day.title}` : ""}`;
    const barY = doc.y;
    doc.rect(doc.page.margins.left - 10, barY, pageWidth + 20, 30).fill(C.primary);
    doc.font("NotoSansBold").fontSize(13).fillColor("#ffffff").text(dayTitle, doc.page.margins.left, barY + 8, { width: pageWidth });
    doc.y = barY + 36;

    if (day.description) {
      doc.font("NotoSans").fontSize(9).fillColor(C.muted).text(day.description, { width: pageWidth });
      doc.moveDown(0.3);
    }

    for (const stop of day.stops) {
      checkPageSpace(doc, 60);

      // Stop title
      doc.font("NotoSansBold").fontSize(11).fillColor(C.text).text(stop.title);
      const startY = doc.y;

      // Details line
      const parts: string[] = [];
      if (stop.summary) parts.push(stop.summary);
      if (stop.duration) {
        const d = stop.duration;
        parts.push(`${d.min}${d.max && d.max !== d.min ? `\u2013${d.max}` : ""} min`);
      }
      if (stop.cost) {
        parts.push(`${stop.cost.amount} ${stop.cost.currency}`);
      }
      if (stop.bestTime) parts.push(stop.bestTime);

      if (parts.length > 0) {
        doc.font("NotoSans").fontSize(9).fillColor(C.muted).text(parts.join("  \u00b7  "), { width: pageWidth });
      }

      // Warnings
      if (stop.warnings?.length) {
        doc.font("NotoSans").fontSize(8).fillColor(C.warning).text(`\u26a0 ${stop.warnings.join(", ")}`);
      }

      // What to bring
      if (stop.bring?.length) {
        doc.font("NotoSans").fontSize(8).fillColor(C.light).text(`Zabierz: ${stop.bring.join(", ")}`);
      }

      // Google Maps link
      if (stop.googleMapsUrl) {
        doc.font("NotoSans").fontSize(8).fillColor(C.accent).text(stop.googleMapsUrl, { link: stop.googleMapsUrl, underline: true });
      }

      // Light divider between stops
      doc.moveDown(0.2);
      doc.moveTo(doc.page.margins.left + 10, doc.y).lineTo(doc.page.margins.left + pageWidth - 10, doc.y).strokeColor("#e8e8e8").lineWidth(0.5).stroke();
      doc.moveDown(0.4);
    }

    doc.moveDown(0.6);
  }

  // ─── Footer on each page ───
  const totalPages = doc.bufferedPageRange();
  for (let i = 0; i < totalPages.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 35;
    doc.font("NotoSans").fontSize(7).fillColor(C.light);
    doc.text(
      `turistguide.karwackid.cloud`,
      doc.page.margins.left,
      bottom,
      { width: pageWidth, align: "center" }
    );
  }

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

function checkPageSpace(doc: typeof PDFDocument.prototype, needed: number) {
  const bottomMargin = doc.page.height - doc.page.margins.bottom - 40;
  if (doc.y + needed > bottomMargin) {
    doc.addPage();
  }
}