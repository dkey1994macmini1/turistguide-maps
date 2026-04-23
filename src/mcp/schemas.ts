// Shared Zod schemas for MCP tool input validation

import { z } from "zod";

export const linkSchema = z.object({
  label: z.string().describe("Link label, e.g. 'Tickets'"),
  url: z.string().describe("Link URL"),
});

export const durationSchema = z
  .object({ min: z.number().describe("Min minutes"), max: z.number().describe("Max minutes") })
  .optional()
  .describe("Estimated visit duration in minutes");

export const costSchema = z
  .object({ amount: z.number(), currency: z.string(), note: z.string().optional() })
  .optional()
  .describe("Cost info — amount, currency code, optional note");

export const stopSchema = z.object({
  title: z.string().describe("Stop name"),
  summary: z
    .string()
    .optional()
    .describe("Brief factual overview: 1-3 sentences, ~50-150 chars. Quick scan for UI cards. No markdown."),
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
  duration: durationSchema,
  cost: costSchema,
  reservation: z.string().optional().describe("Reservation info or link"),
  bring: z.array(z.string()).optional().default([]).describe("What to bring, e.g. ['Water', 'Sunscreen']"),
  bestTime: z.string().optional().describe("Best time to visit, e.g. 'Early morning to avoid crowds'"),
  warnings: z.array(z.string()).optional().default([]).describe("Warnings, e.g. ['Steep climb', 'No shade']"),
  alternative: z.string().optional().describe("Alternative if this stop doesn't work out"),
  audioUrl: z.string().nullable().optional().describe("Audio file URL (e.g. /api/audio/stops/stop-id). Preserve existing value unless intentionally changing audio. Pass null to clear."),
});