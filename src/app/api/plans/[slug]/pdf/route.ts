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

// Subtle, warm palette
const C = {
  primary: "#5a7d6a",      // muted sage green
  dark: "#3d5a4e",         // deep sage
  text: "#2c2c2c",         // near-black
  muted: "#6b6b6b",        // mid gray
  light: "#9a9a9a",        // light gray
  accent: "#7a9e8e",      // soft green
  warning: "#b85c3a",     // warm terracotta
  divider: "#d4d4d4",     // light border
  headerBg: "#f7f5f3",    // warm off-white
  dayBar: "#e8ede9",      // pale sage wash
};

// ─── Static map generation via OSM tiles + sharp ───

function lonToX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latToY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2
  ) * Math.pow(2, zoom);
}

function fetchTile(z: number, x: number, y: number): Promise<Buffer> {
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
    .catch(() => {
      // Fallback: blank white tile
      return sharp({ create: { width: 256, height: 256, channels: 3, background: { r: 240, g: 240, b: 240 } } }).png().toBuffer();
    });
}

async function generateStaticMap(
  stops: { lat: number; lng: number; title: string }[],
  width = 595,
  height = 350
): Promise<Buffer | null> {
  if (stops.length === 0) return null;

  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add padding
  const pad = 0.02;
  const cMinLat = minLat - pad;
  const cMaxLat = maxLat + pad;
  const cMinLng = minLng - pad;
  const cMaxLng = maxLng + pad;

  // Choose zoom that fits all stops
  const zoom = 10;

  // Calculate tile range
  const xMin = Math.floor(lonToX(cMinLng, zoom));
  const xMax = Math.ceil(lonToX(cMaxLng, zoom));
  const yMin = Math.floor(latToY(cMaxLat, zoom)); // Y is inverted
  const yMax = Math.ceil(latToY(cMinLat, zoom));

  const tileCountX = xMax - xMin;
  const tileCountY = yMax - yMin;

  // Limit tile count to avoid giant images
  if (tileCountX > 6 || tileCountY > 6) {
    // Too zoomed out — use center point with lower zoom
    return generateCenteredMap(stops, width, height);
  }

  // Fetch all tiles
  const tilePromises: Promise<Buffer>[] = [];
  for (let ty = yMin; ty < yMax; ty++) {
    for (let tx = xMin; tx < xMax; tx++) {
      tilePromises.push(fetchTile(zoom, tx, ty));
    }
  }
  const tileBuffers = await Promise.all(tilePromises);

  // Compose into one image
  const compositeInputs: sharp.OverlayOptions[] = [];
  for (let i = 0; i < tileBuffers.length; i++) {
    const tx = xMin + (i % tileCountX);
    const ty = yMin + Math.floor(i / tileCountX);
    const px = (tx - xMin) * 256;
    const py = (ty - yMin) * 256;
    if (tileBuffers[i].length > 1000) {
      compositeInputs.push({ input: tileBuffers[i], left: px, top: py });
    }
  }

  const fullW = tileCountX * 256;
  const fullH = tileCountY * 256;

  const base = sharp({
    create: { width: fullW, height: fullH, channels: 3, background: { r: 240, g: 240, b: 240 } },
  });

  if (compositeInputs.length > 0) {
    base.composite(compositeInputs);
  }

  // Add pin markers as SVG overlay
  const pinsSvg = stops
    .map((s) => {
      const px = (lonToX(s.lng, zoom) - xMin) * 256;
      const py = (latToY(s.lat, zoom) - yMin) * 256;
      return `<circle cx="${px}" cy="${py}" r="8" fill="#b85c3a" stroke="#fff" stroke-width="2.5"/>`;
    })
    .join("");

  const svgOverlay = Buffer.from(
    `<svg width="${fullW}" height="${fullH}">${pinsSvg}</svg>`
  );

  base.composite([{ input: svgOverlay, left: 0, top: 0 }]);

  // Crop to viewport around the stops with padding
  const cropX = Math.max(0, Math.floor((lonToX(cMinLng, zoom) - xMin) * 256 - 20));
  const cropY = Math.max(0, Math.floor((latToY(cMaxLat, zoom) - yMin) * 256 - 20));
  const cropW = Math.min(fullW - cropX, Math.ceil((lonToX(cMaxLng, zoom) - xMin) * 256 + 20 - cropX));
  const cropH = Math.min(fullH - cropY, Math.ceil((latToY(cMinLat, zoom) - yMin) * 256 + 20 - cropY));

  const result = await base
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .resize(width, height, { fit: "cover" })
    .png()
    .toBuffer();

  return result;
}

