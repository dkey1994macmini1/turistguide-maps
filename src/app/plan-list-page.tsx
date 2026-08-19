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
                <span className="plan-slug">{plan.slug}</span>
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
