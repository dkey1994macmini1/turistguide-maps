/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StopDetail } from "@/app/plans/[slug]/stop-detail";
import type { StopItem } from "@/types/api";

const baseStop: StopItem = {
  id: "s1",
  dayId: "day-1",
  title: "Diamond Head",
  description: "Iconic volcanic crater with panoramic views",
  lat: 21.2724,
  lng: -157.8081,
  sortOrder: 0,
  links: [
    { label: "AllTrails", url: "https://alltrails.com/diamond-head" },
    { label: "NPS", url: "https://nps.gov/diamond-head" },
  ],
};

describe("StopDetail", () => {
  it("renders stop title and description", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    expect(screen.getByText("Diamond Head")).toBeInTheDocument();
    expect(screen.getByText("Iconic volcanic crater with panoramic views")).toBeInTheDocument();
  });

  it("renders links as external anchors", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    const allTrailsLink = screen.getByText("AllTrails");
    expect(allTrailsLink).toHaveAttribute("href", "https://alltrails.com/diamond-head");
    expect(allTrailsLink).toHaveAttribute("target", "_blank");

    const npsLink = screen.getByText("NPS");
    expect(npsLink).toHaveAttribute("href", "https://nps.gov/diamond-head");
  });

  it("renders coordinates", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    expect(screen.getByText("21.2724, -157.8081")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    let closed = false;
    render(<StopDetail stop={baseStop} onClose={() => { closed = true; }} />);

    fireEvent.click(screen.getByLabelText("Close"));
    expect(closed).toBe(true);
  });

  it("hides links section when no links", () => {
    const noLinks = { ...baseStop, links: [] };
    render(<StopDetail stop={noLinks} onClose={() => {}} />);

    expect(screen.queryByText("AllTrails")).not.toBeInTheDocument();
  });
});