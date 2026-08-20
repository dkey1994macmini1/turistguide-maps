/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsMenu } from "@/app/plans/[slug]/settings-menu";

const baseProps = {
  audioEnabled: false,
  onAudioToggle: () => {},
  onSaveOffline: () => {},
  hasOfflineSnapshot: false,
  slug: "test-trip",
  startDate: null,
  onStartDateChange: () => {},
  archived: false,
  onArchiveToggle: () => {},
  heroStopId: null,
  onHeroStopChange: () => {},
  stopsWithPhotos: [],
};

describe("SettingsMenu archive", () => {
  it("archives an active plan from the settings menu", () => {
    const onArchiveToggle = vi.fn();
    render(<SettingsMenu {...baseProps} archived={false} onArchiveToggle={onArchiveToggle} />);

    fireEvent.click(screen.getByLabelText("Ustawienia"));
    fireEvent.click(screen.getByRole("button", { name: "Archiwizuj plan" }));

    expect(onArchiveToggle).toHaveBeenCalledWith(true);
  });

  it("restores an archived plan from the settings menu", () => {
    const onArchiveToggle = vi.fn();
    render(<SettingsMenu {...baseProps} archived={true} onArchiveToggle={onArchiveToggle} />);

    fireEvent.click(screen.getByLabelText("Ustawienia"));
    fireEvent.click(screen.getByRole("button", { name: "Przywróć z archiwum" }));

    expect(onArchiveToggle).toHaveBeenCalledWith(false);
  });
});

describe("SettingsMenu hero photo", () => {
  it("shows photo selector when stops have photos", () => {
    render(
      <SettingsMenu
        {...baseProps}
        heroStopId={null}
        onHeroStopChange={() => {}}
        stopsWithPhotos={[
          { id: "stop-1", title: "Radda in Chianti" },
          { id: "stop-2", title: "Siena" },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText("Ustawienia"));
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Automatyczne (pierwsze ze zdjęciem)")).toBeInTheDocument();
    expect(screen.getByText("Radda in Chianti")).toBeInTheDocument();
    expect(screen.getByText("Siena")).toBeInTheDocument();
  });

  it("hides photo selector when no stops have photos", () => {
    render(<SettingsMenu {...baseProps} stopsWithPhotos={[]} />);

    fireEvent.click(screen.getByLabelText("Ustawienia"));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("calls onHeroStopChange when selecting a stop", () => {
    const onHeroStopChange = vi.fn();
    render(
      <SettingsMenu
        {...baseProps}
        heroStopId={null}
        onHeroStopChange={onHeroStopChange}
        stopsWithPhotos={[{ id: "stop-1", title: "Radda in Chianti" }]}
      />,
    );

    fireEvent.click(screen.getByLabelText("Ustawienia"));
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "stop-1" } });

    expect(onHeroStopChange).toHaveBeenCalledWith("stop-1");
  });

  it("calls onHeroStopChange with null when selecting automatic", () => {
    const onHeroStopChange = vi.fn();
    render(
      <SettingsMenu
        {...baseProps}
        heroStopId="stop-1"
        onHeroStopChange={onHeroStopChange}
        stopsWithPhotos={[{ id: "stop-1", title: "Radda in Chianti" }]}
      />,
    );

    fireEvent.click(screen.getByLabelText("Ustawienia"));
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "" } });

    expect(onHeroStopChange).toHaveBeenCalledWith(null);
  });
});
