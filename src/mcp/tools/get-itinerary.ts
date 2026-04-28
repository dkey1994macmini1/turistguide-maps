// Tool: get_itinerary

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { runEffect, errResult, okResult } from "../helpers";
import { serializePlanLight } from "../serialize";

export function registerGetItinerary(server: McpServer): void {
  server.registerTool(
    "get_itinerary",
    {
      title: "Get Itinerary",
      description:
        "Get the full itinerary for a travel plan, including all days and stops with Google Maps links. Use this to read the current state before making changes.",
      inputSchema: {
        planSlug: z.string().describe("The slug of the plan, e.g. 'oahu-hawaii'"),
      },
    },
    async ({ planSlug }) => {
      try {
        const plan = await runEffect(
          Effect.gen(function* () {
            const rm = yield* ReadModelPort;
            return yield* rm.getPlanReadModelBySlug(planSlug);
          }),
        );
        return okResult(serializePlanLight(plan));
      } catch (e: any) {
        return errResult(`Plan not found — ${planSlug}`);
      }
    },
  );
}