import PDFDocument from "pdfkit";
import { FONT_REGULAR, FONT_BOLD } from "./tile-math";
import { generateDayMap } from "./map-generator";

const C = {
  primary: "#5a7d6a",
  dark: "#3d5a4e",
  text: "#2c2c2c",
  muted: "#6b6b6b",
  light: "#9a9a9a",
  accent: "#7a9e8e",
  warning: "#b85c3a",
  divider: "#d4d4d4",
  headerBg: "#f7f5f3",
  dayBar: "#e8ede9",
} as const;

const MAP_WIDTH = 485;
const MAP_HEIGHT = 200;

interface PdfStop {
  title: string;
  summary: string | null;
  duration: { min: number; max: number } | null;
  cost: { amount: number; currency: string } | null;
  bestTime: string | null;
  warnings: readonly string[];
  bring: readonly string[];
  googleMapsUrl: string;
  lat: number;
  lng: number;
}

interface PdfDay {
  dayNumber: number;
  title: string | null;
  description: string | null;
  stops: PdfStop[];
}

interface PdfPlan {
  title: string;
  description: string | null;
  days: PdfDay[];
}

// ─── Footer helper (PDFKit workaround) ───

function drawFooter(doc: PDFKit.PDFDocument, pageWidth: number): void {
  // Temporarily set bottom margin to 0 to prevent PDFKit from auto-adding a page
  // when drawing near the bottom edge
  const origBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  doc
    .font("NotoSans").fontSize(7).fillColor(C.light)
    .text("turistguide.karwackid.cloud", doc.page.margins.left, doc.page.height - 35, {
      width: pageWidth,
      align: "center",
      lineBreak: false,
    });

  doc.page.margins.bottom = origBottom;
}

// ─── Pure data formatting ───

function formatStopMeta(stop: PdfStop): string {
  const parts: string[] = [];
  if (stop.summary) parts.push(stop.summary);
  if (stop.duration) {
    const { min, max } = stop.duration;
    parts.push(`${min}${max && max !== min ? `\u2013${max}` : ""} min`);
  }
  if (stop.cost) parts.push(`${stop.cost.amount} ${stop.cost.currency}`);
  if (stop.bestTime) parts.push(stop.bestTime);
  return parts.join("  \u00b7  ");
}

// ─── PDF generation ───

export async function renderPlanPdf(plan: PdfPlan): Promise<Buffer> {
  // Pre-generate per-day maps in parallel
  const dayMapPromises = plan.days.map((day) => {
    const stops = day.stops
      .filter((s) => s.lat && s.lng)
      .map((s) => ({ lat: s.lat!, lng: s.lng! }));
    if (stops.length === 0) return Promise.resolve(null);
    return generateDayMap(stops, MAP_WIDTH, MAP_HEIGHT).catch(() => null);
  });
  const dayMaps = await Promise.all(dayMapPromises);

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 60, left: 55, right: 55 },
    info: { Title: plan.title, Author: "TuristGuide", Creator: "TuristGuide" },
  });

  doc.registerFont("NotoSans", FONT_REGULAR);
  doc.registerFont("NotoSansBold", FONT_BOLD);
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom - 15;

  // ─── Title page ───
  drawFooter(doc, pageWidth);
  doc.y = 50;
  doc.rect(0, 0, doc.page.width, 80).fill(C.headerBg);
  doc.moveTo(0, 80).lineTo(doc.page.width, 80).strokeColor(C.divider).lineWidth(1).stroke();
  doc.font("NotoSansBold").fontSize(22).fillColor(C.text)
    .text(plan.title, 55, 25, { align: "center", width: pageWidth });
  if (plan.description) {
    doc.moveDown(0.2);
    doc.font("NotoSans").fontSize(9).fillColor(C.muted)
      .text(plan.description, { align: "center", width: pageWidth });
  }
  doc.y = 100;

  // ─── Days ───
  for (let dayIdx = 0; dayIdx < plan.days.length; dayIdx++) {
    const day = plan.days[dayIdx];
    const dayMap = dayMaps[dayIdx];

    // Each day starts on a fresh page
    doc.addPage();
    drawFooter(doc, pageWidth);
    doc.y = 50;

    // Day header bar
    const dayTitle = `Dzie\u0144 ${day.dayNumber}${day.title ? `: ${day.title}` : ""}`;
    const barY = doc.y;
    doc.rect(doc.page.margins.left - 5, barY, pageWidth + 10, 22).fill(C.dayBar);
    doc.font("NotoSansBold").fontSize(11).fillColor(C.dark)
      .text(dayTitle, doc.page.margins.left, barY + 4, { width: pageWidth });
    doc.y = barY + 28;

    if (day.description) {
      doc.font("NotoSans").fontSize(8.5).fillColor(C.muted).text(day.description, { width: pageWidth });
      doc.moveDown(0.2);
    }

    // Per-day map
    if (dayMap) {
      if (doc.y + MAP_HEIGHT > bottomLimit()) {
        doc.addPage();
        drawFooter(doc, pageWidth);
        doc.y = 50;
      }
      const mapY = doc.y;
      doc.image(dayMap, doc.page.margins.left, mapY, { width: pageWidth, height: MAP_HEIGHT });
      doc.y = mapY + MAP_HEIGHT + 10;
    }

    // Stops
    for (const stop of day.stops) {
      if (doc.y + 50 > bottomLimit()) {
        doc.addPage();
        drawFooter(doc, pageWidth);
        doc.y = 50;
      }

      doc.font("NotoSansBold").fontSize(10).fillColor(C.text).text(stop.title, { width: pageWidth });

      const meta = formatStopMeta(stop);
      if (meta) {
        doc.font("NotoSans").fontSize(8.5).fillColor(C.muted).text(meta, { width: pageWidth });
      }

      if (stop.warnings?.length) {
        doc.font("NotoSans").fontSize(7.5).fillColor(C.warning)
          .text(`\u26a0 ${stop.warnings.join(", ")}`);
      }

      if (stop.bring?.length) {
        doc.font("NotoSans").fontSize(7.5).fillColor(C.light)
          .text(`Zabierz: ${stop.bring.join(", ")}`);
      }

      if (stop.googleMapsUrl) {
        doc.font("NotoSans").fontSize(7.5).fillColor(C.accent)
          .text(stop.googleMapsUrl, { link: stop.googleMapsUrl });
      }

      doc.moveDown(0.15);
      doc.moveTo(doc.page.margins.left + 8, doc.y)
        .lineTo(doc.page.margins.left + pageWidth - 8, doc.y)
        .strokeColor("#ebebeb").lineWidth(0.3).stroke();
      doc.moveDown(0.25);
    }
  }

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));

  return Buffer.concat(chunks);
}