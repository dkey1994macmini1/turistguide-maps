// MCP Server entry point — stdio transport
// Day-by-day itinerary management for turistguide-maps

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort, googleMapsUrl } from "@/core/ports/read-model-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { AppLayer } from "@/composition-root";

const server = new McpServer({
  name: "turistguide-maps",
  version: "0.2.0",
});

// ── Helpers ──────────────────────────────────────────────────────────

async function runEffect<A>(program: Effect.Effect<A, any, any>): Promise<A> {
  const exit = await Effect.runPromiseExit((program as any).pipe(Effect.provide(AppLayer)));
  if (exit._tag === "Failure") throw exit.cause;
  return exit.value;
}

async function runEffectSafe<A>(
  program: Effect.Effect<A, any, any>,
): Promise<{ ok: true; value: A } | { ok: false; error: string }> {
  const exit = await Effect.runPromiseExit((program as any).pipe(Effect.provide(AppLayer)));
  if (exit._tag === "Failure") return { ok: false, error: String(exit.cause) };
  return { ok: true, value: exit.value };
}

function serializePlan(plan: any) {
  return {
    slug: plan.slug,
    title: plan.title,
    description: plan.description,
    days: (plan.days ?? []).map((day: any) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      stops: (day.stops ?? []).map((stop: any) => ({
        title: stop.title,
        summary: stop.summary ?? null,
        description: stop.description,
        lat: stop.lat,
        lng: stop.lng,
        googleMapsUrl: stop.googleMapsUrl ?? googleMapsUrl(stop.lat, stop.lng),
        links: stop.links ?? [],
        duration: stop.duration ?? null,
        cost: stop.cost ?? null,
        reservation: stop.reservation ?? null,
        bring: stop.bring ?? [],
        bestTime: stop.bestTime ?? null,
        warnings: stop.warnings ?? [],
        alternative: stop.alternative ?? null,
      })),
    })),
  };
}

function errResult(msg: string) {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

function okResult(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// Shared zod schemas
const stopSchema = z.object({
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
    .array(
      z.object({
        label: z.string().describe("Link label, e.g. 'Tickets'"),
        url: z.string().describe("Link URL"),
      }),
    )
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
});

// ── Tool 1: list_itineraries ────────────────────────────────────────

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

// ── Tool 2: get_itinerary ───────────────────────────────────────────

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
      return okResult(serializePlan(plan));
    } catch (e: any) {
      return errResult(`Plan not found — ${planSlug}`);
    }
  },
);

// ── Tool 3: create_plan ─────────────────────────────────────────────

server.registerTool(
  "create_plan",
  {
    title: "Create Plan",
    description:
      "Create a new empty travel plan. Returns the created plan with its slug. Use add_day afterwards to populate it day by day.",
    inputSchema: {
      slug: z.string().describe("URL-safe slug for the plan, e.g. 'usa-southwest-15-day'"),
      title: z.string().describe("Human-readable title, e.g. 'USA Southwest 15 Days'"),
      description: z.string().optional().default("").describe("Optional description of the plan"),
    },
  },
  async ({ slug, title, description }) => {
    const result = await runEffectSafe(
      Effect.gen(function* () {
        const planRepo = yield* PlanRepositoryPort;
        return yield* planRepo.createPlan({ slug, title, description: description ?? "" });
      }),
    );
    if (!result.ok) return errResult(`Failed to create plan — ${(result as { ok: false; error: string }).error}`);
    const plan = (result as { ok: true; value: any }).value;
    return okResult({ id: plan.id, slug: plan.slug, title: plan.title, description: plan.description });
  },
);

// ── Tool 4: delete_plan ─────────────────────────────────────────────

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

// ── Tool 5: add_day ─────────────────────────────────────────────────

