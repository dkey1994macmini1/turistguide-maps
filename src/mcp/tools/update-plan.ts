// Tool: update_plan

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { runEffectSafe, errResult, okResult } from "../helpers";
import { serializePlan } from "../serialize";

export function registerUpdatePlan(server: McpServer): void {
  server.registerTool(
    "update_plan",
    {
      title: "Update Plan",
      description:
        "Update plan metadata: title, description, or startDate. Changing startDate affects which days are marked as past in the itinerary.",
      inputSchema: {
        planSlug: z.string().describe("Slug of the plan to update"),
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description"),
        startDate: z.string().nullable().optional().describe("Trip start date in YYYY-MM-DD format, or null to clear. Determines which days are past/future."),
      },
    },
    async ({ planSlug, title, description, startDate }) => {
      const result = await runEffectSafe(
        Effect.gen(function* () {
          const repo = yield* PlanRepositoryPort;
          const rm = yield* ReadModelPort;
          const plan = yield* repo.getPlanBySlug(planSlug);

          const updateData: { title?: string; description?: string; startDate?: Date | null } = {};
          if (title !== undefined) updateData.title = title;
          if (description !== undefined) updateData.description = description;
          if (startDate !== undefined) {
            updateData.startDate = startDate === null ? null : new Date(startDate);
          }

          if (Object.keys(updateData).length === 0) {
            return yield* Effect.fail("No fields to update");
          }

          yield* repo.updatePlan(plan.id, updateData);
          return yield* rm.getPlanReadModelBySlug(planSlug);
        }),
      );

      if (!result.ok) return errResult(`Failed to update plan — ${(result as { ok: false; error: string }).error}`);
      const plan = (result as { ok: true; value: any }).value;
      return okResult(serializePlan(plan));
    },
  );
}
