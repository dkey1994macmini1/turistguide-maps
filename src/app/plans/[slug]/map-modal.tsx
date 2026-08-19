"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { DayWithStops, StopItem } from "@/types/api";

// Leaflet requires browser APIs — must skip SSR
const TravelMap = dynamic(() => import("./travel-map").then((m) => ({ default: m.TravelMap })), {
  ssr: false,
  loading: () => <div className="travel-map travel-map-loading" />,
});

interface MapModalProps {
  open: boolean;
  onClose: () => void;
  activeDay: DayWithStops | null;
  allDays: DayWithStops[];
  selectedStopId: string | null;
  mapCenter: [number, number] | null;
  dayBounds: { north: number; south: number; east: number; west: number } | null;
  onMarkerClick: (stopId: string) => void;
  isOnline: boolean;
  slug: string;
  planTitle: string;
  offlineMap: React.ReactNode;
}

export function MapModal({
  open,
  onClose,
  activeDay,
  allDays,
  selectedStopId,
  mapCenter,
  dayBounds,
  onMarkerClick,
  isOnline,
  slug,
  planTitle,
  offlineMap,
}: MapModalProps) {
  const [bottomCardStop, setBottomCardStop] = useState<StopItem | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleMarkerClick = (stopId: string) => {
    onMarkerClick(stopId);
    // Find stop to show bottom card
    const stop = activeDay?.stops.find((s) => s.id === stopId) ?? null;
    if (stop) setBottomCardStop(stop);
  };

  const handleOpenDetail = () => {
    if (bottomCardStop) {
      onMarkerClick(bottomCardStop.id);
    }
  };

  return (
    <div className="map-modal" ref={modalRef} role="dialog" aria-modal="true" aria-label={`Mapa — ${planTitle}`}>
      <div className="map-modal-header">
        <h3>{planTitle}</h3>
        <button className="map-modal-close" onClick={onClose} aria-label="Zamknij mapę">
          ✕
        </button>
      </div>
      <div className="map-modal-body">
        {isOnline ? (
          <TravelMap
            activeDay={activeDay}
            allDays={allDays}
            selectedStopId={selectedStopId}
            mapCenter={mapCenter}
            dayBounds={dayBounds}
            onMarkerClick={handleMarkerClick}
            onMapClick={() => setBottomCardStop(null)}
          />
        ) : (
          offlineMap
        )}

        {bottomCardStop && (
          <div className="map-bottom-card">
            {bottomCardStop.photo ? (
              <Image
                src={bottomCardStop.photo.src}
                alt={bottomCardStop.photo.alt}
                width={48}
                height={48}
                className="map-bottom-card-thumb"
              />
            ) : (
              <div className="map-bottom-card-thumb" style={{ background: "var(--surface)" }} />
            )}
            <div className="map-bottom-card-content">
              <div className="map-bottom-card-title">{bottomCardStop.title}</div>
              {bottomCardStop.summary && (
                <div className="map-bottom-card-meta">{bottomCardStop.summary}</div>
              )}
            </div>
            <button className="map-bottom-card-open" onClick={handleOpenDetail}>
              Otwórz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}