"use client";

import { useState, useRef, useEffect } from "react";

interface SettingsMenuProps {
  audioEnabled: boolean;
  onAudioToggle: (value: boolean) => void;
  onSaveOffline: () => void;
  hasOfflineSnapshot: boolean;
  slug: string;
  startDate: string | null;
  onStartDateChange: (date: string | null) => void;
  archived: boolean;
  onArchiveToggle: (archived: boolean) => void;
  heroStopId: string | null;
  onHeroStopChange: (stopId: string | null) => void;
  stopsWithPhotos: ReadonlyArray<{ id: string; title: string }>;
}

export function SettingsMenu({
  audioEnabled,
  onAudioToggle,
  onSaveOffline,
  hasOfflineSnapshot,
  slug,
  startDate,
  onStartDateChange,
  archived,
  onArchiveToggle,
  heroStopId,
  onHeroStopChange,
  stopsWithPhotos,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  const handleSaveOffline = () => {
    setOpen(false);
    onSaveOffline();
  };

  const handleSharePdf = () => {
    setOpen(false);
    window.open(`/api/plans/${slug}/pdf`, "_blank");
  };

  return (
    <div className="settings-menu" ref={ref}>
      <button
        className="settings-menu-icon"
        onClick={() => setOpen(!open)}
        aria-label="Ustawienia"
        title="Ustawienia"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      </button>
      {open && (
        <div className="settings-menu-dropdown">
          <label className="settings-menu-option">
            <span>Zarządzaj audio</span>
            <button
              role="switch"
              aria-checked={audioEnabled}
              className={`toggle-switch ${audioEnabled ? "toggle-on" : "toggle-off"}`}
              onClick={() => onAudioToggle(!audioEnabled)}
            >
              <span className="toggle-knob" />
            </button>
          </label>
          <hr className="settings-menu-divider" />
          <button className="settings-menu-action" onClick={handleSaveOffline}>
            {hasOfflineSnapshot ? "Aktualizuj offline" : "Zapisz offline"}
          </button>
          <button className="settings-menu-action" onClick={handleSharePdf}>
            Udostępnij PDF
          </button>
          <div className="settings-menu-option">
            <span>Data wyjazdu</span>
            <input
              type="date"
              value={startDate ?? ""}
              onChange={(e) => {
                onStartDateChange(e.target.value || null);
              }}
              className="settings-date-input"
            />
          </div>
          {stopsWithPhotos.length > 0 && (
            <>
              <hr className="settings-menu-divider" />
              <div className="settings-menu-option">
                <span>Zdjęcie nagłówka</span>
                <select
                  className="settings-date-input"
                  value={heroStopId ?? ""}
                  onChange={(e) => {
                    onHeroStopChange(e.target.value || null);
                  }}
                >
                  <option value="">Automatyczne (pierwsze ze zdjęciem)</option>
                  {stopsWithPhotos.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.title}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <hr className="settings-menu-divider" />
          <button
            className="settings-menu-action"
            onClick={() => {
              setOpen(false);
              onArchiveToggle(!archived);
            }}
          >
            {archived ? "Przywróć z archiwum" : "Archiwizuj plan"}
          </button>
        </div>
      )}
    </div>
  );
}