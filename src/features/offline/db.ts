import { openDB, type IDBPDatabase } from "idb";
import type { PlanReadModel } from "@/types/api";

const DB_NAME = "turistguide-offline";
const DB_VERSION = 1;

export interface OfflinePlan {
  slug: string;
  plan: PlanReadModel;
  downloadedAt: string; // ISO timestamp
  serverUpdatedAt: string | null; // plan.updatedAt at time of snapshot
}

export interface OfflineAudioMeta {
  key: string; // `${slug}:${stopId}`
  slug: string;
  stopId: string;
  size: number; // bytes
  downloadedAt: string;
}

let dbInstance: IDBPDatabase | null = null;

/** Reset the cached DB instance (for testing) — closes connection first */
export async function _resetDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("plans")) {
        const planStore = db.createObjectStore("plans", { keyPath: "slug" });
        planStore.createIndex("downloadedAt", "downloadedAt");
      }
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images");
      }
      if (!db.objectStoreNames.contains("audio")) {
        db.createObjectStore("audio");
      }
      if (!db.objectStoreNames.contains("audioMeta")) {
        const audioMetaStore = db.createObjectStore("audioMeta", {
          keyPath: "key",
        });
        audioMetaStore.createIndex("slug", "slug");
      }
    },
  });

  return dbInstance;
}

/** Save a plan to offline storage */
export async function saveOfflinePlan(entry: OfflinePlan): Promise<void> {
  const db = await getDB();
  await db.put("plans", entry);
}

/** Read an offline plan by slug. Returns null if not found. */
export async function getOfflinePlan(
  slug: string
): Promise<OfflinePlan | null> {
  const db = await getDB();
  const entry = await db.get("plans", slug);
  return entry ?? null;
}

/** List all offline plan slugs with download timestamps */
export async function listOfflinePlans(): Promise<
  { slug: string; downloadedAt: string }[]
> {
  const db = await getDB();
  const all = await db.getAll("plans");
  return all.map((e: OfflinePlan) => ({
    slug: e.slug,
    downloadedAt: e.downloadedAt,
  }));
}

/** Delete an offline plan and its associated data */
export async function deleteOfflinePlan(slug: string): Promise<void> {
  const db = await getDB();
  await db.delete("plans", slug);
  await db.delete("images", slug);
  // Delete audio entries for this plan
  const tx = db.transaction("audio", "readwrite");
  const store = tx.objectStore("audio");
  let cursor = await store.openCursor();
  while (cursor) {
    const key = cursor.key as string;
    if (key.startsWith(`${slug}:`)) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  // Delete audioMeta entries
  const metaTx = db.transaction("audioMeta", "readwrite");
  const metaStore = metaTx.objectStore("audioMeta");
  const index = metaStore.index("slug");
  let metaCursor = await index.openCursor(slug);
  while (metaCursor) {
    await metaCursor.delete();
    metaCursor = await metaCursor.continue();
  }
  await metaTx.done;
}

/** Save a static map image blob for a plan */
export async function saveMapImage(slug: string, blob: Blob): Promise<void> {
  const db = await getDB();
  // Convert Blob to ArrayBuffer for reliable IDB storage
  // (fake-indexeddb in jsdom doesn't preserve Blobs)
  const buffer = await blob.arrayBuffer();
  await db.put("images", buffer, slug);
}

/** Get the static map image for a plan. Returns null if not found. */
export async function getMapImage(slug: string): Promise<Blob | null> {
  const db = await getDB();
  const stored = await db.get("images", slug);
  if (!stored) return null;
  // Use constructor name check — jsdom ArrayBuffer !== global ArrayBuffer
  // so instanceof fails across realms
  if (stored?.constructor?.name === "ArrayBuffer")
    return new Blob([stored as ArrayBuffer]);
  // Real browsers may store Blob directly
  if (typeof stored === "object" && "size" in stored) return stored as Blob;
  return null;
}

/** Save an audio blob for a stop */
export async function saveAudio(
  slug: string,
  stopId: string,
  blob: Blob,
  size?: number
): Promise<void> {
  const db = await getDB();
  const key = `${slug}:${stopId}`;
  // Convert Blob to ArrayBuffer for reliable IDB storage
  const buffer = await blob.arrayBuffer();
  await db.put("audio", buffer, key);
  await db.put("audioMeta", {
    key,
    slug,
    stopId,
    size: size ?? blob.size,
    downloadedAt: new Date().toISOString(),
  });
}

/** Get audio for a stop. Returns null if not found. */
export async function getAudio(
  slug: string,
  stopId: string
): Promise<Blob | null> {
  const db = await getDB();
  const key = `${slug}:${stopId}`;
  const stored = await db.get("audio", key);
  if (!stored) return null;
  if (stored?.constructor?.name === "ArrayBuffer")
    return new Blob([stored as ArrayBuffer]);
  // Real browsers may store Blob directly
  if (typeof stored === "object" && "size" in stored) return stored as Blob;
  return null;
}

/** Get metadata for all audio files in a plan */
export async function getAudioMetaForPlan(
  slug: string
): Promise<OfflineAudioMeta[]> {
  const db = await getDB();
  const index = db.transaction("audioMeta").objectStore("audioMeta").index("slug");
  return index.getAll(slug);
}

/** Calculate total storage used by a plan (images + audio) in bytes */
export async function getPlanStorageSize(slug: string): Promise<number> {
  const db = await getDB();
  let total = 0;
  const imageData = await db.get("images", slug);
  if (imageData) {
    // Stored as ArrayBuffer (see saveMapImage)
    total += (imageData as ArrayBuffer).byteLength;
  }
  const audioEntries = await getAudioMetaForPlan(slug);
  for (const entry of audioEntries) {
    total += entry.size;
  }
  return total;
}