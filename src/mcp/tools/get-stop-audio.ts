// Tool: get_stop_audio

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { runEffectSafe, errResult, okResult } from "../helpers";

export function registerGetStopAudio(server: McpServer): void {
  server.registerTool(
    "get_stop_audio",
    {
      title: "Get Stop Audio / Description",
      description:
        "Get the full TTS description and audio URL for a single stop. Use when user selects a stop to read or listen to the audioguide. Call lazily — not when listing the itinerary.",
      inputSchema: {
        stopId: z.string().describe("The UUID of the stop"),
      },
    },
    async ({ stopId }) => {
      const result = await runEffectSafe(
        Effect.gen(function* () {
          const stopRepo = yield* StopRepositoryPort;
          const stop = yield* stopRepo.getStopById(stopId);
          return {
            id: stop.id,
            title: stop.title,
            description: stop.description,
            audioUrl: stop.audioUrl,
          };
        }),
      );
      if (!result.ok) return errResult((result as { ok: false; error: string }).error);
      return okResult((result as { ok: true; value: any }).value);
    },
  );
}
