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
  lat: 21.3,
  lng: -157.8,
  sortOrder: 0,
  links: [],
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