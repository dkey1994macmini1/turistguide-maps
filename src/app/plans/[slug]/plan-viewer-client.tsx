"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { PlanReadModel, DayWithStops, StopItem } from "@/types/api";
import { DaySwitcher } from "./day-switcher";
import { StopList } from "./stop-list";
import { StopDetail } from "./stop-detail";
import { SettingsMenu } from "./settings-menu";
import { HeroHeader } from "./hero-header";
import { MapModal } from "./map-modal";
import { OfflineDialog } from "@/features/offline/offline-dialog";
import { OfflineBadge } from "@/features/offline/offline-badge";
import { OfflineMap } from "@/features/offline/offline-map";

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
  const [showMapModal, setShowMapModal] = useState(false);
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
  const artifactUrl =
    slug === "tuscany-family-august-2026"
      ? "/artifacts/tuscany-family-august-2026/"
      : null;

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

  async function handleArchiveToggle(nextArchived: boolean) {
    try {
      const res = await fetch(`/api/plans/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: nextArchived }),
      });
      if (res.ok) {
        window.location.href = nextArchived ? "/plans/archived" : "/";
      }
    } catch {
      // ignore
    }
  }

  // Find hero photo — use first stop with photo, or plan cover if available
  const heroPhoto = useMemo(() => {
    for (const day of days) {
      for (const stop of day.stops) {
        if (stop.photo) {
          return { src: stop.photo.src, alt: stop.photo.alt };
        }
      }
    }
    return null;
  }, [days]);

  if (loading) {
    return (
      <div className="plan-viewer">
        <div className="hero-header" style={{ minHeight: "120px", background: "var(--surface)" }}>
          <div className="hero-header-content">
            <h1 style={{ color: "var(--muted)" }}>Loading...</h1>
          </div>
        </div>
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
      <HeroHeader
        title={plan.title}
        description={plan.description}
        photoSrc={heroPhoto?.src ?? null}
        photoAlt={heroPhoto?.alt}
        artifactUrl={artifactUrl}
        backHref={plan.archivedAt ? "/plans/archived" : "/"}
        backLabel={plan.archivedAt ? "Archiwalne plany" : "Plans"}
        actions={
          <>
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
              archived={plan.archivedAt !== null}
              onArchiveToggle={handleArchiveToggle}
            />
          </>
        }
      />

      <div className="plan-body">
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
      </div>

      {/* FAB Map button */}
      <button
        className="fab-map"
        onClick={() => setShowMapModal(true)}
        aria-label="Otwórz mapę"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </button>

      {/* Bottom sheet — stop detail */}
      {selectedStop && (
        <StopDetail
          stop={selectedStop}
          onClose={handleCloseDetail}
          audioManagement={audioManagement}
          slug={slug}
        />
      )}

      {/* Map modal */}
      <MapModal
        open={showMapModal}
        onClose={() => setShowMapModal(false)}
        activeDay={activeDay}
        allDays={days}
        selectedStopId={selectedStopId}
        mapCenter={mapCenter}
        dayBounds={dayBounds}
        onMarkerClick={handleMarkerClick}
        isOnline={isOnline}
        slug={slug}
        planTitle={plan.title}
        offlineMap={
          <OfflineMap slug={slug} alt={`Mapa offline — ${plan.title}`} />
        }
      />

      {/* Offline dialog */}
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