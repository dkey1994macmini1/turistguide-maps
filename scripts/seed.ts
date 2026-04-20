// Seed script — populates the database with Oahu demo data

import { Effect, Layer } from "effect";
import { createDbClient, DbClientLive } from "../src/adapters/db/client";
import { PostgresPlanRepositoryLive } from "../src/adapters/db/plan-repository";
import { PostgresDayRepositoryLive } from "../src/adapters/db/day-repository";
import { PostgresStopRepositoryLive } from "../src/adapters/db/stop-repository";
import { PlanRepositoryPort } from "../src/core/ports/plan-repository-port";
import { DayRepositoryPort } from "../src/core/ports/day-repository-port";
import { StopRepositoryPort } from "../src/core/ports/stop-repository-port";
import { oahuPlan, oahuDays, oahuStopsByDay } from "../src/adapters/db/seed-data";

const DbLayer = Layer.effect(
  DbClientLive,
  Effect.gen(function* () {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    return yield* createDbClient(url);
  })
);

const AppLayer = Layer.merge(
  Layer.merge(PostgresPlanRepositoryLive, PostgresDayRepositoryLive),
  PostgresStopRepositoryLive
).pipe(Layer.provide(DbLayer));

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("🌱 Seeding database...");

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const planRepo = yield* PlanRepositoryPort;
      const dayRepo = yield* DayRepositoryPort;
      const stopRepo = yield* StopRepositoryPort;

      // Create the plan
      const plan = yield* planRepo.createPlan(oahuPlan);
      console.log(`✅ Created plan: ${plan.title} (${plan.slug})`);

      // Create days and their stops
      for (const dayInput of oahuDays) {
        const day = yield* dayRepo.createDay({ ...dayInput, planId: plan.id });
        console.log(`  ✅ Created ${day.title ?? `Day ${day.dayNumber}`}`);

        // Create stops for this day
        const stopsForDay = oahuStopsByDay[day.dayNumber] ?? [];
        for (const stopInput of stopsForDay) {
          const stop = yield* stopRepo.createStop({ ...stopInput, dayId: day.id });
          console.log(`    ✅ Created stop: ${stop.title}`);
        }
      }

      return "🎉 Seeding complete!";
    }).pipe(Effect.provide(AppLayer))
  );

  console.log(result);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});