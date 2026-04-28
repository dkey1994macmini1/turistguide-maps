// Stop domain type

import type { StopId, DayId } from "./branded";
import type { StopLink } from "./stop-link";
import type { DurationRange, CostInfo } from "./stop-types";

export type Stop = {
  readonly id: StopId;
  readonly dayId: DayId;
  readonly title: string;
  readonly summary: string | null;
  readonly description: string;
  readonly lat: number;
  readonly lng: number;
  readonly sortOrder: number;
  readonly links: ReadonlyArray<StopLink>;
  // Structured stop metadata — all nullable for backward compatibility
  readonly duration: DurationRange | null;
  readonly cost: CostInfo | null;
  readonly reservation: string | null;
  readonly bring: ReadonlyArray<string>;
  readonly bestTime: string | null;
  readonly warnings: ReadonlyArray<string>;
  readonly alternative: string | null;
  readonly audioUrl: string | null;
	
};

export type StopCreateInput = {
  readonly dayId: string;
  readonly title: string;
  readonly description: string;
  readonly summary?: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly sortOrder: number;
  readonly links?: ReadonlyArray<StopLink>;
  readonly duration?: DurationRange | null;
  readonly cost?: CostInfo | null;
  readonly reservation?: string | null;
  readonly bring?: ReadonlyArray<string>;
  readonly bestTime?: string | null;
  readonly warnings?: ReadonlyArray<string>;
  readonly alternative?: string | null;
  readonly audioUrl?: string | null;
};

export type StopUpdateInput = {
  readonly title?: string;
  readonly description?: string;
  readonly summary?: string | null;
  readonly lat?: number;
  readonly lng?: number;
  readonly sortOrder?: number;
  readonly links?: ReadonlyArray<StopLink>;
  readonly duration?: DurationRange | null;
  readonly cost?: CostInfo | null;
  readonly reservation?: string | null;
  readonly bring?: ReadonlyArray<string>;
  readonly bestTime?: string | null;
  readonly warnings?: ReadonlyArray<string>;
  readonly alternative?: string | null;
  readonly audioUrl?: string | null;
};