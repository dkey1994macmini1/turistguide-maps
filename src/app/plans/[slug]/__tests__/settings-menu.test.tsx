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
