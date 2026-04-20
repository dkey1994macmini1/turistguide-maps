import { relations } from "drizzle-orm";
import { plans } from "@/features/plan/plan.schema";
import { days } from "@/features/day/day.schema";
import { stops } from "@/features/stop/stop.schema";

export { plans, days, stops };

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

export type PlanDAO = typeof plans.$inferSelect;
export type PlanInsertDAO = typeof plans.$inferInsert;

export type DayDAO = typeof days.$inferSelect;
export type DayInsertDAO = typeof days.$inferInsert;

export type StopDAO = typeof stops.$inferSelect;
export type StopInsertDAO = typeof stops.$inferInsert;
