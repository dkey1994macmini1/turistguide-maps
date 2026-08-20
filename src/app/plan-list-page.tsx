"use client";

import { useState, useEffect } from "react";
import type { PlanListItem } from "@/types/api";

type PlanListPageProps = {
  archived: boolean;
};

export function PlanListPage({ archived }: PlanListPageProps) {
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = archived ? "/api/plans?archived=true" : "/api/plans";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [archived]);

  async function handleToggleArchive(plan: PlanListItem) {
    try {
      const res = await fetch(`/api/plans/${plan.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !archived }),
      });
      if (res.ok) {
        setPlans((current) => current.filter((item) => item.id !== plan.id));
      }
    } catch {
      // ignore
    }
  }

  function formatDate(startDate: string | null): string | null {
    if (!startDate) return null;
    const d = new Date(startDate);
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        {archived ? (
          <>
            <a href="/" className="back-link">
              ← Plans
            </a>
            <h1>Archiwalne plany</h1>
            <p>Zarchiwizowane wyjazdy. Można je przywrócić na główną listę.</p>
          </>
        ) : (
          <>
            <h1>Turistguide Maps</h1>
            <p>Your travel plans, mapped</p>
          </>
        )}
      </header>

      {loading ? (
        <div className="empty-state">
          <p>Loading...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <p>{archived ? "Brak zarchiwizowanych planów." : "No travel plans yet."}</p>
          {!archived && <p className="empty-hint">Seed the database to see demo data.</p>}
        </div>
      ) : (
        <ul className="plan-list">
          {plans.map((plan) => (
            <li key={plan.id} className="plan-card-item">
              <a href={`/plans/${plan.slug}`} className="plan-card">
                <h2>{plan.title}</h2>
                <p>{plan.description}</p>
                {/* Meta chips row */}
                <div className="plan-card-chips">
                  {formatDate(plan.startDate) && (
                    <span className="plan-card-chip">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {formatDate(plan.startDate)}
                    </span>
                  )}
                  {plan.archivedAt && (
                    <span className="plan-card-chip">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>
                      Archiwum
                    </span>
                  )}
                </div>
                {/* Slug — internal, hidden from view but in DOM for tests */}
                <span className="plan-slug" aria-hidden="true" style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>{plan.slug}</span>
              </a>
              <button
                type="button"
                className="plan-card-action"
                onClick={() => handleToggleArchive(plan)}
              >
                {archived ? "Przywróć" : "Archiwizuj"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!archived && (
        <p className="archive-link-row">
          <a href="/plans/archived" className="archive-link">
            Archiwalne plany →
          </a>
        </p>
      )}
    </div>
  );
}