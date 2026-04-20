import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { plans } from "../plan/plan.schema";

export const days = pgTable(
  "days",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    title: text("title"),
    description: text("description"),
  },
  (table) => [index("idx_days_plan_id").on(table.planId)],
);
