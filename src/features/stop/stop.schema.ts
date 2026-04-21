import { index, integer, jsonb, pgTable, real, text } from "drizzle-orm/pg-core";
import { days } from "../day/day.schema";
import type { DurationRange, CostInfo } from "@/core/stop-types";

export const stops = pgTable(
  "stops",
  {
    id: text("id").primaryKey(),
    dayId: text("day_id")
      .notNull()
      .references(() => days.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    summary: text("summary"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    sortOrder: integer("sort_order").notNull(),
    links: jsonb("links").notNull().$type<Array<{ label: string; url: string }>>().default([]),
    // Structured stop metadata — all nullable for backward compatibility
    duration: jsonb("duration").$type<DurationRange | null>(),
    cost: jsonb("cost").$type<CostInfo | null>(),
    reservation: text("reservation"),
    bring: jsonb("bring").$type<readonly string[]>().default([]),
    bestTime: text("best_time"),
    warnings: jsonb("warnings").$type<readonly string[]>().default([]),
    alternative: text("alternative"),
    audioUrl: text("audio_url"),
  },
  (table) => [index("idx_stops_day_id").on(table.dayId)],
);
