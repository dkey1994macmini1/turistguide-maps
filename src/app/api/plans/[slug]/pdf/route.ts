import { NextResponse } from "next/server";
import { Effect } from "effect";
import path from "path";
import sharp from "sharp";
import PDFDocument from "pdfkit";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { AppLayer } from "@/composition-root";
import { serializeReadModel } from "../../../serializers";

const FONTS_DIR = path.join(process.cwd(), "public", "pdf-fonts");
const FONT_REGULAR = path.join(FONTS_DIR, "NotoSans-Regular.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "NotoSans-Bold.ttf");

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
};

// ─── Tile math ───

function lonToX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latToY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2
  ) * Math.pow(2, zoom);
}

async function fetchTile(z: number, x: number, y: number): Promise<Buffer> {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  return fetch(url, {
    signal: ac.signal,
    headers: { "User-Agent": "TuristGuide/1.0 (+turistguide.karwackid.cloud)" },
  })
    .then((r) => {
      clearTimeout(timer);
      if (!r.ok) throw new Error(`Tile ${z}/${x}/${y}: ${r.status}`);
      return r.arrayBuffer();
    })
    .then((ab) => Buffer.from(ab))
    .catch(() =>
      sharp({ create: { width: 256, height: 256, channels: 3, background: { r: 240, g: 240, b: 240 } } }).png().toBuffer()
    );
}

// ─── Per-day map generation ───

function chooseZoom(stops: { lat: number; lng: number }[]): number {
  if (stops.length < 2) return 12;
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  if (span > 5) return 6;
  if (span > 2) return 8;
  if (span > 0.5) return 10;
  return 12;
}

