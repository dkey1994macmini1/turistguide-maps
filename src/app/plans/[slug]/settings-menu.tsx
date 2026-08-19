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
        ⚙️
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
            📲 {hasOfflineSnapshot ? "Aktualizuj offline" : "Zapisz offline"}
          </button>
          <button className="settings-menu-action" onClick={handleSharePdf}>
            📄 Udostępnij PDF
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