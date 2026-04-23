// Tool: add_day

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { runEffectSafe, errResult, okResult } from "../helpers";
import { stopSchema } from "../schemas";

export function registerAddDay(server: McpServer): void {
  server.registerTool(
    "add_day",
    {
      title: "Add Day",
      description:
        "Add a day with stops to an existing plan. If a day with the same dayNumber already exists, it will be updated (title/description replaced, stops fully replaced). Returns the created/updated day.",
      inputSchema: {
        planSlug: z.string().describe("The slug of the plan"),
        dayNumber: z.number().describe("Day number (1-based)"),
        title: z.string().nullable().describe("Title for the day, e.g. 'North Shore Adventure'"),
        description: z.string().nullable().describe("Description for the day"),
        stops: z.array(stopSchema).describe("Ordered list of stops for this day"),
      },
    },
    async ({ planSlug, dayNumber, title, description, stops }) => {
      const result = await runEffectSafe(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;

          const plan = yield* rm.getPlanReadModelBySlug(planSlug);

          // Check if day already exists
          const existingDay = plan.days.find((d: any) => d.dayNumber === dayNumber);

          if (existingDay) {
            // Update existing day: match stops by title to preserve audioUrl + audio files
            yield* dayRepo.updateDay(existingDay.id, {
              title: title ?? null,
              description: description ?? null,
            });

            const existingStops = existingDay.stops;
            const newTitles = new Set(stops.map((s: any) => s.title));

            // Delete stops that no longer exist in the new list
            for (const oldStop of existingStops) {
              if (!newTitles.has(oldStop.title)) {
                yield* stopRepo.deleteStop(oldStop.id);
              }
            }

            const createdStops = [];
            for (let i = 0; i < stops.length; i++) {
              const s = stops[i];
              const matching = existingStops.find((o: any) => o.title === s.title);
              if (matching) {
                // Update existing stop — preserve audioUrl
                const updated = yield* stopRepo.updateStop(matching.id, {
                  title: s.title,
                  description: s.description,
                  summary: s.summary ?? null,
                  lat: s.lat,
                  lng: s.lng,
                  sortOrder: i + 1,
                  links: s.links ?? [],
                  duration: s.duration ?? null,
                  cost: s.cost ?? null,
                  reservation: s.reservation ?? null,
                  bring: s.bring ?? [],
                  bestTime: s.bestTime ?? null,
                  warnings: s.warnings ?? [],
                  alternative: s.alternative ?? null,
                  audioUrl: s.audioUrl ?? undefined,
                });
                createdStops.push(updated);
              } else {
                // New stop — no audioUrl to preserve
                createdStops.push(
                  yield* stopRepo.createStop({
                    dayId: existingDay.id,
                    title: s.title,
                    description: s.description,
                    summary: s.summary ?? null,
                    lat: s.lat,
                    lng: s.lng,
                    sortOrder: i + 1,
                    links: s.links ?? [],
                    duration: s.duration ?? null,
                    cost: s.cost ?? null,
                    reservation: s.reservation ?? null,
                    bring: s.bring ?? [],
                    bestTime: s.bestTime ?? null,
                    warnings: s.warnings ?? [],
                    alternative: s.alternative ?? null,
                    audioUrl: s.audioUrl ?? null,
                  }),
                );
              }
            }
            return { dayNumber, title, description, stops: createdStops, mode: "updated" };
          }

          // Create new day + stops
          const day = yield* dayRepo.createDay({
            planId: plan.id,
            dayNumber,
            title: title ?? undefined,
            description: description ?? undefined,
          });
          const createdStops2 = [];
          for (let i = 0; i < stops.length; i++) {
            const s = stops[i];
            createdStops2.push(
              yield* stopRepo.createStop({
                dayId: day.id,
                title: s.title,
                description: s.description,
                summary: s.summary ?? null,
                lat: s.lat,
                lng: s.lng,
                sortOrder: i + 1,
                links: s.links ?? [],
                duration: s.duration ?? null,
                cost: s.cost ?? null,
                reservation: s.reservation ?? null,
                bring: s.bring ?? [],
                bestTime: s.bestTime ?? null,
                warnings: s.warnings ?? [],
                alternative: s.alternative ?? null,
                audioUrl: s.audioUrl ?? null,
              }),
            );
          }
          return { dayNumber, title, description, stops: createdStops2, mode: "created" };
        }),
      );
      if (!result.ok) return errResult((result as { ok: false; error: string }).error);
      return okResult((result as { ok: true; value: any }).value);
    },
  );
}