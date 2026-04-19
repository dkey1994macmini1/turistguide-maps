// Stop domain type

import type { StopId, DayId } from "./branded";
import type { StopLink } from "./stop-link";

export type Stop = {
  readonly id: StopId;
  readonly dayId: DayId;
  readonly title: string;
  readonly description: string;
  readonly lat: number;
  readonly lng: number;
  readonly sortOrder: number;
  readonly links: ReadonlyArray<StopLink>;
};

export type StopCreateInput = {
  readonly dayId: string;
  readonly title: string;
  readonly description: string;
  readonly lat: number;
  readonly lng: number;
  readonly sortOrder: number;
  readonly links?: ReadonlyArray<StopLink>;
};

export type StopUpdateInput = {
  readonly title?: string;
  readonly description?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly sortOrder?: number;
  readonly links?: ReadonlyArray<StopLink>;
};