async function generateCenteredMap(
  stops: { lat: number; lng: number; title: string }[],
  width: number,
  height: number
): Promise<Buffer | null> {
  // Single-center approach for zoomed-out views
  const centerLat = stops.reduce((s, p) => s + p.lat, 0) / stops.length;
  const centerLng = stops.reduce((s, p) => s + p.lng, 0) / stops.length;
  const zoom = 6;

  const xCenter = Math.floor(lonToX(centerLng, zoom));
  const yCenter = Math.floor(latToY(centerLat, zoom));

  const xMin = xCenter - 1;
  const xMax = xCenter + 2;
  const yMin = yCenter - 1;
  const yMax = yCenter + 2;

  const tileCountX = xMax - xMin;
  const tileCountY = yMax - yMin;

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
    const px = (tx - xMin) * 256;
    const py = (ty - yMin) * 256;
    if (tileBuffers[i].length > 1000) {
      compositeInputs.push({ input: tileBuffers[i], left: px, top: py });
    }
  }

  const fullW = tileCountX * 256;
  const fullH = tileCountY * 256;

  const base = sharp({
    create: { width: fullW, height: fullH, channels: 3, background: { r: 240, g: 240, b: 240 } },
  });

  if (compositeInputs.length > 0) {
    base.composite(compositeInputs);
  }

  const pinsSvg = stops
    .map((s) => {
      const px = (lonToX(s.lng, zoom) - xMin) * 256;
      const py = (latToY(s.lat, zoom) - yMin) * 256;
      return `<circle cx="${px}" cy="${py}" r="7" fill="#b85c3a" stroke="#fff" stroke-width="2"/>`;
    })
    .join("");

  const svgOverlay = Buffer.from(
    `<svg width="${fullW}" height="${fullH}">${pinsSvg}</svg>`
  );

  base.composite([{ input: svgOverlay, left: 0, top: 0 }]);

  const result = await base
    .resize(width, height, { fit: "cover" })
    .png()
    .toBuffer();

  return result;
}

// ─── PDF generation ───

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

  // Collect all stops with coordinates for map
  const allStops: { lat: number; lng: number; title: string }[] = [];
  for (const day of plan.days) {
    for (const stop of day.stops) {
      if (stop.lat && stop.lng) {
        allStops.push({ lat: stop.lat, lng: stop.lng, title: stop.title });
      }
    }
  }

  // Generate static map (non-blocking — falls back to no-map on error)
  let mapImage: Buffer | null = null;
  try {
    mapImage = await generateStaticMap(allStops);
  } catch {
    // Continue without map
  }

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
  doc.rect(0, 0, doc.page.width, 85).fill(C.headerBg);
  doc.moveTo(0, 85).lineTo(doc.page.width, 85).strokeColor(C.divider).lineWidth(1).stroke();
  doc.font("NotoSansBold").fontSize(22).fillColor(C.text).text(plan.title, 55, 30, { align: "center", width: pageWidth });
  if (plan.description) {
    doc.moveDown(0.2);
    doc.font("NotoSans").fontSize(9).fillColor(C.muted).text(plan.description, { align: "center", width: pageWidth });
  }
  doc.y = 100;

  // ─── Map image ───
  if (mapImage) {
    checkPageSpace(doc, 260);
    doc.image(mapImage, doc.page.margins.left, doc.y, { width: pageWidth, height: 250 });
    doc.y += 260;
  }

  // ─── Days & Stops ───
  for (const day of plan.days) {
    checkPageSpace(doc, 65);

    // Day header — subtle wash
    const dayTitle = `Dzie\u0144 ${day.dayNumber}${day.title ? `: ${day.title}` : ""}`;
    const barY = doc.y;
    doc.rect(doc.page.margins.left - 5, barY, pageWidth + 10, 24).fill(C.dayBar);
    doc.font("NotoSansBold").fontSize(11).fillColor(C.dark).text(dayTitle, doc.page.margins.left, barY + 5, { width: pageWidth });
    doc.y = barY + 30;

    if (day.description) {
      doc.font("NotoSans").fontSize(8.5).fillColor(C.muted).text(day.description, { width: pageWidth });
      doc.moveDown(0.2);
    }

    for (const stop of day.stops) {
      checkPageSpace(doc, 45);

      // Stop title
      doc.font("NotoSansBold").fontSize(10).fillColor(C.text).text(stop.title);

      // Details
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

      // Separator
      doc.moveDown(0.15);
      doc.moveTo(doc.page.margins.left + 8, doc.y).lineTo(doc.page.margins.left + pageWidth - 8, doc.y).strokeColor("#ebebeb").lineWidth(0.3).stroke();
      doc.moveDown(0.3);
    }

    doc.moveDown(0.4);
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