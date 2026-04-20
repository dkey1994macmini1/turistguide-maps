// Branded types for domain IDs
// Using Effect Brand to create nominal types that prevent accidental mixing of IDs

import { Brand } from "effect";

// Plan IDs
export type PlanId = string & Brand.Brand<"PlanId">;
export const PlanId = Brand.nominal<PlanId>();

// Day IDs
export type DayId = string & Brand.Brand<"DayId">;
export const DayId = Brand.nominal<DayId>();

// Stop IDs
export type StopId = string & Brand.Brand<"StopId">;
export const StopId = Brand.nominal<StopId>();

// Slug type — URL-safe plan slug
export type Slug = string & Brand.Brand<"Slug">;
export const Slug = Brand.nominal<Slug>();