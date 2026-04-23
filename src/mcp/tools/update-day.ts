// Tool: update_day

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { runEffectSafe, errResult, okResult } from "../helpers";

export function registerUpdateDay(server: McpServer): void {
  server.registerTool(
    "update_day",
    {
      title: "Update Day",
      description:
        "Update a day's title and/or description. Does NOT modify stops — use add_stop/remove_stop/update_stop for that.",
      inputSchema: {
        planSlug: z.string().describe("The slug of the plan"),
        dayNumber: z.number().describe("Day number to update (1-based)"),
        title: z.string().nullable().optional().describe("New title for the day"),
        description: z.string().nullable().optional().describe("New description for the day"),
      },
    },
    async ({ planSlug, dayNumber, title, description }) => {
      const result = await runEffectSafe(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          const dayRepo = yield* DayRepositoryPort;

          const plan = yield* rm.getPlanReadModelBySlug(planSlug);
          const day = plan.days.find((d: any) => d.dayNumber === dayNumber);
          if (!day) throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);

          const update: any = {};
          if (title !== undefined) update.title = title;
          if (description !== undefined) update.description = description;

          const updated = yield* dayRepo.updateDay(day.id, update);
          return { dayNumber, title: updated.title, description: updated.description };
        }),
      );
      if (!result.ok) return errResult((result as { ok: false; error: string }).error);
      return okResult((result as { ok: true; value: any }).value);
    },
  );
}