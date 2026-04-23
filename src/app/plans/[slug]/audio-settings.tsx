"use client";

interface AudioSettingsProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

export function AudioSettings({ enabled, onToggle }: AudioSettingsProps) {
  return (
    <div className="audio-settings">
      <label className="audio-settings-label" title={enabled ? "Zarządzanie audio włączone" : "Tylko generowanie i odtwarzanie"}>
        <span className="audio-settings-icon">⚙️</span>
        <span className="audio-settings-text">Audio</span>
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
  );
}