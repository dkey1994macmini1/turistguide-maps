/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DaySwitcher } from "@/app/plans/[slug]/day-switcher";
import type { DayWithStops } from "@/types/api";

const makeDay = (overrides: Partial<DayWithStops> & { dayNumber: number }): DayWithStops => ({
  id: `day-${overrides.dayNumber}`,
  planId: "plan-1",
  title: null,
  description: null,
  stops: [],
  ...overrides,
});

describe("DaySwitcher", () => {
  it("renders nothing for single day", () => {
    const days = [makeDay({ dayNumber: 1 })];
    const { container } = render(
      <DaySwitcher days={days} activeIndex={0} onDayChange={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders tab for each day", () => {
    const days = [
      makeDay({ dayNumber: 1, title: "North Shore" }),
      makeDay({ dayNumber: 2, title: "Waikiki" }),
    ];
    render(<DaySwitcher days={days} activeIndex={0} onDayChange={() => {}} />);

    expect(screen.getByText("North Shore")).toBeInTheDocument();
    expect(screen.getByText("Waikiki")).toBeInTheDocument();
  });

  it("shows day number prefix", () => {
    const days = [makeDay({ dayNumber: 3 })];
    // Re-render with 2 days so it shows
    const twoDays = [makeDay({ dayNumber: 3 }), makeDay({ dayNumber: 4 })];
    render(<DaySwitcher days={twoDays} activeIndex={0} onDayChange={() => {}} />);

    expect(screen.getByText("D3")).toBeInTheDocument();
    expect(screen.getByText("D4")).toBeInTheDocument();
  });

  it("falls back to 'Day N' when title is null", () => {
    const days = [
      makeDay({ dayNumber: 1, title: null }),
      makeDay({ dayNumber: 2, title: null }),
    ];
    render(<DaySwitcher days={days} activeIndex={0} onDayChange={() => {}} />);

    expect(screen.getByText("Day 1")).toBeInTheDocument();
    expect(screen.getByText("Day 2")).toBeInTheDocument();
  });

  it("marks active tab with aria-selected", () => {
    const days = [
      makeDay({ dayNumber: 1 }),
      makeDay({ dayNumber: 2 }),
    ];
    render(<DaySwitcher days={days} activeIndex={1} onDayChange={() => {}} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });

  it("calls onDayChange when tab clicked", () => {
    let clickedIndex = -1;
    const days = [
      makeDay({ dayNumber: 1 }),
      makeDay({ dayNumber: 2 }),
    ];
    render(
      <DaySwitcher
        days={days}
        activeIndex={0}
        onDayChange={(i) => { clickedIndex = i; }}
      />
    );

    fireEvent.click(screen.getAllByRole("tab")[1]);
    expect(clickedIndex).toBe(1);
  });

  it("shows stop count per day", () => {
    const days = [
      makeDay({ dayNumber: 1, stops: [{ id: "s1" }, { id: "s2" }] as any }),
      makeDay({ dayNumber: 2, stops: [{ id: "s3" }] as any }),
    ];
    render(<DaySwitcher days={days} activeIndex={0} onDayChange={() => {}} />);

    // Stop counts are rendered in spans
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});