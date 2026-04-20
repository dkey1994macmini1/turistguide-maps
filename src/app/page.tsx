"use client";

import { useState, useEffect } from "react";
import type { PlanListItem } from "@/types/api";

export default function HomePage() {
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Turistguide Maps</h1>
        <p>Your travel plans, mapped</p>
      </header>

      {loading ? (
        <div className="empty-state">
          <p>Loading...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <p>No travel plans yet.</p>
          <p className="empty-hint">Seed the database to see demo data.</p>
        </div>
      ) : (
        <ul className="plan-list">
          {plans.map((plan) => (
            <li key={plan.id}>
              <a href={`/plans/${plan.slug}`} className="plan-card">
                <h2>{plan.title}</h2>
                <p>{plan.description}</p>
                <span className="plan-slug">{plan.slug}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}