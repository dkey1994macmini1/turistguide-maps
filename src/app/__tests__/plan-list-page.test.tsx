/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PlanListPage } from "@/app/plan-list-page";
import type { PlanListItem } from "@/types/api";

const activePlan: PlanListItem = {
  id: "plan-1",
  slug: "tuscany",
  title: "Tuscany",
  description: "Family trip",
  startDate: null,
  archivedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const archivedPlan: PlanListItem = {
  ...activePlan,
  id: "plan-2",
  slug: "hawaii",
  title: "Hawaii",
  description: "Old trip",
  archivedAt: "2026-08-10T00:00:00.000Z",
};

describe("PlanListPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const archived = String(url).includes("archived=true");
        return Promise.resolve({
          ok: true,
          json: async () => (archived ? [archivedPlan] : [activePlan]),
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows active plans and a link to archived plans", async () => {
    render(<PlanListPage archived={false} />);

    expect(await screen.findByText("Tuscany")).toBeInTheDocument();
    expect(screen.queryByText("Hawaii")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Archiwalne plany →" })).toHaveAttribute(
      "href",
      "/plans/archived",
    );
  });

  it("does not show the archived link on the archive page", async () => {
    render(<PlanListPage archived={true} />);

    expect(await screen.findByText("Hawaii")).toBeInTheDocument();
    expect(screen.queryByText("Tuscany")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Archiwalne plany →" })).not.toBeInTheDocument();
  });

  it("removes a plan from the active list after archiving", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [activePlan],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PlanListPage archived={false} />);
    expect(await screen.findByText("Tuscany")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archiwizuj" }));

    await waitFor(() => {
      expect(screen.queryByText("Tuscany")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plans/tuscany",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      }),
    );
  });
});
