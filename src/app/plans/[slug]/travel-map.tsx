"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import type { DayWithStops, StopItem } from "@/types/api";

interface TravelMapProps {
  activeDay: DayWithStops | null;
  allDays: DayWithStops[];
  selectedStopId: string | null;
  mapCenter: [number, number] | null;
  dayBounds: { north: number; south: number; east: number; west: number } | null;
  onMarkerClick: (stopId: string) => void;
  onMapClick: () => void;
}

// Custom marker icon using our CSS class
function createCustomIcon(label: string, isActive: boolean, isVisited: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="custom-marker${isActive ? " active" : ""}${isVisited ? " visited" : ""}">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Component to fly to a specific position when mapCenter changes
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 0.8 });
    }
  }, [center, map]);

  return null;
}

// Component to fit bounds when active day changes
function BoundsUpdater({ bounds }: { bounds: { north: number; south: number; east: number; west: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      const leafletBounds = L.latLngBounds(
        L.latLng(bounds.south, bounds.west),
        L.latLng(bounds.north, bounds.east)
      );
      map.fitBounds(leafletBounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [bounds, map]);

  return null;
}

// Component to handle map click (deselect stop)
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: NonNullable<StopItem["photo"]>;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="photo-lightbox-backdrop" onClick={onClose}>
      <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={photo.alt} onClick={(event) => event.stopPropagation()}>
        <button ref={closeButtonRef} className="photo-lightbox-close" type="button" onClick={onClose} aria-label="Close photo viewer">
          ×
        </button>
        <img src={photo.src} alt={photo.alt} />
        <p>
          Photo by{" "}
          {photo.photoUrl ? (
            <>
              <a href={photo.photoUrl} target="_blank" rel="noopener noreferrer">
                {photo.photographer}
              </a>{" "}
              on Pexels
            </>
          ) : (
            photo.photographer
          )}
        </p>
      </div>
    </div>,
    document.body,
  );
}

// Marker that auto-opens popup when selected
function StopMarker({
  stop,
  label,
  isSelected,
  onMarkerClick,
}: {
  stop: StopItem;
  label: string;
  isSelected: boolean;
  onMarkerClick: (stopId: string) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    } else if (!isSelected && markerRef.current) {
      markerRef.current.closePopup();
    }
  }, [isSelected]);

  return (
    <>
      <Marker
        ref={markerRef}
        position={[stop.lat, stop.lng]}
        icon={createCustomIcon(label, isSelected, stop.visited)}
        eventHandlers={{
          click: () => onMarkerClick(stop.id),
        }}
      >
        <Popup>
          <div className="stop-map-popup">
            {stop.photo && (
              <figure>
                <button
                  className="stop-map-popup-photo-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsPhotoOpen(true);
                  }}
                  aria-label={`Open ${stop.photo.alt} fullscreen`}
                >
                  <img src={stop.photo.src} alt={stop.photo.alt} />
                </button>
                <figcaption>
                  Photo by{" "}
                  {stop.photo.photoUrl ? (
                    <>
                      <a href={stop.photo.photoUrl} target="_blank" rel="noopener noreferrer">
                        {stop.photo.photographer}
                      </a>{" "}
                      on Pexels
                    </>
                  ) : (
                    stop.photo.photographer
                  )}
                </figcaption>
              </figure>
            )}
            <strong>{stop.title}</strong>
            {stop.summary && <p>{stop.summary}</p>}
          </div>
        </Popup>
      </Marker>
      {isPhotoOpen && stop.photo && <PhotoLightbox photo={stop.photo} onClose={() => setIsPhotoOpen(false)} />}
    </>
  );
}

// Group stops by coordinates and offset overlapping markers so all are clickable
function offsetOverlappingStops(stops: StopItem[]): Array<{ stop: StopItem; lat: number; lng: number }> {
  const groups = new Map<string, StopItem[]>();
  for (const stop of stops) {
    const key = `${stop.lat.toFixed(6)},${stop.lng.toFixed(6)}`;
    const group = groups.get(key);
    if (group) group.push(stop);
    else groups.set(key, [stop]);
  }

  const result: Array<{ stop: StopItem; lat: number; lng: number }> = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push({ stop: group[0], lat: group[0].lat, lng: group[0].lng });
    } else {
      // Fan out overlapping markers in a small spiral
      const offset = 0.003; // ~300m
      group.forEach((stop, i) => {
        const angle = (i * 2 * Math.PI) / group.length;
        result.push({
          stop,
          lat: stop.lat + offset * Math.sin(angle),
          lng: stop.lng + offset * Math.cos(angle),
        });
      });
    }
  }
  return result;
}

export function TravelMap({
  activeDay,
  allDays,
  selectedStopId,
  mapCenter,
  dayBounds,
  onMarkerClick,
  onMapClick,
}: TravelMapProps) {
  const defaultCenter: [number, number] = [21.45, -157.97]; // Oahu center
  const defaultZoom = 11;

  const offsetStops = activeDay ? offsetOverlappingStops(activeDay.stops) : [];

  const activeDayMarkers = offsetStops.map(({ stop, lat, lng }, idx) => {
    const offsetStop = { ...stop, lat, lng };
    return (
      <StopMarker
        key={stop.id}
        stop={offsetStop}
        label={String(activeDay!.stops.findIndex((s) => s.id === stop.id) + 1)}
        isSelected={stop.id === selectedStopId}
        onMarkerClick={onMarkerClick}
      />
    );
  });

  const otherDayMarkers = allDays
    .filter((day) => day.id !== activeDay?.id)
    .flatMap((day) =>
      day.stops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={L.divIcon({
            className: "",
            html: `<div class="custom-marker" style="background:#aaa;width:18px;height:18px;font-size:8px;opacity:0.5;">•</div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          })}
          opacity={0.4}
        />
      ))
    );

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="travel-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={mapCenter} />
      <BoundsUpdater bounds={dayBounds} />
      <MapClickHandler onMapClick={onMapClick} />
      {/* Route polyline connecting stops in order */}
      {activeDay && activeDay.stops.length > 1 && (
        <Polyline
          positions={activeDay.stops.map((s) => [s.lat, s.lng] as [number, number])}
          pathOptions={{
            color: "#2d6a4f",
            weight: 3,
            opacity: 0.6,
            dashArray: "8 6",
          }}
        />
      )}
      {activeDayMarkers}
      {otherDayMarkers}
    </MapContainer>
  );
}