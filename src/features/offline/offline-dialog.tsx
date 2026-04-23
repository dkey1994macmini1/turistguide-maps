"use client";

import { useState, useEffect } from "react";
import type { PlanReadModel } from "@/types/api";
import {
  useOfflineSnapshot,
  type SnapshotProgress,
} from "./use-offline-snapshot";

interface OfflineDialogProps {
  slug: string;
  plan: PlanReadModel;
  onClose: () => void;
  mapContainer?: HTMLElement | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function OfflineDialog({
  slug,
  plan,
  onClose,
  mapContainer,
}: OfflineDialogProps) {
  const [includeAudio, setIncludeAudio] = useState(false);
  const [audioSize, setAudioSize] = useState<number | null>(null);
  const [audioFileCount, setAudioFileCount] = useState(0);
  const { progress, saveSnapshot, reset } = useOfflineSnapshot();

  // Fetch snapshot metadata (audio sizes)
  useEffect(() => {
    fetch(`/api/plans/${slug}/snapshot`)
      .then((r) => r.json())
      .then((data) => {
        setAudioSize(data.totalAudioSize ?? 0);
        setAudioFileCount(data.audioFiles?.length ?? 0);
      })
      .catch(() => {
        // Non-critical — just don't show audio size
      });
  }, [slug]);

  const isDone = progress.phase === "done";
  const isError = progress.phase === "error";
  const isWorking = !isDone && !isError && progress.phase !== "idle";

  const handleSave = () => {
    saveSnapshot(slug, { plan, mapContainer, includeAudio });
  };

  const handleClose = () => {
    if (isDone) reset();
    onClose();
  };

  return (
    <div className="offline-dialog-overlay" onClick={handleClose}>
      <div className="offline-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>📲 Zapisz offline</h2>

        {progress.phase === "idle" && (
          <>
            <p className="offline-dialog-description">
              Zapisz cały plan na urządzenie, aby mieć dostęp bez internetu.
              Zawartość: dane planu, mapa statyczna
              {audioFileCount > 0 && ", audio (opcjonalnie)"}
            </p>

            {audioFileCount > 0 && audioSize !== null && (
              <label className="offline-dialog-checkbox">
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                />
                <span>
                  Pobierz audio ({audioFileCount}{" "}
                  {audioFileCount === 1 ? "plik" : "plików"}, ~
                  {formatBytes(audioSize)})
                </span>
              </label>
            )}

            <div className="offline-dialog-actions">
              <button className="btn btn-primary" onClick={handleSave}>
                Zapisz offline
              </button>
              <button className="btn btn-secondary" onClick={handleClose}>
                Anuluj
              </button>
            </div>
          </>
        )}

        {isWorking && (
          <div className="offline-dialog-progress">
            <ProgressBar progress={progress} />
            <p className="offline-dialog-status">
              {getStatusLabel(progress)}
            </p>
          </div>
        )}

        {isDone && (
          <div className="offline-dialog-success">
            <p className="offline-dialog-success-icon">✅</p>
            <p>Plan zapisany offline!</p>
            <p className="offline-dialog-timestamp">
              Zapisano: {new Date().toLocaleString("pl-PL")}
            </p>
            <button className="btn btn-primary" onClick={handleClose}>
              Zamknij
            </button>
          </div>
        )}

        {isError && (
          <div className="offline-dialog-error">
            <p>❌ Błąd: {progress.error}</p>
            <div className="offline-dialog-actions">
              <button className="btn btn-primary" onClick={handleSave}>
                Spróbuj ponownie
              </button>
              <button className="btn btn-secondary" onClick={handleClose}>
                Zamknij
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .offline-dialog-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .offline-dialog {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }
        .offline-dialog h2 {
          margin: 0 0 12px;
          font-size: 1.2rem;
          color: #2d6a4f;
        }
        .offline-dialog-description {
          color: #555;
          font-size: 0.9rem;
          margin-bottom: 16px;
        }
        .offline-dialog-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .offline-dialog-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #2d6a4f;
        }
        .offline-dialog-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .offline-dialog-progress {
          text-align: center;
        }
        .offline-dialog-status {
          font-size: 0.9rem;
          color: #555;
          margin-top: 8px;
        }
        .offline-dialog-success {
          text-align: center;
        }
        .offline-dialog-success-icon {
          font-size: 2rem;
          margin: 0 0 8px;
        }
        .offline-dialog-timestamp {
          font-size: 0.85rem;
          color: #888;
        }
        .offline-dialog-error {
          text-align: center;
        }
        .offline-dialog-error p {
          color: #c0392b;
          margin-bottom: 16px;
        }
        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 16px;
        }
        .progress-bar-fill {
          height: 100%;
          background: #2d6a4f;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
}

function ProgressBar({ progress }: { progress: SnapshotProgress }) {
  const percent =
    progress.phase === "downloading-audio" && progress.total
      ? Math.round(((progress.current ?? 0) / progress.total) * 100)
      : progress.phase === "fetching"
        ? 10
        : progress.phase === "saving-data"
          ? 30
          : progress.phase === "capturing-map"
            ? 60
            : 80;

  return (
    <div className="progress-bar-container">
      <div
        className="progress-bar-fill"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function getStatusLabel(progress: SnapshotProgress): string {
  switch (progress.phase) {
    case "fetching":
      return "Pobieranie danych planu...";
    case "saving-data":
      return "Zapisywanie danych...";
    case "capturing-map":
      return "Przechwytywanie mapy...";
    case "downloading-audio":
      return `Pobieranie audio (${progress.current}/${progress.total})${
        progress.currentItem ? ` — ${progress.currentItem}` : ""
      }`;
    default:
      return "Przetwarzanie...";
  }
}