"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    } else if (!isSelected && markerRef.current) {
      markerRef.current.closePopup();
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[stop.lat, stop.lng]}
      icon={createCustomIcon(label, isSelected, stop.visited)}
      eventHandlers={{
        click: () => onMarkerClick(stop.id),
      }}
    >
      <Popup>
        <strong>{stop.title}</strong>
      </Popup>
    </Marker>
  );
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

  const activeDayMarkers = activeDay?.stops.map((stop, idx) => (
    <StopMarker
      key={stop.id}
      stop={stop}
      label={String(idx + 1)}
      isSelected={stop.id === selectedStopId}
      onMarkerClick={onMarkerClick}
    />
  ));

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