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
  summary: "Iconic volcanic crater with panoramic views of Waikiki.",
  description: "Diamond Head is a volcanic tuff cone on the Hawaiian island of Oahu. The trail to the summit climbs 560 feet and offers panoramic views of Waikiki and the Pacific Ocean. The hike takes about 45 minutes round trip and is best done early morning to avoid the heat and crowds. Bring water and sunscreen as there is no shade on the trail.",
  lat: 21.2724,
  lng: -157.8081,
  sortOrder: 0,
  links: [
    { label: "AllTrails", url: "https://alltrails.com/diamond-head" },
    { label: "NPS", url: "https://nps.gov/diamond-head" },
  ],
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=21.2724,-157.8081",
  duration: { min: 45, max: 90 },
  cost: { amount: 5, currency: "USD", note: "per person" },
  reservation: "Book online 1 day ahead",
  bring: ["Water", "Sunscreen", "Hat"],
  bestTime: "Early morning before 9 AM",
  warnings: ["No shade", "Steep stairs at summit"],
  alternative: "Koko Crater Trail for a harder workout",
};

describe("StopDetail", () => {
  it("renders stop title and summary", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    expect(screen.getByText("Diamond Head")).toBeInTheDocument();
    expect(screen.getByText("Iconic volcanic crater with panoramic views of Waikiki.")).toBeInTheDocument();
  });

  it("renders structured metadata", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    expect(screen.getByText(/45–90 min/)).toBeInTheDocument();
    expect(screen.getByText(/5 USD · per person/)).toBeInTheDocument();
    expect(screen.getByText("Book online 1 day ahead")).toBeInTheDocument();
    expect(screen.getByText("Water, Sunscreen, Hat")).toBeInTheDocument();
    expect(screen.getByText("Early morning before 9 AM")).toBeInTheDocument();
    expect(screen.getByText("No shade · Steep stairs at summit")).toBeInTheDocument();
    expect(screen.getByText("Koko Crater Trail for a harder workout")).toBeInTheDocument();
  });

  it("renders links as external anchors", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    const allTrailsLink = screen.getByText("AllTrails");
    expect(allTrailsLink).toHaveAttribute("href", "https://alltrails.com/diamond-head");
    expect(allTrailsLink).toHaveAttribute("target", "_blank");

    const npsLink = screen.getByText("NPS");
    expect(npsLink).toHaveAttribute("href", "https://nps.gov/diamond-head");
  });

  it("renders Google Maps link", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    const gmapsLink = screen.getByText("📍 Google Maps");
    expect(gmapsLink).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=21.2724,-157.8081");
    expect(gmapsLink).toHaveAttribute("target", "_blank");
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

  it("does not render duplicate Google Maps link from links array", () => {
    const withGmapsLink = {
      ...baseStop,
      links: [
        { label: "Google Maps", url: "https://www.google.com/maps/search/Los+Angeles" },
        { label: "AllTrails", url: "https://alltrails.com/diamond-head" },
      ],
    };
    render(<StopDetail stop={withGmapsLink} onClose={() => {}} />);

    const gmapsLinks = screen.queryAllByText("Google Maps");
    expect(gmapsLinks).toHaveLength(0); // filtered out from links section
    const gmapsEmoji = screen.getByText("📍 Google Maps"); // only the emoji one remains
    expect(gmapsEmoji).toBeInTheDocument();
  });

  it("does not render metadata section when no structured data", () => {
    const noMeta: StopItem = {
      ...baseStop,
      duration: null,
      cost: null,
      reservation: null,
      bring: [],
      bestTime: null,
      warnings: [],
      alternative: null,
    };
    render(<StopDetail stop={noMeta} onClose={() => {}} />);

    // No metadata icons should appear
    expect(screen.queryByText(/45–90 min/)).not.toBeInTheDocument();
    expect(screen.queryByText("Water, Sunscreen, Hat")).not.toBeInTheDocument();
  });

  it("shows Read more button when description is long", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    expect(screen.getByText("Czytaj więcej")).toBeInTheDocument();
  });

  it("renders copy description button", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    const copyBtn = screen.getByTitle("Kopiuj opis");
    expect(copyBtn).toBeInTheDocument();
    expect(copyBtn).toHaveTextContent("📋");
  });

  it("does not show Read more button when description is short", () => {
    const shortDesc = { ...baseStop, description: "Short description." };
    render(<StopDetail stop={shortDesc} onClose={() => {}} />);

    expect(screen.queryByText("Czytaj więcej")).not.toBeInTheDocument();
    // copy button still present even for short descriptions
    expect(screen.getByTitle("Kopiuj opis")).toBeInTheDocument();
  });

  it("toggles description expansion", () => {
    render(<StopDetail stop={baseStop} onClose={() => {}} />);

    const expandBtn = screen.getByText("Czytaj więcej");
    fireEvent.click(expandBtn);
    expect(screen.getByText("Zwiń")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Zwiń"));
    expect(screen.getByText("Czytaj więcej")).toBeInTheDocument();
  });

  it("hides audio management buttons when audioManagement is false", () => {
    const stopWithAudio = { ...baseStop, audioUrl: "/api/audio/stops/s1" };
    render(<StopDetail stop={stopWithAudio} onClose={() => {}} audioManagement={false} />);

    // Player should be visible (audio element with src)
    const audioEl = document.querySelector("audio");
    expect(audioEl).toBeInTheDocument();
    expect(audioEl?.getAttribute("src")).toBe("/api/audio/stops/s1");
    // Delete, regenerate, replace should be hidden
    expect(screen.queryByTitle("Usuń audio")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Regeneruj audio (TTS)")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Zastąp plik audio")).not.toBeInTheDocument();
  });

  it("hides upload button when audioManagement is false and no audio exists", () => {
    const stopNoAudio = { ...baseStop, audioUrl: null };
    render(<StopDetail stop={stopNoAudio} onClose={() => {}} audioManagement={false} />);

    // Generate audio button should still be visible
    expect(screen.getByText("🔊 Generuj audio")).toBeInTheDocument();
    // Upload button should be hidden
    expect(screen.queryByText("Dodaj plik")).not.toBeInTheDocument();
  });

  it("shows audio management buttons when audioManagement is true", () => {
    const stopWithAudio = { ...baseStop, audioUrl: "/api/audio/stops/s1" };
    render(<StopDetail stop={stopWithAudio} onClose={() => {}} audioManagement={true} />);

    expect(screen.getByTitle("Usuń audio")).toBeInTheDocument();
    expect(screen.getByTitle("Regeneruj audio (TTS)")).toBeInTheDocument();
    expect(screen.getByTitle("Zastąp plik audio")).toBeInTheDocument();
  });
});