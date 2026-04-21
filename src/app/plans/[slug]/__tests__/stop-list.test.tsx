/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StopList } from "@/app/plans/[slug]/stop-list";
import type { StopItem } from "@/types/api";

const makeStop = (overrides: Partial<StopItem> & { id: string; title: string }): StopItem => ({
  dayId: "day-1",
  description: "A beautiful stop",
  summary: null,
  lat: 21.3,
  lng: -157.8,
  sortOrder: 0,
  links: [],
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=21.3,-157.8",
  duration: null,
  cost: null,
  reservation: null,
  bring: [],
  bestTime: null,
  warnings: [],
  alternative: null,
  ...overrides,
});

describe("StopList", () => {
  it("shows empty message when no stops", () => {
    render(<StopList stops={[]} selectedStopId={null} onSelectStop={() => {}} />);
    expect(screen.getByText("No stops for this day.")).toBeInTheDocument();
  });

  it("renders each stop with order number", () => {
    const stops = [
      makeStop({ id: "s1", title: "Diamond Head", sortOrder: 0 }),
      makeStop({ id: "s2", title: "Hanauma Bay", sortOrder: 1 }),
    ];
    render(<StopList stops={stops} selectedStopId={null} onSelectStop={() => {}} />);

    expect(screen.getByText("Diamond Head")).toBeInTheDocument();
    expect(screen.getByText("Hanauma Bay")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows summary on card when available", () => {
    const stops = [
      makeStop({ id: "s1", title: "Diamond Head", summary: "Iconic volcanic crater" }),
    ];
    render(<StopList stops={stops} selectedStopId={null} onSelectStop={() => {}} />);

    expect(screen.getByText("Iconic volcanic crater")).toBeInTheDocument();
  });

  it("does not render summary element when summary is null", () => {
    const stops = [
      makeStop({ id: "s1", title: "Diamond Head", summary: null }),
    ];
    render(<StopList stops={stops} selectedStopId={null} onSelectStop={() => {}} />);

    // Only title should be in the card, no summary span
    const button = screen.getByRole("button");
    const summaryElements = button.querySelectorAll(".stop-summary");
    expect(summaryElements).toHaveLength(0);
  });

  it("highlights selected stop", () => {
    const stops = [
      makeStop({ id: "s1", title: "Diamond Head" }),
      makeStop({ id: "s2", title: "Hanauma Bay" }),
    ];
    render(<StopList stops={stops} selectedStopId="s2" onSelectStop={() => {}} />);

    const items = screen.getAllByRole("button");
    expect(items[0].classList.contains("selected")).toBe(false);
    expect(items[1].classList.contains("selected")).toBe(true);
  });

  it("calls onSelectStop when stop clicked", () => {
    let selected: StopItem | null = null;
    const stops = [
      makeStop({ id: "s1", title: "Diamond Head" }),
    ];
    render(
      <StopList
        stops={stops}
        selectedStopId={null}
        onSelectStop={(s) => { selected = s; }}
      />
    );

    fireEvent.click(screen.getByText("Diamond Head"));
    expect(selected).not.toBeNull();
    expect(selected!.id).toBe("s1");
  });
});