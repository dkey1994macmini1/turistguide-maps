"use client";

import { useState } from "react";
import type { StopItem } from "@/types/api";

interface StopDetailProps {
  stop: StopItem;
  onClose: () => void;
  audioManagement?: boolean;
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

export function StopDetail({ stop, onClose, audioManagement = true }: StopDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(stop.audioUrl);
  const [generating, setGenerating] = useState(false);
  const [showTtsConfirm, setShowTtsConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    setShowDeleteConfirm(false);
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

  const handleGenerateTts = async () => {
    setShowTtsConfirm(false);
    setGenerating(true);
    setTtsError(null);
    try {
      const res = await fetch(`/api/stops/${stop.id}/tts`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAudioUrl(data.audioUrl);
      } else {
        const err = await res.json();
        setTtsError(err.error || "Generowanie nie powiodło się");
      }
    } catch {
      setTtsError("Błąd połączenia z serwerem TTS");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyDescription = async () => {
    try {
      await navigator.clipboard.writeText(stop.description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — unlikely on mobile, just ignore
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

      {/* Audio player + generate + upload */}
      <div className="stop-detail-audio">
        {audioUrl ? (
          <div className="stop-audio-player">
            <audio controls src={audioUrl} className="stop-audio-element" />
            {audioManagement && (
              <>
                <button
                  className="stop-audio-delete"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={uploading || generating}
                  title="Usuń audio"
                >
                  🗑
                </button>
                <button
                  className="stop-audio-regenerate"
                  onClick={() => { setTtsError(null); setShowTtsConfirm(true); }}
                  disabled={uploading || generating}
                  title="Regeneruj audio (TTS)"
                >
                  🔊
                </button>
                <label className="stop-audio-replace" title="Zastąp plik audio">
                  📂
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleUpload}
                    disabled={uploading || generating}
                    style={{ display: "none" }}
                  />
                </label>
              </>
            )}
          </div>
        ) : (
          <div className="stop-audio-actions">
            {stop.description && (
              <button
                className="stop-audio-generate"
                onClick={() => { setTtsError(null); setShowTtsConfirm(true); }}
                disabled={generating}
              >
                🔊 Generuj audio
              </button>
            )}
            {audioManagement && (
              <label className="stop-audio-upload">
                🎤 Dodaj plik
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleUpload}
                  disabled={uploading || generating}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
        )}

        {/* TTS confirm dialog */}
        {showTtsConfirm && (
          <div className="stop-tts-confirm">
            <p className="stop-tts-confirm-text">
              {audioUrl
                ? "Regenerować audio z opisu? Istniejący plik zostanie zastąpiony."
                : "Generować audio z opisu?"}
            </p>
            <div className="stop-tts-confirm-buttons">
              <button className="stop-tts-confirm-yes" onClick={handleGenerateTts}>
                Tak, generuj
              </button>
              <button className="stop-tts-confirm-no" onClick={() => setShowTtsConfirm(false)}>
                Anuluj
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm dialog */}
        {audioManagement && showDeleteConfirm && (
          <div className="stop-tts-confirm">
            <p className="stop-tts-confirm-text">
              Usunąć plik audio? Tej operacji nie można cofnąć.
            </p>
            <div className="stop-tts-confirm-buttons">
              <button className="stop-tts-confirm-yes" onClick={handleDeleteAudio}>
                Tak, usuń
              </button>
              <button className="stop-tts-confirm-no" onClick={() => setShowDeleteConfirm(false)}>
                Anuluj
              </button>
            </div>
          </div>
        )}

        {generating && <span className="stop-audio-status">🔊 Generowanie audio…</span>}
        {uploading && <span className="stop-audio-status">Przesyłanie…</span>}
        {ttsError && <span className="stop-audio-error">{ttsError}</span>}
      </div>

      {/* Description — TTS narrative, collapsed by default */}
      {stop.description && (
        <div className="stop-detail-description-wrapper">
          <div className={`stop-detail-description ${expanded ? "expanded" : "collapsed"}`}>
            {stop.description}
          </div>
          <div className="stop-detail-actions">
            {stop.description.length > 200 ? (
              <button
                className="stop-detail-expand"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Zwiń" : "Czytaj więcej"}
              </button>
            ) : null}
            <button
              className="stop-detail-copy"
              onClick={handleCopyDescription}
              title="Kopiuj opis"
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>
      )}

      {/* All links - showing every link from stop.links */}
      {stop.links.length > 0 && (
        <div className="stop-detail-links">
          {stop.links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="stop-detail-link"
            >
              {link.label === "Google Maps" ? "📍 " : ""}{link.label}
            </a>
          ))}
        </div>
      )}

      {/* Fallback: Google Maps link generated from lat/lng when no links stored */}
      {stop.links.length === 0 && (
        <a
          href={stop.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="stop-detail-link"
        >
          📍 Google Maps
        </a>
      )}
    </div>
  );
}