"use client";

import type { StopItem } from "@/types/api";

interface StopDetailProps {
  stop: StopItem;
  onClose: () => void;
}

export function StopDetail({ stop, onClose }: StopDetailProps) {
  return (
    <div className="stop-detail">
      <div className="stop-detail-header">
        <h3>{stop.title}</h3>
        <button className="stop-detail-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p className="stop-detail-description">{stop.description}</p>
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