"use client";

import { useState } from "react";
import type { StopItem } from "@/types/api";

interface StopDetailProps {
  stop: StopItem;
  onClose: () => void;
}

function hasStructuredData(stop: StopItem): boolean {
  return !!(
    stop.duration ||
    stop.cost ||
    stop.reservation ||
    stop.bring.length > 0 ||
    stop.bestTime ||
    stop.warnings.length > 0 ||
    stop.alternative
  );
}

export function StopDetail({ stop, onClose }: StopDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(stop.audioUrl);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/stops/${stop.id}/audio`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setAudioUrl(data.audioUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAudio = async () => {
    setUploading(true);
    try {
      const res = await fetch(`/api/stops/${stop.id}/audio`, { method: "DELETE" });
      if (res.ok) {
        setAudioUrl(null);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="stop-detail">
      <div className="stop-detail-header">
        <h3>{stop.title}</h3>
        <button className="stop-detail-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* Summary — quick scan intro */}
      {stop.summary && (
        <p className="stop-detail-summary">{stop.summary}</p>
      )}

      {/* Structured metadata — quick reference */}
      {hasStructuredData(stop) && (
        <div className="stop-detail-metadata">
          {stop.duration && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">⏱</span>
              <span className="stop-meta-label">Czas</span>
              <span className="stop-meta-value">{stop.duration.min}–{stop.duration.max} min</span>
            </div>
          )}
          {stop.cost && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">💰</span>
              <span className="stop-meta-label">Koszt</span>
              <span className="stop-meta-value">
                {stop.cost.amount} {stop.cost.currency}
                {stop.cost.note ? ` · ${stop.cost.note}` : ""}
              </span>
            </div>
          )}
          {stop.reservation && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">🎫</span>
              <span className="stop-meta-label">Rezerwacja</span>
              <span className="stop-meta-value">{stop.reservation}</span>
            </div>
          )}
          {stop.bring.length > 0 && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">🎒</span>
              <span className="stop-meta-label">Zabierz</span>
              <span className="stop-meta-value">{stop.bring.join(", ")}</span>
            </div>
          )}
          {stop.bestTime && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">🌤</span>
              <span className="stop-meta-label">Najlepszy czas</span>
              <span className="stop-meta-value">{stop.bestTime}</span>
            </div>
          )}
          {stop.warnings.length > 0 && (
            <div className="stop-meta-row stop-meta-warning">
              <span className="stop-meta-icon">⚠️</span>
              <span className="stop-meta-label">Ostrzeżenia</span>
              <span className="stop-meta-value">{stop.warnings.join(" · ")}</span>
            </div>
          )}
          {stop.alternative && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">🔄</span>
              <span className="stop-meta-label">Alternatywa</span>
              <span className="stop-meta-value">{stop.alternative}</span>
            </div>
          )}
        </div>
      )}

      {/* Audio player + upload */}
      <div className="stop-detail-audio">
        {audioUrl ? (
          <div className="stop-audio-player">
            <audio controls src={audioUrl} className="stop-audio-element" />
            <button
              className="stop-audio-delete"
              onClick={handleDeleteAudio}
              disabled={uploading}
              title="Usuń audio"
            >
              🗑
            </button>
            <label className="stop-audio-replace" title="Zastąp plik audio">
              🔄
              <input
                type="file"
                accept="audio/*"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>
        ) : (
          <label className="stop-audio-upload">
            🎤 Dodaj audio
            <input
              type="file"
              accept="audio/*"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        )}
        {uploading && <span className="stop-audio-status">Przesyłanie…</span>}
      </div>

      {/* Description — TTS narrative, collapsed by default */}
      {stop.description && (
        <div className="stop-detail-description-wrapper">
          <div className={`stop-detail-description ${expanded ? "expanded" : "collapsed"}`}>
            {stop.description}
          </div>
          {stop.description.length > 200 && (
            <button
              className="stop-detail-expand"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Zwiń" : "Czytaj więcej"}
            </button>
          )}
        </div>
      )}

      {/* External links */}
      {stop.links
        .filter((link) => link.label !== "Google Maps")
        .length > 0 && (
        <div className="stop-detail-links">
          {stop.links
            .filter((link) => link.label !== "Google Maps")
            .map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="stop-detail-link"
              >
                {link.label}
              </a>
            ))}
        </div>
      )}
      <a
        href={stop.googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="stop-detail-link"
      >
        📍 Google Maps
      </a>
    </div>
  );
}