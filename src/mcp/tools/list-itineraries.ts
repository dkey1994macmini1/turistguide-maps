// Tool: list_itineraries

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { runEffect, okResult } from "../helpers";

export function registerListItineraries(server: McpServer): void {
  server.registerTool(
    "list_itineraries",
    {
      title: "List Itineraries",
      description: "List all available travel itineraries. Returns slug and title for each plan.",
      inputSchema: {},
    },
    async () => {
      const readModel = await runEffect(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          return yield* rm.listPlanSlugs;
        }),
      );
      return okResult(readModel);
    },
  );
}