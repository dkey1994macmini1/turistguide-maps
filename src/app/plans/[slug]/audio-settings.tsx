"use client";

import { useState, useRef, useEffect } from "react";

interface AudioSettingsProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

export function AudioSettings({ enabled, onToggle }: AudioSettingsProps) {
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

  return (
    <div className="audio-settings" ref={ref}>
      <button
        className="audio-settings-icon"
        onClick={() => setOpen(!open)}
        aria-label="Ustawienia audio"
        title="Ustawienia audio"
      >
        ⚙️
      </button>
      {open && (
        <div className="audio-settings-dropdown">
          <label className="audio-settings-option">
            <span>Zarządzaj audio</span>
            <button
              role="switch"
              aria-checked={enabled}
              className={`toggle-switch ${enabled ? "toggle-on" : "toggle-off"}`}
              onClick={() => onToggle(!enabled)}
            >
              <span className="toggle-knob" />
            </button>
          </label>
        </div>
      )}
    </div>
  );
}