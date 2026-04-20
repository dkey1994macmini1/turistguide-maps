import { index, integer, jsonb, pgTable, real, text } from "drizzle-orm/pg-core";
import { days } from "../day/day.schema";

export const stops = pgTable(
  "stops",
  {
    id: text("id").primaryKey(),
    dayId: text("day_id")
      .notNull()
      .references(() => days.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    sortOrder: integer("sort_order").notNull(),
    links: jsonb("links").notNull().$type<Array<{ label: string; url: string }>>().default([]),
  },
  (table) => [index("idx_stops_day_id").on(table.dayId)],
);
