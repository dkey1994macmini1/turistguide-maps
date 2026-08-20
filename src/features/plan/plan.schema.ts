import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  startDate: timestamp("start_date", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  heroStopId: text("hero_stop_id"),
});
