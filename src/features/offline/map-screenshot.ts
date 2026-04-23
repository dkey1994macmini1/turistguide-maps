"use client";

/**
 * Capture a Leaflet map container as a PNG blob.
 *
 * IMPORTANT: This has a known limitation — CORS-restricted tile servers
 * (most OSM-based ones) don't set `crossOrigin` on their images, which
 * means drawing them on a canvas "taints" it. When the canvas is tainted,
 * `toBlob()` will throw a SecurityError.
 *
 * The function tries to draw tiles and falls back gracefully:
 * - If tiles have `crossOrigin="anonymous"` set (rare), they'll render.
 * - Otherwise, only markers and polylines drawn from DOM data will appear
 *   on a gray background.
 * - If canvas is completely tainted, toBlob() is wrapped in try/catch and
 *   returns null.
 *
 * For V2, consider server-side rendering via the /api/plans/[slug]/snapshot
 * endpoint to get a static map PNG without CORS issues.
 */
export async function captureMapScreenshot(
  container: HTMLElement
): Promise<Blob | null> {
  const mapContainer = container.querySelector(".leaflet-container");
  if (!mapContainer) return null;

  const rect = mapContainer.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (width === 0 || height === 0) return null;

  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fill background (Leaflet tiles may have gaps)
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, 0, width, height);

  // Draw all tile images
  // NOTE: Most tile servers don't set CORS headers, so these images
  // will taint the canvas. We draw them anyway — if the canvas becomes
  // tainted, toBlob() will fail and we return null (caught below).
  const tiles = Array.from(
    mapContainer.querySelectorAll<HTMLImageElement>(
      ".leaflet-tile-container img, .leaflet-layer img"
    )
  );

  for (const img of tiles) {
    if (!img.complete || img.naturalWidth === 0) continue;
    try {
      const imgRect = img.getBoundingClientRect();
      const x = Math.round(imgRect.left - rect.left);
      const y = Math.round(imgRect.top - rect.top);
      ctx.drawImage(img, x, y, imgRect.width, imgRect.height);
    } catch {
      // CORS-restricted tile — skip, canvas may already be tainted
      break;
    }
  }

  // Draw markers (as colored circles) — these are DOM elements, not cross-origin
  const markers = Array.from(
    mapContainer.querySelectorAll<HTMLElement>(".custom-marker")
  );
  for (const marker of markers) {
    const markerRect = marker.getBoundingClientRect();
    const x = Math.round(markerRect.left - rect.left + markerRect.width / 2);
    const y = Math.round(markerRect.top - rect.top + markerRect.height / 2);
    const radius = Math.round(Math.min(markerRect.width, markerRect.height) / 2);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = marker.classList.contains("active") ? "#2d6a4f" : "#40916c";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    const label = marker.textContent?.trim();
    if (label) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(radius * 0.9)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);
    }
  }

  // Draw polylines from SVG path data
  // These are rendered from DOM coordinates, NOT from SVG rendering,
  // so they work regardless of CORS.
  const polylines = Array.from(
    mapContainer.querySelectorAll<SVGPathElement>(".leaflet-interactive")
  );
  for (const path of polylines) {
    const points = parseSVGPath(path.getAttribute("d") || "");
    if (points.length < 2) continue;

    const svgEl = path.closest("svg");
    if (!svgEl) continue;
    const svgRect = svgEl.getBoundingClientRect();

    ctx.beginPath();
    ctx.moveTo(
      Math.round(points[0].x + svgRect.left - rect.left),
      Math.round(points[0].y + svgRect.top - rect.top)
    );
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(
        Math.round(points[i].x + svgRect.left - rect.left),
        Math.round(points[i].y + svgRect.top - rect.top)
      );
    }
    ctx.strokeStyle = "#2d6a4f";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Try to export — will throw SecurityError if canvas is tainted by CORS
  try {
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/png",
        1.0
      );
    });
  } catch {
    // Canvas is tainted by cross-origin tiles
    return null;
  }
}

/**
 * Parse SVG path "d" attribute to extract x,y points.
 * Handles M (moveto) and L (lineto) absolute commands.
 * Note: This is a simplified parser — it won't handle curves (C, S, Q, T)
 * or relative commands (m, l). For Leaflet polylines this is sufficient.
 */
function parseSVGPath(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  // Match M or L followed by x,y coordinates (absolute commands only)
  const commands = d.match(/[ML]\s*[\d.e+-]+[\s,]+[\d.e+-]+/g);
  if (!commands) return points;

  for (const cmd of commands) {
    const nums = cmd.match(/[\d.e+-]+/g);
    if (nums && nums.length >= 2) {
      points.push({ x: parseFloat(nums[0]), y: parseFloat(nums[1]) });
    }
  }
  return points;
}