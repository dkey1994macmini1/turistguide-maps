// Seed script — populates the database with Oahu demo data

import { Effect } from "effect";
import { createDbClient } from "../src/adapters/db/client";
import { createPlan } from "../src/adapters/db/plan-repository";
import { createDay } from "../src/adapters/db/day-repository";
import { createStop } from "../src/adapters/db/stop-repository";
import { oahuPlan, oahuDays, oahuStopsByDay } from "../src/adapters/db/seed-data";
import { PlanId } from "../src/domain/branded";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = await Effect.runPromise(createDbClient(databaseUrl));

  console.log("🌱 Seeding database...");

  // Create the plan
  const plan = await Effect.runPromise(createPlan(db)(oahuPlan));
  console.log(`✅ Created plan: ${plan.title} (${plan.slug})`);

  // Create days and their stops
  for (const dayInput of oahuDays) {
    const day = await Effect.runPromise(
      createDay(db)({ ...dayInput, planId: plan.id })
    );
    console.log(`  ✅ Created ${day.title}`);

    // Create stops for this day
    const stopsForDay = oahuStopsByDay[day.dayNumber] ?? [];
    for (const stopInput of stopsForDay) {
      const stop = await Effect.runPromise(
        createStop(db)({ ...stopInput, dayId: day.id })
      );
      console.log(`    ✅ Created stop: ${stop.title}`);
    }
  }

  console.log("🎉 Seeding complete!");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});