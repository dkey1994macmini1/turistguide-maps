// Drizzle schema for plans, days, and stops tables
// Matches domain types in src/domain/

import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Plans ──

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Days ──

export const days = pgTable("days", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  title: text("title"),
  description: text("description"),
}, (table) => [
  index("idx_days_plan_id").on(table.planId),
]);

// ── Stops ──

export const stops = pgTable("stops", {
  id: text("id").primaryKey(),
  dayId: text("day_id")
    .notNull()
    .references(() => days.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  sortOrder: integer("sort_order").notNull(),
  // StopLink is a value object, stored as JSONB array
  links: jsonb("links").notNull().$type<Array<{ label: string; url: string }>>().default([]),
}, (table) => [
  index("idx_stops_day_id").on(table.dayId),
]);

// ── Relations ──

export const plansRelations = relations(plans, ({ many }) => ({
  days: many(days),
}));

export const daysRelations = relations(days, ({ one, many }) => ({
  plan: one(plans, {
    fields: [days.planId],
    references: [plans.id],
  }),
  stops: many(stops),
}));

export const stopsRelations = relations(stops, ({ one }) => ({
  day: one(days, {
    fields: [stops.dayId],
    references: [days.id],
  }),
}));

// ── DAO Types ──

export type PlanDAO = typeof plans.$inferSelect;
export type PlanInsertDAO = typeof plans.$inferInsert;

export type DayDAO = typeof days.$inferSelect;
export type DayInsertDAO = typeof days.$inferInsert;

export type StopDAO = typeof stops.$inferSelect;
export type StopInsertDAO = typeof stops.$inferInsert;