"use client";

import type { DayWithStops } from "@/types/api";

interface DaySwitcherProps {
  days: DayWithStops[];
  activeIndex: number;
  onDayChange: (index: number) => void;
}

export function DaySwitcher({ days, activeIndex, onDayChange }: DaySwitcherProps) {
  if (days.length <= 1) return null;

  return (
    <div className="day-switcher">
      <div className="day-tabs" role="tablist">
        {days.map((day, index) => (
          <button
            key={day.id}
            role="tab"
            aria-selected={index === activeIndex}
            className={`day-tab ${index === activeIndex ? "active" : ""}`}
            onClick={() => onDayChange(index)}
          >
            <span className="day-number">D{day.dayNumber}</span>
            <span className="day-title">{day.title ?? `Day ${day.dayNumber}`}</span>
            <span className="day-stop-count">{day.stops.length}</span>
          </button>
        ))}
      </div>
    </div>
  );
}