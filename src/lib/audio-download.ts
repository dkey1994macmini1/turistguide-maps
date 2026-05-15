// ── Audio download helper ──────────────────────────────────────────
// Downloads a stop's audio file as an MP3 blob, preferring offline
// storage (IndexedDB) and falling back to the server API.

import { getAudio } from "@/features/offline/db";

export interface DownloadResult {
  ok: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

/**
 * Fetch audio for a stop as a Blob.
 * Tries IndexedDB first (offline), then the server API.
 */
export async function fetchAudioBlob(
  slug: string,
  stopId: string,
  serverUrl: string | null
): Promise<DownloadResult> {
  // 1. Try IndexedDB (offline snapshot)
  try {
    const offlineBlob = await getAudio(slug, stopId);
    if (offlineBlob) {
      return { ok: true, blob: offlineBlob, filename: `${stopId}.mp3` };
    }
  } catch {
    // IDB failed — continue to server fallback
  }

  // 2. Try server API
  if (!serverUrl) {
    return { ok: false, error: "Brak dostępnego audio (offline bez zapisanej kopii)" };
  }

  try {
    const response = await fetch(serverUrl);
    if (!response.ok) {
      return { ok: false, error: `Serwer: ${response.status}` };
    }
    const blob = await response.blob();
    return { ok: true, blob, filename: `${stopId}.mp3` };
  } catch {
    return { ok: false, error: "Błąd pobierania z serwera" };
  }
}

/**
 * Trigger a file download in the browser.
 * Uses `<a download>` for maximum compatibility.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Attempt native share (best UX on mobile).
 * Falls back silently if not supported.
 */
export async function shareAudioFile(
  blob: Blob,
  filename: string,
  title: string
): Promise<boolean> {
  if (!navigator.canShare || !navigator.share) return false;

  const file = new File([blob], filename, { type: blob.type || "audio/mpeg" });
  const shareData: ShareData = {
    title,
    files: [file],
  };

  if (!navigator.canShare(shareData)) return false;

  try {
    await navigator.share(shareData);
    return true;
  } catch {
    return false;
  }
}
