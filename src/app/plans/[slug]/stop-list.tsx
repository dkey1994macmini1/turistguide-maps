"use client";

import { useRef, useEffect } from "react";
import type { StopItem } from "@/types/api";

interface StopListProps {
  stops: StopItem[];
  selectedStopId: string | null;
  onSelectStop: (stop: StopItem) => void;
  onToggleVisited?: (stopId: string, visited: boolean) => void;
}

export function StopList({ stops, selectedStopId, onSelectStop, onToggleVisited }: StopListProps) {
  const selectedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (selectedStopId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedStopId]);

  if (stops.length === 0) {
    return <div className="stop-list-empty">Brak przystanków na ten dzień.</div>;
  }

  return (
    <ul className="stop-list">
      {stops.map((stop, index) => (
        <li
          key={stop.id}
          ref={stop.id === selectedStopId ? selectedRef : undefined}
        >
          <button
            className={`stop-item ${stop.id === selectedStopId ? "selected" : ""} ${stop.visited ? "visited" : ""}`}
            onClick={() => onSelectStop(stop)}
          >
            <span className="stop-order">{index + 1}</span>
            <div className="stop-item-content">
              <strong className="stop-title">{stop.title}</strong>
              {stop.summary && (
                <span className="stop-summary">{stop.summary}</span>
              )}
            </div>
            <span
              className={`stop-visited-toggle${stop.visited ? " visited" : ""}`}
              title={stop.visited ? "Odznacz — nie odwiedzone" : "Zaznacz jako odwiedzone"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisited?.(stop.id, !stop.visited);
              }}
            >
              {stop.visited ? "✓" : "○"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}