server.registerTool(
  "add_day",
  {
    title: "Add Day",
    description:
      "Add a day with stops to an existing plan. If a day with the same dayNumber already exists, it will be updated (title/description replaced, stops fully replaced). Returns the created/updated day.",
    inputSchema: {
      planSlug: z.string().describe("The slug of the plan"),
      dayNumber: z.number().describe("Day number (1-based)"),
      title: z.string().nullable().describe("Title for the day, e.g. 'North Shore Adventure'"),
      description: z.string().nullable().describe("Description for the day"),
      stops: z
        .array(stopSchema)
        .describe("Ordered list of stops for this day"),
    },
  },
  async ({ planSlug, dayNumber, title, description, stops }) => {
    const result = await runEffectSafe(
      Effect.gen(function* () {
        const rm = yield* ReadModelPort;
        const dayRepo = yield* DayRepositoryPort;
        const stopRepo = yield* StopRepositoryPort;

        const plan = yield* rm.getPlanReadModelBySlug(planSlug);

        // Check if day already exists
        const existingDay = plan.days.find((d: any) => d.dayNumber === dayNumber);

        if (existingDay) {
          // Update existing day: delete old stops, update day metadata, create new stops
          for (const stop of existingDay.stops) yield* stopRepo.deleteStop(stop.id);
          yield* dayRepo.updateDay(existingDay.id, {
            title: title ?? null,
            description: description ?? null,
          });
          const createdStops = [];
          for (let i = 0; i < stops.length; i++) {
            const s = stops[i];
            createdStops.push(
              yield* stopRepo.createStop({
                dayId: existingDay.id,
                title: s.title,
                description: s.description,
                summary: s.summary ?? null,
                lat: s.lat,
                lng: s.lng,
                sortOrder: i + 1,
                links: s.links ?? [],
                duration: s.duration ?? null,
                cost: s.cost ?? null,
                reservation: s.reservation ?? null,
                bring: s.bring ?? [],
                bestTime: s.bestTime ?? null,
                warnings: s.warnings ?? [],
                alternative: s.alternative ?? null,
              }),
            );
          }
          return { dayNumber, title, description, stops: createdStops, mode: "updated" };
        }

        // Create new day + stops
        const day = yield* dayRepo.createDay({
          planId: plan.id,
          dayNumber,
          title: title ?? undefined,
          description: description ?? undefined,
        });
        const createdStops2 = [];
        for (let i = 0; i < stops.length; i++) {
          const s = stops[i];
          createdStops2.push(
            yield* stopRepo.createStop({
              dayId: day.id,
              title: s.title,
              description: s.description,
              summary: s.summary ?? null,
              lat: s.lat,
              lng: s.lng,
              sortOrder: i + 1,
              links: s.links ?? [],
              duration: s.duration ?? null,
              cost: s.cost ?? null,
              reservation: s.reservation ?? null,
              bring: s.bring ?? [],
              bestTime: s.bestTime ?? null,
              warnings: s.warnings ?? [],
              alternative: s.alternative ?? null,
            }),
          );
        }
        return { dayNumber, title, description, stops: createdStops2, mode: "created" };
      }),
    );
    if (!result.ok) return errResult((result as { ok: false; error: string }).error);
    return okResult((result as { ok: true; value: any }).value);
  },
);

// ── Tool 6: remove_day ──────────────────────────────────────────────

server.registerTool(
  "remove_day",
  {
    title: "Remove Day",
    description:
      "Remove a day and all its stops from an itinerary. Other days are not renumbered automatically.",
    inputSchema: {
      planSlug: z.string().describe("The slug of the plan"),
      dayNumber: z.number().describe("Day number to remove (1-based)"),
    },
  },
  async ({ planSlug, dayNumber }) => {
    const result = await runEffectSafe(
      Effect.gen(function* () {
        const rm = yield* ReadModelPort;
        const dayRepo = yield* DayRepositoryPort;
        const stopRepo = yield* StopRepositoryPort;

        const plan = yield* rm.getPlanReadModelBySlug(planSlug);
        const day = plan.days.find((d: any) => d.dayNumber === dayNumber);
        if (!day) throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);

        for (const stop of day.stops) yield* stopRepo.deleteStop(stop.id);
        yield* dayRepo.deleteDay(day.id);
        return { removed: dayNumber, planSlug };
      }),
    );
    if (!result.ok) return errResult((result as { ok: false; error: string }).error);
    return okResult((result as { ok: true; value: any }).value);
  },
);

