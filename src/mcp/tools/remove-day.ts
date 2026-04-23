// Tool: remove_day

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { runEffectSafe, errResult, okResult } from "../helpers";

export function registerRemoveDay(server: McpServer): void {
  server.registerTool(
    "remove_day",
    {
      title: "Remove Day",
      description:
        "Remove a day and all its stops from an itinerary. Other days are not renumbered automatically.",
      inputSchema: {
        planSlug: z.string().describe("The slug of the plan"),
        dayNumber: z.number().describe("Day number to remove (1-based)"),
      },
    },
    async ({ planSlug, dayNumber }) => {
      const result = await runEffectSafe(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;

          const plan = yield* rm.getPlanReadModelBySlug(planSlug);
          const day = plan.days.find((d: any) => d.dayNumber === dayNumber);
          if (!day) throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);

          for (const stop of day.stops) yield* stopRepo.deleteStop(stop.id);
          yield* dayRepo.deleteDay(day.id);
          return { removed: dayNumber, planSlug };
        }),
      );
      if (!result.ok) return errResult((result as { ok: false; error: string }).error);
      return okResult((result as { ok: true; value: any }).value);
    },
  );
}