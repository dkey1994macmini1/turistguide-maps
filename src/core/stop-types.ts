// Shared structured types for Stop metadata
// Defined in core/ to avoid circular imports between core/stop and features/stop/stop.schema

/** Structured duration — minutes */
export type DurationRange = { min: number; max: number };

/** Structured cost */
export type CostInfo = { amount: number; currency: string; per: string };

/** Locally hosted stop photo with optional source attribution. */
export type StopPhoto = {
  src: string;
  alt: string;
  photographer: string;
  photoUrl?: string;
};