"use client";

import { useRef, useEffect } from "react";
import type { DayWithStops } from "@/types/api";

interface DaySwitcherProps {
  days: DayWithStops[];
  activeIndex: number;
  onDayChange: (index: number) => void;
  startDate: string | null;
}

export function DaySwitcher({ days, activeIndex, onDayChange, startDate }: DaySwitcherProps) {
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(".day-tab.active") as HTMLElement | null;
    if (!activeBtn) return;
    // Scroll so the active tab is at the left edge of the visible area
    const scrollLeft = activeBtn.offsetLeft - 16;
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    } else {
      container.scrollLeft = scrollLeft;
    }
  }, [activeIndex]);

  if (days.length <= 1) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (
    <div className="day-switcher">
      <div className="day-tabs" role="tablist" ref={tabsRef}>
        {days.map((day, index) => {
          const isPast = computeIsPast(day.dayNumber, startDate);
          const isActive = index === activeIndex;
          const doneCount = day.stops.filter((s) => s.visited).length;
          const totalCount = day.stops.length;
          return (
            <button
              key={day.id}
              role="tab"
              aria-selected={isActive}
              className={`day-tab ${isActive ? "active" : ""} ${isPast && !isActive ? "past" : ""}`}
              onClick={() => onDayChange(index)}
            >
              <span className={`day-number ${isPast ? "past-number" : ""}`}>D{day.dayNumber}</span>
              <span className="day-title">{day.title ?? `Day ${day.dayNumber}`}</span>
              <span className="day-stop-count">{doneCount}/{totalCount} zrob.</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function computeIsPast(dayNumber: number, startDate: string | null): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  const dayStart = new Date(start);
  dayStart.setDate(dayStart.getDate() + (dayNumber - 1));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return dayStart < now;
}