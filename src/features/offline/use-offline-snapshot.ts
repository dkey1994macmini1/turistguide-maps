"use client";

import { useState, useCallback } from "react";
import type { PlanReadModel } from "@/types/api";
import {
  saveOfflinePlan,
  saveMapImage,
  saveAudio,
  deleteOfflinePlan,
  type OfflinePlan,
} from "./db";
import { captureMapScreenshot } from "./map-screenshot";

export type SnapshotPhase =
  | "idle"
  | "fetching"
  | "saving-data"
  | "capturing-map"
  | "downloading-audio"
  | "done"
  | "error";

export interface SnapshotProgress {
  phase: SnapshotPhase;
  /** Current item being processed (e.g., "stop-1 audio") */
  currentItem?: string;
  /** For audio: current file index */
  current?: number;
  /** For audio: total files */
  total?: number;
  error?: string;
}

/**
 * Hook that manages saving a plan offline.
 * Captures: plan data, map screenshot, optional audio files.
 */
export function useOfflineSnapshot() {
  const [progress, setProgress] = useState<SnapshotProgress>({ phase: "idle" });

  const saveSnapshot = useCallback(
    async (
      slug: string,
      options: {
        plan: PlanReadModel;
        mapContainer?: HTMLElement | null;
        includeAudio?: boolean;
      }
    ) => {
      const { plan, mapContainer, includeAudio = false } = options;

      try {
        // Phase 1: Save plan data
        setProgress({ phase: "fetching" });
        const offlineEntry: OfflinePlan = {
          slug,
          plan,
          downloadedAt: new Date().toISOString(),
          serverUpdatedAt: plan.updatedAt,
        };

        setProgress({ phase: "saving-data" });
        await saveOfflinePlan(offlineEntry);

        // Phase 2: Capture map screenshot
        setProgress({ phase: "capturing-map" });
        if (mapContainer) {
          const mapBlob = await captureMapScreenshot(mapContainer);
          if (mapBlob) {
            await saveMapImage(slug, mapBlob);
          }
        }

        // Phase 3: Download audio files (optional)
        if (includeAudio) {
          const audioStops = plan.days
            .flatMap((d) => d.stops)
            .filter((s) => s.audioUrl);

          setProgress({
            phase: "downloading-audio",
            current: 0,
            total: audioStops.length,
          });

          for (let i = 0; i < audioStops.length; i++) {
            const stop = audioStops[i];
            setProgress({
              phase: "downloading-audio",
              currentItem: stop.title,
              current: i + 1,
              total: audioStops.length,
            });

            try {
              const response = await fetch(stop.audioUrl!);
              if (response.ok) {
                const blob = await response.blob();
                await saveAudio(slug, stop.id, blob, blob.size);
              }
            } catch {
              // Skip failed audio downloads — non-critical
            }
          }
        }

        setProgress({ phase: "done" });
      } catch (err) {
        setProgress({
          phase: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    []
  );

  const removeSnapshot = useCallback(async (slug: string) => {
    await deleteOfflinePlan(slug);
    setProgress({ phase: "idle" });
  }, []);

  const reset = useCallback(() => {
    setProgress({ phase: "idle" });
  }, []);

  return { progress, saveSnapshot, removeSnapshot, reset };
}