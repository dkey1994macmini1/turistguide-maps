// Plan domain type

import type { PlanId, Slug } from "./branded";

export type Plan = {
  readonly id: PlanId;
  readonly slug: Slug;
  readonly title: string;
  readonly description: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type PlanCreateInput = {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
};

export type PlanUpdateInput = {
  readonly slug?: string;
  readonly title?: string;
  readonly description?: string;
};