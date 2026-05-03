// Tool: update_stop

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { googleMapsUrl } from "@/core/ports/read-model-port";
import { runEffectSafe, errResult, okResult } from "../helpers";

export function registerUpdateStop(server: McpServer): void {
  server.registerTool(
    "update_stop",
    {
      title: "Update Stop",
      description:
        "Update details of a single stop by its ID (stable, does not shift like indices). Only provided fields are updated.",
      inputSchema: {
        planSlug: z.string().describe("The slug of the plan"),
        dayNumber: z.number().describe("Day number (1-based)"),
        stopId: z.string().describe("The UUID of the stop to update"),
        title: z.string().optional().describe("New stop name"),
        summary: z
          .string()
          .nullable()
          .optional()
          .describe("Brief factual overview: 1-3 sentences, ~50-150 chars. Quick scan for UI cards. No markdown. Pass null to clear."),
        description: z.string().optional().describe("New description"),
        lat: z.number().optional().describe("New latitude"),
        lng: z.number().optional().describe("New longitude"),
        links: z
          .array(
            z.object({
              label: z.string().describe("Link label, e.g. 'Tickets'"),
              url: z.string().describe("Link URL"),
            }),
          )
          .optional()
          .describe("New links array (replaces existing)"),
        duration: z
          .object({ min: z.number().describe("Min minutes"), max: z.number().describe("Max minutes") })
          .nullable()
          .optional()
          .describe("Estimated visit duration in minutes. Pass null to clear."),
        cost: z
          .object({ amount: z.number(), currency: z.string(), note: z.string().optional() })
          .nullable()
          .optional()
          .describe("Cost info — amount, currency code, optional note. Pass null to clear."),
        reservation: z
          .string()
          .nullable()
          .optional()
          .describe("Reservation info or link. Pass null to clear."),
        bring: z
          .array(z.string())
          .optional()
          .describe("What to bring, e.g. ['Water', 'Sunscreen'] (replaces existing)"),
        bestTime: z
          .string()
          .nullable()
          .optional()
          .describe("Best time to visit, e.g. 'Early morning to avoid crowds'. Pass null to clear."),
        warnings: z
          .array(z.string())
          .optional()
          .describe("Warnings, e.g. ['Steep climb', 'No shade'] (replaces existing)"),
        alternative: z
          .string()
          .nullable()
          .optional()
          .describe("Alternative if this stop doesn't work out. Pass null to clear."),
        audioUrl: z.string().nullable().optional().describe("Audio file URL. Preserve existing value unless intentionally changing audio. Pass null to clear."),
        visited: z.boolean().optional().describe("Whether the stop has been visited. Pass true/false to mark/unmark."),
      },
    },
    async ({ planSlug, dayNumber, stopId, title, summary, description, lat, lng, links, duration, cost, reservation, bring, bestTime, warnings, alternative, audioUrl, visited }) => {
      const result = await runEffectSafe(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          const stopRepo = yield* StopRepositoryPort;

          const plan = yield* rm.getPlanReadModelBySlug(planSlug);
          const day = plan.days.find((d: any) => d.dayNumber === dayNumber);
          if (!day) throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);

          const stop = day.stops.find((s: any) => s.id === stopId);
          if (!stop) throw new Error(`Stop id '${stopId}' not found in day ${dayNumber}`);

          const update: any = {};
          if (title !== undefined) update.title = title;
          if (summary !== undefined) update.summary = summary;
          if (description !== undefined) update.description = description;
          if (lat !== undefined) update.lat = lat;
          if (lng !== undefined) update.lng = lng;
          if (links !== undefined) update.links = links;
          if (duration !== undefined) update.duration = duration;
          if (cost !== undefined) update.cost = cost;
          if (reservation !== undefined) update.reservation = reservation;
          if (bring !== undefined) update.bring = bring;
          if (bestTime !== undefined) update.bestTime = bestTime;
          if (warnings !== undefined) update.warnings = warnings;
          if (alternative !== undefined) update.alternative = alternative;
          if (audioUrl !== undefined) update.audioUrl = audioUrl;
          if (visited !== undefined) update.visited = visited;

          const updated = yield* stopRepo.updateStop(stop.id, update);
          return { ...updated, googleMapsUrl: googleMapsUrl(updated.lat, updated.lng) };
        }),
      );
      if (!result.ok) return errResult((result as { ok: false; error: string }).error);
      return okResult((result as { ok: true; value: any }).value);
    },
  );
}