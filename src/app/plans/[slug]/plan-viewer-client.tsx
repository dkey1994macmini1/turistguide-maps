"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { PlanReadModel, DayWithStops, StopItem } from "@/types/api";
import dynamic from "next/dynamic";
import { DaySwitcher } from "./day-switcher";
import { StopList } from "./stop-list";
import { StopDetail } from "./stop-detail";
import { AudioSettings } from "./audio-settings";

// Leaflet requires browser APIs — must skip SSR
const TravelMap = dynamic(() => import("./travel-map").then((m) => ({ default: m.TravelMap })), {
  ssr: false,
  loading: () => <div className="travel-map travel-map-loading" />,
});

interface PlanViewerClientProps {
  slug: string;
}

export function PlanViewerClient({ slug }: PlanViewerClientProps) {
  const [plan, setPlan] = useState<PlanReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [audioManagement, setAudioManagement] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/plans/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setPlan(data);
        setLoading(false);
      })
      .catch(() => {
        setPlan(null);
        setLoading(false);
      });
  }, [slug]);

  const days = plan?.days ?? [];
  const activeDay: DayWithStops | null = days[activeDayIndex] ?? null;

  const selectedStop: StopItem | null = useMemo(() => {
    if (!selectedStopId || !activeDay) return null;
    return activeDay.stops.find((s) => s.id === selectedStopId) ?? null;
  }, [selectedStopId, activeDay]);

  const handleDayChange = useCallback((index: number) => {
    setActiveDayIndex(index);
    setSelectedStopId(null);
  }, []);

  const handleStopSelect = useCallback((stop: StopItem) => {
    setSelectedStopId(stop.id);
    setMapCenter([stop.lat, stop.lng]);
  }, []);

  const handleMarkerClick = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStopId(null);
  }, []);

  const dayBounds = useMemo(() => {
    if (!activeDay || activeDay.stops.length === 0) return null;
    const lats = activeDay.stops.map((s) => s.lat);
    const lngs = activeDay.stops.map((s) => s.lng);
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }, [activeDay]);

  if (loading) {
    return (
      <div className="plan-viewer">
        <header className="plan-header">
          <a href="/" className="back-link">← Plans</a>
          <h1>Loading...</h1>
        </header>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h1>Plan not found</h1>
          <p>No travel plan with slug &quot;{slug}&quot; exists.</p>
          <a href="/">← Back to plans</a>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-viewer">
      <header className="plan-header">
        <div className="plan-header-row">
          <a href="/" className="back-link">← Plans</a>
          <AudioSettings enabled={audioManagement} onToggle={setAudioManagement} />
        </div>
        <h1>{plan.title}</h1>
        <p className="plan-description">{plan.description}</p>
      </header>

      <div className="plan-body">
        <div className="map-section">
          <TravelMap
            activeDay={activeDay}
            allDays={days}
            selectedStopId={selectedStopId}
            mapCenter={mapCenter}
            dayBounds={dayBounds}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleCloseDetail}
          />
        </div>

        <div className="sidebar">
          <DaySwitcher
            days={days}
            activeIndex={activeDayIndex}
            onDayChange={handleDayChange}
          />

          {activeDay && (
            <StopList
              stops={activeDay.stops}
              selectedStopId={selectedStopId}
              onSelectStop={handleStopSelect}
            />
          )}

          {selectedStop && (
            <StopDetail stop={selectedStop} onClose={handleCloseDetail} audioManagement={audioManagement} />
          )}
        </div>
      </div>
    </div>
  );
}