"use client";

import type { DayWithStops } from "@/types/api";

interface DaySwitcherProps {
  days: DayWithStops[];
  activeIndex: number;
  onDayChange: (index: number) => void;
  startDate: string | null;
}

export function DaySwitcher({ days, activeIndex, onDayChange, startDate }: DaySwitcherProps) {
  if (days.length <= 1) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (
    <div className="day-switcher">
      <div className="day-tabs" role="tablist">
        {days.map((day, index) => {
          const isPast = computeIsPast(day.dayNumber, startDate);
          const isActive = index === activeIndex;
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
              <span className="day-stop-count">{day.stops.length}</span>
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