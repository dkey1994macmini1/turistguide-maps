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
              <span className="stop-meta-label">Time</span>
              <span className="stop-meta-value">{stop.duration.min}–{stop.duration.max} min</span>
            </div>
          )}
          {stop.cost && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">💰</span>
              <span className="stop-meta-label">Cost</span>
              <span className="stop-meta-value">
                {stop.cost.amount} {stop.cost.currency}
                {stop.cost.note ? ` · ${stop.cost.note}` : ""}
              </span>
            </div>
          )}
          {stop.reservation && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">🎫</span>
              <span className="stop-meta-label">Booking</span>
              <span className="stop-meta-value">{stop.reservation}</span>
            </div>
          )}
          {stop.bring.length > 0 && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">🎒</span>
              <span className="stop-meta-label">Bring</span>
              <span className="stop-meta-value">{stop.bring.join(", ")}</span>
            </div>
          )}
          {stop.bestTime && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">🌤</span>
              <span className="stop-meta-label">Best time</span>
              <span className="stop-meta-value">{stop.bestTime}</span>
            </div>
          )}
          {stop.warnings.length > 0 && (
            <div className="stop-meta-row stop-meta-warning">
              <span className="stop-meta-icon">⚠️</span>
              <span className="stop-meta-label">Warnings</span>
              <span className="stop-meta-value">{stop.warnings.join(" · ")}</span>
            </div>
          )}
          {stop.alternative && (
            <div className="stop-meta-row">
              <span className="stop-meta-icon">🔄</span>
              <span className="stop-meta-label">Alternative</span>
              <span className="stop-meta-value">{stop.alternative}</span>
            </div>
          )}
        </div>
      )}

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
              {expanded ? "Show less" : "Read more"}
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