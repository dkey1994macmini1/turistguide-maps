// Tool: add_stop

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { googleMapsUrl } from "@/core/ports/read-model-port";
import { runEffect, errResult, okResult } from "../helpers";
import { linkSchema, durationSchema, costSchema, photoSchema } from "../schemas";

export function registerAddStop(server: McpServer): void {
  server.registerTool(
    "add_stop",
    {
      title: "Add Stop",
      description:
        "Add a single stop to an existing day in an itinerary. The stop is appended to the end of the day's stop list.",
      inputSchema: {
        planSlug: z.string().describe("The slug of the plan"),
        dayNumber: z.number().describe("Which day number to add the stop to (1-based)"),
        title: z.string().describe("Stop name"),
        summary: z
          .string()
          .nullable()
          .optional()
          .describe("Brief factual overview: 1-3 sentences, ~50-150 chars. Quick scan for UI cards. No markdown. Pass null to clear."),
        description: z
          .string()
          .describe(
            "Full narrative text for text-to-speech audioguide. 450-750 words (~3000-5000 chars) for 3-5 min of audio. Conversational storytelling style, no markdown, no bullet points, no headers. Write as if speaking directly to the listener."
          ),
        lat: z.number().describe("Latitude"),
        lng: z.number().describe("Longitude"),
        links: z
          .array(linkSchema)
          .optional()
          .default([])
          .describe("Optional links (tickets, website, etc.)"),
        duration: z
          .object({ min: z.number().describe("Min minutes"), max: z.number().describe("Max minutes") })
          .optional()
          .describe("Estimated visit duration in minutes"),
        cost: z
          .object({ amount: z.number(), currency: z.string(), note: z.string().optional() })
          .optional()
          .describe("Cost info — amount, currency code, optional note"),
        reservation: z.string().optional().describe("Reservation info or link"),
        bring: z.array(z.string()).optional().default([]).describe("What to bring, e.g. ['Water', 'Sunscreen']"),
        bestTime: z.string().optional().describe("Best time to visit, e.g. 'Early morning to avoid crowds'"),
        warnings: z.array(z.string()).optional().default([]).describe("Warnings, e.g. ['Steep climb', 'No shade']"),
        alternative: z.string().optional().describe("Alternative if this stop doesn't work out"),
        audioUrl: z.string().nullable().optional().describe("Audio file URL (e.g. /api/audio/stops/stop-id). Preserve existing value unless intentionally changing audio. Pass null to clear."),
        photo: photoSchema,
        visited: z.boolean().optional().describe("Whether the stop has been visited."),
      },
    },
    async ({ planSlug, dayNumber, title, summary, description, lat, lng, links, duration, cost, reservation, bring, bestTime, warnings, alternative, audioUrl, photo, visited }) => {
      try {
        const stop = await runEffect(
          Effect.gen(function* () {
            const rm = yield* ReadModelPort;
            const stopRepo = yield* StopRepositoryPort;
            const plan = yield* rm.getPlanReadModelBySlug(planSlug);

            const day = plan.days.find((d: any) => d.dayNumber === dayNumber);
            if (!day) throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);

            const sortOrder = day.stops.length + 1;
            const newStop = yield* stopRepo.createStop({
              dayId: day.id,
              title,
              description,
              summary: summary ?? null,
              lat,
              lng,
              sortOrder,
              links: links ?? [],
              duration: duration ?? null,
              cost: cost ?? null,
              reservation: reservation ?? null,
              bring: bring ?? [],
              bestTime: bestTime ?? null,
              warnings: warnings ?? [],
              alternative: alternative ?? null,
              audioUrl: audioUrl ?? null,
              photo: photo ?? null,
              visited: visited ?? false,
            });
            return { ...newStop, googleMapsUrl: googleMapsUrl(lat, lng) };
          }),
        );
        return okResult(stop);
      } catch (e: any) {
        return errResult(e.message ?? String(e));
      }
    },
  );
}