async function generateDayMap(
  stops: { lat: number; lng: number }[],
  width: number,
  height: number
): Promise<Buffer | null> {
  if (stops.length === 0) return null;

  const pad = 0.015;
  const minLat = Math.min(...stops.map((s) => s.lat)) - pad;
  const maxLat = Math.max(...stops.map((s) => s.lat)) + pad;
  const minLng = Math.min(...stops.map((s) => s.lng)) - pad;
  const maxLng = Math.max(...stops.map((s) => s.lng)) + pad;

  const zoom = chooseZoom(stops);
  const xMin = Math.floor(lonToX(minLng, zoom));
  const xMax = Math.ceil(lonToX(maxLng, zoom));
  const yMin = Math.floor(latToY(maxLat, zoom));
  const yMax = Math.ceil(latToY(minLat, zoom));
  const tileCountX = xMax - xMin;
  const tileCountY = yMax - yMin;

  // Too many tiles → use lower zoom
  if (tileCountX > 6 || tileCountY > 6) {
    return generateDayMap(stops, width, height); // won't recurse because chooseZoom returns lower
  }

  const fullW = tileCountX * 256;
  const fullH = tileCountY * 256;

  // Step 1: Fetch tiles & compose
  const tilePromises: Promise<Buffer>[] = [];
  for (let ty = yMin; ty < yMax; ty++) {
    for (let tx = xMin; tx < xMax; tx++) {
      tilePromises.push(fetchTile(zoom, tx, ty));
    }
  }
  const tileBuffers = await Promise.all(tilePromises);

  const compositeInputs: sharp.OverlayOptions[] = [];
  for (let i = 0; i < tileBuffers.length; i++) {
    const tx = xMin + (i % tileCountX);
    const ty = yMin + Math.floor(i / tileCountX);
    if (tileBuffers[i].length > 1000) {
      compositeInputs.push({ input: tileBuffers[i], left: (tx - xMin) * 256, top: (ty - yMin) * 256 });
    }
  }

  if (compositeInputs.length === 0) return null;

  const base = sharp({ create: { width: fullW, height: fullH, channels: 3, background: { r: 240, g: 240, b: 240 } } });
  base.composite(compositeInputs);
  const mapImage = await base.png().toBuffer();

  // Step 2: Resize & convert to JPEG for smaller PDF
  const resized = await sharp(mapImage).resize(width, height, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();

  // Step 3: Overlay numbered pins
  const scaleX = width / fullW;
  const scaleY = height / fullH;

  // Numbered pins: 1, 2, 3...
  const pinsSvg = stops
    .map((s, idx) => {
      const px = (lonToX(s.lng, zoom) - xMin) * 256 * scaleX;
      const py = (latToY(s.lat, zoom) - yMin) * 256 * scaleY;
      const num = idx + 1;
      return `
        <circle cx="${px}" cy="${py}" r="10" fill="#b85c3a" stroke="#fff" stroke-width="2"/>
        <text x="${px}" y="${py + 4}" fill="#fff" font-size="11" font-family="sans-serif" text-anchor="middle" font-weight="bold">${num}</text>
      `;
    })
    .join("");

  const svgOverlay = Buffer.from(`<svg width="${width}" height="${height}">${pinsSvg}</svg>`);

  return sharp(resized).composite([{ input: svgOverlay, left: 0, top: 0 }]).jpeg({ quality: 85 }).toBuffer();
}

// ─── PDF ───

function checkPageSpace(doc: typeof PDFDocument.prototype, needed: number) {
  const bottomMargin = doc.page.height - doc.page.margins.bottom - 40;
  if (doc.y + needed > bottomMargin) {
    doc.addPage();
  }
}

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

  // Pre-generate per-day maps (parallel for speed)
  const dayMapPromises = plan.days.map(async (day) => {
    const stops = day.stops
      .filter((s) => s.lat && s.lng)
      .map((s) => ({ lat: s.lat!, lng: s.lng! }));
    if (stops.length === 0) return null;
    try {
      return await generateDayMap(stops, 485, 200);
    } catch {
      return null;
    }
  });
  const dayMaps = await Promise.all(dayMapPromises);

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 60, left: 55, right: 55 },
    bufferPages: true,
    info: { Title: plan.title, Author: "TuristGuide", Creator: "TuristGuide" },
  });

  doc.registerFont("NotoSans", FONT_REGULAR);
  doc.registerFont("NotoSansBold", FONT_BOLD);
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ─── Title ───
  doc.rect(0, 0, doc.page.width, 80).fill(C.headerBg);
  doc.moveTo(0, 80).lineTo(doc.page.width, 80).strokeColor(C.divider).lineWidth(1).stroke();
  doc.font("NotoSansBold").fontSize(22).fillColor(C.text).text(plan.title, 55, 25, { align: "center", width: pageWidth });
  if (plan.description) {
    doc.moveDown(0.2);
    doc.font("NotoSans").fontSize(9).fillColor(C.muted).text(plan.description, { align: "center", width: pageWidth });
  }
  doc.y = 100;

  // ─── Days ───
  for (let dayIdx = 0; dayIdx < plan.days.length; dayIdx++) {
    const day = plan.days[dayIdx];
    const dayMap = dayMaps[dayIdx];

    // Each day starts with fresh page space (map is ~210px + header ~55px + stops)
    checkPageSpace(doc, dayMap ? 280 : 55);

    // Day header
    const dayTitle = `Dzie\u0144 ${day.dayNumber}${day.title ? `: ${day.title}` : ""}`;
    const barY = doc.y;
    doc.rect(doc.page.margins.left - 5, barY, pageWidth + 10, 22).fill(C.dayBar);
    doc.font("NotoSansBold").fontSize(11).fillColor(C.dark).text(dayTitle, doc.page.margins.left, barY + 4, { width: pageWidth });
    doc.y = barY + 28;

    if (day.description) {
      doc.font("NotoSans").fontSize(8.5).fillColor(C.muted).text(day.description, { width: pageWidth });
      doc.moveDown(0.2);
    }

    // Per-day map
    if (dayMap) {
      const mapY = doc.y;
      doc.image(dayMap, doc.page.margins.left, mapY, { width: pageWidth, height: 200 });
      doc.y = mapY + 210;
    }

    // Stops
    for (const stop of day.stops) {
      checkPageSpace(doc, 40);

      doc.font("NotoSansBold").fontSize(10).fillColor(C.text).text(stop.title);

      const parts: string[] = [];
      if (stop.summary) parts.push(stop.summary);
      if (stop.duration) {
        const d = stop.duration;
        parts.push(`${d.min}${d.max && d.max !== d.min ? `\u2013${d.max}` : ""} min`);
      }
      if (stop.cost) parts.push(`${stop.cost.amount} ${stop.cost.currency}`);
      if (stop.bestTime) parts.push(stop.bestTime);

      if (parts.length > 0) {
        doc.font("NotoSans").fontSize(8.5).fillColor(C.muted).text(parts.join("  \u00b7  "), { width: pageWidth });
      }

      if (stop.warnings?.length) {
        doc.font("NotoSans").fontSize(7.5).fillColor(C.warning).text(`\u26a0 ${stop.warnings.join(", ")}`);
      }

      if (stop.bring?.length) {
        doc.font("NotoSans").fontSize(7.5).fillColor(C.light).text(`Zabierz: ${stop.bring.join(", ")}`);
      }

      if (stop.googleMapsUrl) {
        doc.font("NotoSans").fontSize(7.5).fillColor(C.accent).text(stop.googleMapsUrl, { link: stop.googleMapsUrl });
      }

      doc.moveDown(0.15);
      doc.moveTo(doc.page.margins.left + 8, doc.y).lineTo(doc.page.margins.left + pageWidth - 8, doc.y).strokeColor("#ebebeb").lineWidth(0.3).stroke();
      doc.moveDown(0.25);
    }

    doc.moveDown(0.4);
  }

  // ─── Footer ───
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.font("NotoSans").fontSize(7).fillColor(C.light).text("turistguide.karwackid.cloud", doc.page.margins.left, doc.page.height - 35, {
      width: pageWidth, align: "center",
    });
  }

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));

  return new NextResponse(Buffer.concat(chunks), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}.pdf"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}