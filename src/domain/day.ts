// Day domain type

import type { DayId, PlanId } from "./branded";

export type Day = {
  readonly id: DayId;
  readonly planId: PlanId;
  readonly dayNumber: number;
  readonly title: string | null;
  readonly description: string | null;
};

export type DayCreateInput = {
  readonly planId: string;
  readonly dayNumber: number;
  readonly title?: string;
  readonly description?: string;
};

export type DayUpdateInput = {
  readonly dayNumber?: number;
  readonly title?: string | null;
  readonly description?: string | null;
};