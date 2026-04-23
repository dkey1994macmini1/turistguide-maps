"use client";

import { useState, useEffect } from "react";

interface OfflineBadgeProps {
  isOnline: boolean;
  hasOfflineSnapshot: boolean;
  downloadedAt: string | null;
}

export function OfflineBadge({
  isOnline,
  hasOfflineSnapshot,
  downloadedAt,
}: OfflineBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!hasOfflineSnapshot && isOnline) return null;

  const label = isOnline ? "🟢 Online" : "🔴 Offline";
  const tooltipText = isOnline
    ? downloadedAt
      ? `Online — ostatnia kopia offline: ${new Date(downloadedAt).toLocaleString("pl-PL")}`
      : "Online"
    : downloadedAt
      ? "Offline — korzystasz z zapisanej wersji"
      : "Offline — brak zapisanej wersji";

  return (
    <div
      className="offline-badge"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="offline-badge-label">{label}</span>
      {showTooltip && (
        <span className="offline-badge-tooltip">{tooltipText}</span>
      )}

      <style>{`
        .offline-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          font-size: 0.8rem;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.9);
          cursor: default;
        }
        .offline-badge-label {
          white-space: nowrap;
        }
        .offline-badge-tooltip {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 4px;
          background: #333;
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          white-space: nowrap;
          z-index: 100;
        }
      `}</style>
    </div>
  );
}