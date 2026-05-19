"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { PlanReadModel, DayWithStops, StopItem } from "@/types/api";
import dynamic from "next/dynamic";
import { DaySwitcher } from "./day-switcher";
import { StopList } from "./stop-list";
import { StopDetail } from "./stop-detail";
import { SettingsMenu } from "./settings-menu";
import { OfflineDialog } from "@/features/offline/offline-dialog";
import { OfflineBadge } from "@/features/offline/offline-badge";
import { OfflineMap } from "@/features/offline/offline-map";

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
  const [audioManagement, setAudioManagement] = useState(false);
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [hasOfflineSnapshot, setHasOfflineSnapshot] = useState(false);
  const [offlineDownloadedAt, setOfflineDownloadedAt] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Fetch plan from API
  useEffect(() => {
    setLoading(true);
    fetch(`/api/plans/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setPlan(data);
        setActiveDayIndex(computeDefaultDayIndex(data));
        setLoading(false);
      })
      .catch(() => {
        setPlan(null);
        setLoading(false);
      });
  }, [slug]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check offline snapshot availability
  useEffect(() => {
    import("@/features/offline/db").then(({ getOfflinePlan }) => {
      getOfflinePlan(slug).then((entry) => {
        setHasOfflineSnapshot(entry !== null);
        setOfflineDownloadedAt(entry?.downloadedAt ?? null);
      });
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

  const handleReorderStops = useCallback(
    async (items: Array<{ id: string; sortOrder: number }>) => {
      if (!plan || !activeDay) return;
      try {
        const res = await fetch("/api/stops/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (res.ok) {
          const newStops = [...activeDay.stops];
          for (const item of items) {
            const s = newStops.find((x) => x.id === item.id);
            if (s) (s as { sortOrder: number }).sortOrder = item.sortOrder;
          }
          newStops.sort((a, b) => a.sortOrder - b.sortOrder);
          setPlan({
            ...plan,
            days: plan.days.map((day) =>
              day.id === activeDay.id ? { ...day, stops: newStops } : day
            ),
          });
        }
      } catch {
        // ignore
      }
    },
    [plan, activeDay]
  );

  const handleToggleVisited = useCallback(async (stopId: string, visited: boolean) => {
    try {
      const res = await fetch(`/api/stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visited }),
      });
      if (res.ok && plan) {
        setPlan({
          ...plan,
          days: plan.days.map((day) => ({
            ...day,
            stops: day.stops.map((s) =>
              s.id === stopId ? { ...s, visited } : s
            ),
          })),
        });
      }
    } catch {
      // ignore
    }
  }, [plan]);

  const handleMarkerClick = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStopId(null);
  }, []);

  const handleOpenOfflineDialog = useCallback(() => {
    setShowOfflineDialog(true);
  }, []);

  const handleCloseOfflineDialog = useCallback(() => {
    setShowOfflineDialog(false);
    // Refresh offline snapshot status
    import("@/features/offline/db").then(({ getOfflinePlan }) => {
      getOfflinePlan(slug).then((entry) => {
        setHasOfflineSnapshot(entry !== null);
        setOfflineDownloadedAt(entry?.downloadedAt ?? null);
      });
    });
  }, [slug]);

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

  // Compute default active day — first day that hasn't passed
  function computeDefaultDayIndex(data: PlanReadModel): number {
    if (!data.startDate) return 0;
    const start = new Date(data.startDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const idx = data.days.findIndex((d) => {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + (d.dayNumber - 1));
      return dayStart >= now;
    });
    return idx >= 0 ? idx : Math.max(0, data.days.length - 1);
  }

  function computeIsPastDay(dayNumber: number, startDateStr: string | null): boolean {
    if (!startDateStr) return false;
    const start = new Date(startDateStr);
    const dayStart = new Date(start);
    dayStart.setDate(dayStart.getDate() + (dayNumber - 1));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return dayStart < now;
  }

  async function handleStartDateChange(date: string | null) {
    try {
      const res = await fetch(`/api/plans/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: date }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
        setActiveDayIndex(computeDefaultDayIndex(data));
      }
    } catch {
      // ignore
    }
  }

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
          <div className="plan-header-actions">
            <OfflineBadge
              isOnline={isOnline}
              hasOfflineSnapshot={hasOfflineSnapshot}
              downloadedAt={offlineDownloadedAt}
            />
            <SettingsMenu
              audioEnabled={audioManagement}
              onAudioToggle={setAudioManagement}
              onSaveOffline={handleOpenOfflineDialog}
              hasOfflineSnapshot={hasOfflineSnapshot}
              slug={slug}
              startDate={plan.startDate}
              onStartDateChange={handleStartDateChange}
            />
          </div>
        </div>
        <h1>{plan.title}</h1>
        {plan.description && (
          <p className="plan-description">{plan.description}</p>
        )}
      </header>

      <div className="plan-body">
        <div className="map-section" ref={mapContainerRef}>
          {isOnline ? (
            <TravelMap
              activeDay={activeDay}
              allDays={days}
              selectedStopId={selectedStopId}
              mapCenter={mapCenter}
              dayBounds={dayBounds}
              onMarkerClick={handleMarkerClick}
              onMapClick={handleCloseDetail}
            />
          ) : (
            <OfflineMap slug={slug} alt={`Mapa offline — ${plan.title}`} />
          )}
        </div>

        <div className="sidebar">
          <DaySwitcher
            days={days}
            activeIndex={activeDayIndex}
            onDayChange={handleDayChange}
            startDate={plan.startDate}
          />

          {activeDay && (
            <StopList
              stops={activeDay.stops}
              selectedStopId={selectedStopId}
              onSelectStop={handleStopSelect}
              onToggleVisited={handleToggleVisited}
              onReorder={handleReorderStops}
            />
          )}

          {selectedStop && (
            <StopDetail stop={selectedStop} onClose={handleCloseDetail} audioManagement={audioManagement} slug={slug} />
          )}
        </div>
      </div>

      {showOfflineDialog && (
        <OfflineDialog
          slug={slug}
          plan={plan}
          onClose={handleCloseOfflineDialog}
          mapContainer={mapContainerRef.current}
        />
      )}
    </div>
  );
}