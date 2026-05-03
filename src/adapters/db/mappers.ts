// Mappers: Convert DAO rows to domain objects
// Single source of truth for DAO → domain transformations

import { StopId, DayId, PlanId, Slug } from "@/core/branded";
import type { Stop } from "@/core/stop";
import type { Plan } from "@/core/plan";
import type { Day } from "@/core/day";
import type { StopLink } from "@/core/stop-link";
import type { DurationRange, CostInfo } from "@/core/stop-types";
import type { StopDAO, DayDAO, PlanDAO } from "@/common/db/schema";

export const toStop = (row: StopDAO): Stop => ({
  id: StopId(row.id),
  dayId: DayId(row.dayId),
  title: row.title,
  summary: row.summary,
  description: row.description,
  lat: row.lat,
  lng: row.lng,
  sortOrder: row.sortOrder,
  links: (row.links ?? []) as ReadonlyArray<StopLink>,
  duration: (row.duration as DurationRange) ?? null,
  cost: (row.cost as CostInfo) ?? null,
  reservation: row.reservation ?? null,
  bring: (row.bring ?? []) as ReadonlyArray<string>,
  bestTime: row.bestTime ?? null,
  warnings: (row.warnings ?? []) as ReadonlyArray<string>,
  alternative: row.alternative ?? null,
  audioUrl: row.audioUrl ?? null,
  visited: row.visited ?? false,
});

export const toDay = (row: DayDAO): Day => ({
  id: DayId(row.id),
  planId: PlanId(row.planId),
  dayNumber: row.dayNumber,
  title: row.title,
  description: row.description,
});

export const toPlan = (row: PlanDAO): Plan => ({
  id: PlanId(row.id),
  slug: Slug(row.slug),
  title: row.title,
  description: row.description,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
