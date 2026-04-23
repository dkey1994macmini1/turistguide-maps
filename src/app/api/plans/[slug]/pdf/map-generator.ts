import sharp from "sharp";
import {
  lonToX,
  latToY,
  resolveTileBounds,
  type TileBounds,
} from "./tile-math";

const TILE_SIZE = 256;
const TILE_TIMEOUT_MS = 8000;

// ─── Tile fetching ───

async function fetchTile(z: number, x: number, y: number): Promise<Buffer> {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TILE_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "TuristGuide/1.0 (+turistguide.karwackid.cloud)" },
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`Tile ${z}/${x}/${y}: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  } catch {
    clearTimeout(timer);
    return sharp({
      create: { width: TILE_SIZE, height: TILE_SIZE, channels: 3, background: { r: 240, g: 240, b: 240 } },
    }).png().toBuffer();
  }
}

// ─── Map compositing ───

interface ComposeParams {
  bounds: TileBounds;
  width: number;
  height: number;
  pins: { lat: number; lng: number; label: number }[];
}

function composePinsSvg(pins: ComposeParams["pins"], bounds: TileBounds, width: number, height: number): string {
  const scaleX = width / (bounds.tileCountX * TILE_SIZE);
  const scaleY = height / (bounds.tileCountY * TILE_SIZE);

  const elements = pins.map(({ lat, lng, label }) => {
    const px = (lonToX(lng, bounds.zoom) - bounds.xMin) * TILE_SIZE * scaleX;
    const py = (latToY(lat, bounds.zoom) - bounds.yMin) * TILE_SIZE * scaleY;
    return `<circle cx="${px}" cy="${py}" r="10" fill="#b85c3a" stroke="#fff" stroke-width="2"/>` +
      `<text x="${px}" y="${py + 4}" fill="#fff" font-size="11" font-family="sans-serif" text-anchor="middle" font-weight="bold">${label}</text>`;
  }).join("");

  return `<svg width="${width}" height="${height}">${elements}</svg>`;
}

// ─── Public API ───

export async function generateDayMap(
  stops: { lat: number; lng: number }[],
  width: number,
  height: number,
): Promise<Buffer | null> {
  if (stops.length === 0) return null;

  const bounds = resolveTileBounds(stops);
  if (!bounds) return null;

  // Fetch all tiles in parallel
  const tilePromises: Promise<Buffer>[] = [];
  for (let ty = bounds.yMin; ty < bounds.yMax; ty++) {
    for (let tx = bounds.xMin; tx < bounds.xMax; tx++) {
      tilePromises.push(fetchTile(bounds.zoom, tx, ty));
    }
  }
  const tileBuffers = await Promise.all(tilePromises);

  // Composite tiles into full map image
  const fullW = bounds.tileCountX * TILE_SIZE;
  const fullH = bounds.tileCountY * TILE_SIZE;
  const compositeInputs: sharp.OverlayOptions[] = [];

  for (let i = 0; i < tileBuffers.length; i++) {
    const tx = bounds.xMin + (i % bounds.tileCountX);
    const ty = bounds.yMin + Math.floor(i / bounds.tileCountX);
    // Skip placeholder tiles (very small buffers)
    if (tileBuffers[i].length > 1000) {
      compositeInputs.push({
        input: tileBuffers[i],
        left: (tx - bounds.xMin) * TILE_SIZE,
        top: (ty - bounds.yMin) * TILE_SIZE,
      });
    }
  }

  if (compositeInputs.length === 0) return null;

  const base = sharp({
    create: { width: fullW, height: fullH, channels: 3, background: { r: 240, g: 240, b: 240 } },
  });
  base.composite(compositeInputs);
  const mapImage = await base.png().toBuffer();

  // Resize to target dimensions + convert to JPEG
  const resized = await sharp(mapImage)
    .resize(width, height, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  // Overlay numbered pins
  const pins = stops.map((s, idx) => ({ lat: s.lat, lng: s.lng, label: idx + 1 }));
  const svgOverlay = Buffer.from(composePinsSvg(pins, bounds, width, height));

  return sharp(resized)
    .composite([{ input: svgOverlay, left: 0, top: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer();
}