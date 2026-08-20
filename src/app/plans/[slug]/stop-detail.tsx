"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { StopItem } from "@/types/api";
import { fetchAudioBlob, triggerFileDownload, shareAudioFile } from "@/lib/audio-download";

interface StopDetailProps {
  stop: StopItem;
  onClose: () => void;
  audioManagement?: boolean;
  slug: string;
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

export function StopDetail({ stop, onClose, audioManagement = true, slug }: StopDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(stop.audioUrl);
  const [generating, setGenerating] = useState(false);
  const [showTtsConfirm, setShowTtsConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus trap + Escape to close
  useEffect(() => {
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, a, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
      // fallback
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const result = await fetchAudioBlob(slug, stop.id, audioUrl);
      if (!result.ok || !result.blob) {
        setDownloadError(result.error ?? "Błąd pobierania");
        return;
      }
      const shared = await shareAudioFile(result.blob, result.filename!, stop.title);
      if (!shared) {
        triggerFileDownload(result.blob, result.filename!);
      }
    } catch {
      setDownloadError("Błąd podczas pobierania pliku");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="stop-detail" ref={sheetRef} role="dialog" aria-modal="true" aria-label={stop.title}>
        <div className="sheet-handle">
          <div className="sheet-handle-bar" />
        </div>

        {/* Close button — floats over content */}
        <button
          className="sheet-close-btn"
          onClick={onClose}
          aria-label="Close"
          ref={closeRef}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* Hero photo with title overlay */}
        {stop.photo && (
          <div className="sheet-hero">
            <Image
              src={stop.photo.src}
              alt={stop.photo.alt}
              width={1200}
              height={675}
              sizes="(max-width: 768px) 100vw, 480px"
              className="sheet-hero-img"
            />
            <div className="sheet-hero-overlay" />
            <div className="sheet-hero-text">
              <h3>{stop.title}</h3>
              {stop.summary && <p>{stop.summary}</p>}
            </div>
          </div>
        )}

        {/* If no photo, show title in a simple header */}
        {!stop.photo && (
          <div className="stop-detail-header">
            <h3>{stop.title}</h3>
          </div>
        )}

        {/* Photo credit */}
        {stop.photo && (
          <div className="stop-detail-photo-credit">
            Photo by{" "}
            {stop.photo.photoUrl ? (
              <>
                <a href={stop.photo.photoUrl} target="_blank" rel="noopener noreferrer">
                  {stop.photo.photographer}
                </a>{" "}
                on Pexels
              </>
            ) : (
              stop.photo.photographer
            )}
          </div>
        )}

        {/* Summary if no photo */}
        {!stop.photo && stop.summary && (
          <p className="stop-detail-summary">{stop.summary}</p>
        )}

        {/* Meta pills */}
        {hasStructuredData(stop) && (
          <div className="stop-detail-metadata">
            {stop.duration && (
              <div className="stop-meta-row">
                <span className="stop-meta-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                <span className="stop-meta-label">Czas</span>
                <span className="stop-meta-value">{stop.duration.min}–{stop.duration.max} min</span>
              </div>
            )}
            {stop.cost && (
              <div className="stop-meta-row">
                <span className="stop-meta-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </span>
                <span className="stop-meta-label">Koszt</span>
                <span className="stop-meta-value">
                  {stop.cost.amount} {stop.cost.currency}
                  {stop.cost.note ? ` · ${stop.cost.note}` : ""}
                </span>
              </div>
            )}
            {stop.reservation && (
              <div className="stop-meta-row">
                <span className="stop-meta-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                <span className="stop-meta-label">Rezerwacja</span>
                <span className="stop-meta-value">{stop.reservation}</span>
              </div>
            )}
            {stop.bring.length > 0 && (
              <div className="stop-meta-row">
                <span className="stop-meta-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                </span>
                <span className="stop-meta-label">Zabierz</span>
                <span className="stop-meta-value">{stop.bring.join(", ")}</span>
              </div>
            )}
            {stop.bestTime && (
              <div className="stop-meta-row">
                <span className="stop-meta-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                </span>
                <span className="stop-meta-label">Najlepszy czas</span>
                <span className="stop-meta-value">{stop.bestTime}</span>
              </div>
            )}
            {stop.warnings.length > 0 && (
              <div className="stop-meta-row stop-meta-warning">
                <span className="stop-meta-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </span>
                <span className="stop-meta-label">Ostrzeżenia</span>
                <span className="stop-meta-value">{stop.warnings.join(" · ")}</span>
              </div>
            )}
            {stop.alternative && (
              <div className="stop-meta-row">
                <span className="stop-meta-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                </span>
                <span className="stop-meta-label">Alternatywa</span>
                <span className="stop-meta-value">{stop.alternative}</span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
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
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                )}
                <span aria-hidden="true" style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>{copied ? "✓" : "📋"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Audio block */}
        <div className="stop-detail-audio">
          {audioUrl ? (
            <div className="stop-audio-player">
              <audio controls src={audioUrl} className="stop-audio-element" />
              <button
                className="stop-audio-download"
                onClick={handleDownload}
                disabled={downloading}
                title="Pobierz audio"
              >
                {downloading ? "⏳" : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                )}
                <span aria-hidden="true" style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>{downloading ? "⏳" : "📥"}</span>
              </button>
              {audioManagement && (
                <>
                  <button
                    className="stop-audio-delete"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={uploading || generating || downloading}
                    title="Usuń audio"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    <span aria-hidden="true" style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>🗑</span>
                  </button>
                  <button
                    className="stop-audio-regenerate"
                    onClick={() => { setTtsError(null); setShowTtsConfirm(true); }}
                    disabled={uploading || generating || downloading}
                    title="Regeneruj audio (TTS)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
                    <span aria-hidden="true" style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>🔊</span>
                  </button>
                  <label className="stop-audio-replace" title="Zastąp plik audio">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                    <span aria-hidden="true" style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>📂</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleUpload}
                      disabled={uploading || generating || downloading}
                      style={{ display: "none" }}
                    />
                  </label>
                </>
              )}
            </div>
          ) : (
            <div className="stop-audio-empty">
              <div className="stop-audio-empty-title">Brak audio</div>
              <div className="stop-audio-empty-sub">Wygeneruj audio z opisu by odtworzyć w drodze</div>
              {stop.description && (
                <button
                  className="stop-audio-generate-pill"
                  onClick={() => { setTtsError(null); setShowTtsConfirm(true); }}
                  disabled={generating}
                >
                  Generuj audio z opisu
                </button>
              )}
              {audioManagement && (
                <label className="stop-audio-upload-pill">
                  Dodaj plik
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

          {generating && <span className="stop-audio-status">Generowanie audio…</span>}
          {uploading && <span className="stop-audio-status">Przesyłanie…</span>}
          {downloading && <span className="stop-audio-status">Pobieranie…</span>}
          {downloadError && <span className="stop-audio-error">{downloadError}</span>}
          {ttsError && <span className="stop-audio-error">{ttsError}</span>}
        </div>

        {/* Links — bordered cards with pin SVG */}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Fallback Google Maps link */}
        {stop.links.length === 0 && (
          <div className="stop-detail-links">
            <a
              href={stop.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="stop-detail-link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Google Maps</span>
              <span aria-hidden="true" style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>📍 Google Maps</span>
            </a>
          </div>
        )}
      </div>
    </>
  );
}