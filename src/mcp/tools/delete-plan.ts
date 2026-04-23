// Tool: delete_plan

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { runEffectSafe, errResult, okResult } from "../helpers";

export function registerDeletePlan(server: McpServer): void {
  server.registerTool(
    "delete_plan",
    {
      title: "Delete Plan",
      description: "Delete a travel plan and all its days and stops. This is irreversible.",
      inputSchema: {
        planSlug: z.string().describe("The slug of the plan to delete"),
      },
    },
    async ({ planSlug }) => {
      const result = await runEffectSafe(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;

          const plan = yield* rm.getPlanReadModelBySlug(planSlug);
          for (const day of plan.days) {
            for (const stop of day.stops) yield* stopRepo.deleteStop(stop.id);
            yield* dayRepo.deleteDay(day.id);
          }
          yield* planRepo.deletePlan(plan.id);
          return { deleted: planSlug };
        }),
      );
      if (!result.ok) return errResult((result as { ok: false; error: string }).error);
      return okResult((result as { ok: true; value: any }).value);
    },
  );
}