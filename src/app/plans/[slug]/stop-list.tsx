"use client";

import { useRef, useEffect } from "react";
import type { StopItem } from "@/types/api";

interface StopListProps {
  stops: StopItem[];
  selectedStopId: string | null;
  onSelectStop: (stop: StopItem) => void;
}

export function StopList({ stops, selectedStopId, onSelectStop }: StopListProps) {
  const selectedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (selectedStopId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedStopId]);

  if (stops.length === 0) {
    return <div className="stop-list-empty">No stops for this day.</div>;
  }

  return (
    <ul className="stop-list">
      {stops.map((stop, index) => (
        <li
          key={stop.id}
          ref={stop.id === selectedStopId ? selectedRef : undefined}
        >
          <button
            className={`stop-item ${stop.id === selectedStopId ? "selected" : ""}`}
            onClick={() => onSelectStop(stop)}
          >
            <span className="stop-order">{index + 1}</span>
            <div className="stop-item-content">
              <strong className="stop-title">{stop.title}</strong>
              {stop.summary && (
                <span className="stop-summary">{stop.summary}</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}