import path from "path";

// ─── Fonts ───

const FONTS_DIR = path.join(process.cwd(), "public", "pdf-fonts");
export const FONT_REGULAR = path.join(FONTS_DIR, "NotoSans-Regular.ttf");
export const FONT_BOLD = path.join(FONTS_DIR, "NotoSans-Bold.ttf");

// ─── Tile math ───

export function lonToX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

export function latToY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2
  ) * Math.pow(2, zoom);
}

export function chooseZoom(stops: { lat: number; lng: number }[]): number {
  if (stops.length < 2) return 12;
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
  );
  if (span > 5) return 6;
  if (span > 2) return 8;
  if (span > 0.5) return 10;
  return 12;
}

export interface TileBounds {
  zoom: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  tileCountX: number;
  tileCountY: number;
}

const MAX_TILES = 6;
const MAX_ATTEMPTS = 6;

/**
 * Iteratively decrease zoom until tile grid fits within MAX_TILES×MAX_TILES.
 * Returns null if no zoom level produces a small enough grid.
 */
export function resolveTileBounds(
  stops: { lat: number; lng: number }[],
  pad = 0.015,
): TileBounds | null {
  const minLat = Math.min(...stops.map((s) => s.lat)) - pad;
  const maxLat = Math.max(...stops.map((s) => s.lat)) + pad;
  const minLng = Math.min(...stops.map((s) => s.lng)) - pad;
  const maxLng = Math.max(...stops.map((s) => s.lng)) + pad;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const zoom = chooseZoom(stops) - attempt;
    const xMin = Math.floor(lonToX(minLng, zoom));
    const xMax = Math.ceil(lonToX(maxLng, zoom));
    const yMin = Math.floor(latToY(maxLat, zoom));
    const yMax = Math.ceil(latToY(minLat, zoom));
    const tileCountX = xMax - xMin;
    const tileCountY = yMax - yMin;

    if (tileCountX <= MAX_TILES && tileCountY <= MAX_TILES) {
      return { zoom, xMin, xMax, yMin, yMax, tileCountX, tileCountY };
    }
  }

  return null;
}