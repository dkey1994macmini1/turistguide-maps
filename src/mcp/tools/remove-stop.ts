// Tool: remove_stop

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { runEffectSafe, errResult, okResult } from "../helpers";

export function registerRemoveStop(server: McpServer): void {
  server.registerTool(
    "remove_stop",
    {
      title: "Remove Stop",
      description:
        "Remove a single stop from a day by its ID (stable, does not shift like indices).",
      inputSchema: {
        planSlug: z.string().describe("The slug of the plan"),
        dayNumber: z.number().describe("Day number (1-based)"),
        stopId: z.string().describe("The UUID of the stop to remove"),
      },
    },
    async ({ planSlug, dayNumber, stopId }) => {
      const result = await runEffectSafe(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          const stopRepo = yield* StopRepositoryPort;

          const plan = yield* rm.getPlanReadModelBySlug(planSlug);
          const day = plan.days.find((d: any) => d.dayNumber === dayNumber);
          if (!day) throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);

          const stop = day.stops.find((s: any) => s.id === stopId);
          if (!stop) throw new Error(`Stop id '${stopId}' not found in day ${dayNumber}`);

          yield* stopRepo.deleteStop(stop.id);
          return { removed: stop.title, dayNumber, stopId };
        }),
      );
      if (!result.ok) return errResult((result as { ok: false; error: string }).error);
      return okResult((result as { ok: true; value: any }).value);
    },
  );
}