// ── Tool 7: update_day ──────────────────────────────────────────────

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

// ── Tool 8: add_stop ────────────────────────────────────────────────

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
        .array(
          z.object({
            label: z.string().describe("Link label, e.g. 'Tickets'"),
            url: z.string().describe("Link URL"),
          }),
        )
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
    },
  },
  async ({ planSlug, dayNumber, title, summary, description, lat, lng, links, duration, cost, reservation, bring, bestTime, warnings, alternative }) => {
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

// ── Tool 9: remove_stop ─────────────────────────────────────────────

server.registerTool(
  "remove_stop",
  {
    title: "Remove Stop",
    description:
      "Remove a single stop from a day. Identify the stop by its position (1-based index) within the day's stop list.",
    inputSchema: {
      planSlug: z.string().describe("The slug of the plan"),
      dayNumber: z.number().describe("Day number (1-based)"),
      stopIndex: z.number().describe("Stop position within the day (1-based, e.g. 1 = first stop)"),
    },
  },
  async ({ planSlug, dayNumber, stopIndex }) => {
    const result = await runEffectSafe(
      Effect.gen(function* () {
        const rm = yield* ReadModelPort;
        const stopRepo = yield* StopRepositoryPort;

        const plan = yield* rm.getPlanReadModelBySlug(planSlug);
        const day = plan.days.find((d: any) => d.dayNumber === dayNumber);
        if (!day) throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);

        const stop = day.stops[stopIndex - 1];
        if (!stop) throw new Error(`Stop index ${stopIndex} not found in day ${dayNumber} (has ${day.stops.length} stops)`);

        yield* stopRepo.deleteStop(stop.id);
        return { removed: stop.title, dayNumber, stopIndex };
      }),
    );
    if (!result.ok) return errResult((result as { ok: false; error: string }).error);
    return okResult((result as { ok: true; value: any }).value);
  },
);

// ── Tool 10: update_stop ────────────────────────────────────────────

server.registerTool(
  "update_stop",
  {
    title: "Update Stop",
    description:
      "Update details of a single stop. Identify the stop by its position (1-based index) within the day's stop list. Only provided fields are updated.",
    inputSchema: {
      planSlug: z.string().describe("The slug of the plan"),
      dayNumber: z.number().describe("Day number (1-based)"),
      stopIndex: z.number().describe("Stop position within the day (1-based, e.g. 1 = first stop)"),
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
    },
  },
  async ({ planSlug, dayNumber, stopIndex, title, summary, description, lat, lng, links, duration, cost, reservation, bring, bestTime, warnings, alternative }) => {
    const result = await runEffectSafe(
      Effect.gen(function* () {
        const rm = yield* ReadModelPort;
        const stopRepo = yield* StopRepositoryPort;

        const plan = yield* rm.getPlanReadModelBySlug(planSlug);
        const day = plan.days.find((d: any) => d.dayNumber === dayNumber);
        if (!day) throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);

        const stop = day.stops[stopIndex - 1];
        if (!stop) throw new Error(`Stop index ${stopIndex} not found in day ${dayNumber}`);

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

        const updated = yield* stopRepo.updateStop(stop.id, update);
        return { ...updated, googleMapsUrl: googleMapsUrl(updated.lat, updated.lng) };
      }),
    );
    if (!result.ok) return errResult((result as { ok: false; error: string }).error);
    return okResult((result as { ok: true; value: any }).value);
  },
);

// ── Start ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server failed:", err);
  process.exit(1);
});