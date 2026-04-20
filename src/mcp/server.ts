// MCP Server entry point — stdio transport
// Boots the Effect DI, registers tools, connects via stdio

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Effect } from "effect";
import { z } from "zod";
import { ReadModelPort } from "@/core/ports/read-model-port";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { googleMapsUrl } from "@/core/ports/read-model-port";
import { AppLayer } from "@/composition-root";
import { PlanId } from "@/core/branded";

const server = new McpServer({
  name: "turistguide-maps",
  version: "0.1.0",
});

// Helper: run an Effect program and return JSON-safe result
async function runEffect<A, E>(program: Effect.Effect<A, E>): Promise<A> {
  const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(AppLayer)));
  if (exit._tag === "Failure") {
    throw exit.cause;
  }
  return exit.value;
}

// Tool 1: list_itineraries
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
      })
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(readModel, null, 2) }],
    };
  }
);

// Tool 2: get_itinerary
server.registerTool(
  "get_itinerary",
  {
    title: "Get Itinerary",
    description: "Get the full itinerary for a travel plan, including all days and stops with Google Maps links. Use this to read the current state before making changes.",
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
        })
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(serializePlan(plan), null, 2) }],
      };
    } catch (e: any) {
      return {
        content: [{ type: "text" as const, text: `Error: Plan not found — ${planSlug}` }],
        isError: true,
      };
    }
  }
);

// Tool 3: set_itinerary
server.registerTool(
  "set_itinerary",
  {
    title: "Set Itinerary",
    description: "Replace all days and stops for an existing plan. Provide the full itinerary — this is a full replacement (upsert). Days not in the input will be deleted. Existing days keep their IDs if dayNumber matches; new days get new IDs.",
    inputSchema: {
      planSlug: z.string().describe("The slug of the plan to update"),
      days: z.array(z.object({
        dayNumber: z.number().describe("Day number (1-based)"),
        title: z.string().nullable().describe("Optional title for the day, e.g. 'North Shore Adventure'"),
        description: z.string().nullable().describe("Optional description for the day"),
        stops: z.array(z.object({
          title: z.string().describe("Stop name"),
          description: z.string().describe("What to see/do at this stop"),
          lat: z.number().describe("Latitude"),
          lng: z.number().describe("Longitude"),
          links: z.array(z.object({
            label: z.string().describe("Link label, e.g. 'Tickets'"),
            url: z.string().describe("Link URL"),
          })).optional().default([]).describe("Optional links (tickets, website, etc.)"),
        })).describe("Ordered list of stops for this day"),
      })).describe("Complete list of days for the itinerary"),
    },
  },
  async ({ planSlug, days }) => {
    try {
      const result = await runEffect(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          const planRepo = yield* PlanRepositoryPort;
          const dayRepo = yield* DayRepositoryPort;
          const stopRepo = yield* StopRepositoryPort;

          // Get existing plan
          const plan = yield* rm.getPlanReadModelBySlug(planSlug);

          // Delete all existing stops, then days
          for (const day of plan.days) {
            for (const stop of day.stops) {
              yield* stopRepo.deleteStop(stop.id);
            }
            yield* dayRepo.deleteDay(day.id);
          }

          // Recreate days and stops
          const newDays = [];
          for (const dayInput of days) {
            const day = yield* dayRepo.createDay({
              planId: plan.id,
              dayNumber: dayInput.dayNumber,
              title: dayInput.title ?? undefined,
              description: dayInput.description ?? undefined,
            });
            const stops = [];
            for (let i = 0; i < dayInput.stops.length; i++) {
              const stopInput = dayInput.stops[i];
              const stop = yield* stopRepo.createStop({
                dayId: day.id,
                title: stopInput.title,
                description: stopInput.description,
                lat: stopInput.lat,
                lng: stopInput.lng,
                sortOrder: i + 1,
                links: stopInput.links,
              });
              stops.push(stop);
            }
            newDays.push({ ...day, stops });
          }

          return { ...plan, days: newDays };
        })
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(serializePlan(result), null, 2) }],
      };
    } catch (e: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${e.message ?? String(e)}` }],
        isError: true,
      };
    }
  }
);

// Tool 4: add_stop
server.registerTool(
  "add_stop",
  {
    title: "Add Stop",
    description: "Add a single stop to an existing day in an itinerary. Convenience method when you don't want to replace the whole plan.",
    inputSchema: {
      planSlug: z.string().describe("The slug of the plan"),
      dayNumber: z.number().describe("Which day number to add the stop to (1-based)"),
      title: z.string().describe("Stop name"),
      description: z.string().describe("What to see/do at this stop"),
      lat: z.number().describe("Latitude"),
      lng: z.number().describe("Longitude"),
      links: z.array(z.object({
        label: z.string().describe("Link label, e.g. 'Tickets'"),
        url: z.string().describe("Link URL"),
      })).optional().default([]).describe("Optional links"),
    },
  },
  async ({ planSlug, dayNumber, title, description, lat, lng, links }) => {
    try {
      const stop = await runEffect(
        Effect.gen(function* () {
          const rm = yield* ReadModelPort;
          const stopRepo = yield* StopRepositoryPort;
          const plan = yield* rm.getPlanReadModelBySlug(planSlug);

          const day = plan.days.find((d) => d.dayNumber === dayNumber);
          if (!day) {
            throw new Error(`Day ${dayNumber} not found in plan '${planSlug}'`);
          }

          // Place at end of day
          const sortOrder = day.stops.length + 1;

          const newStop = yield* stopRepo.createStop({
            dayId: day.id,
            title,
            description,
            lat,
            lng,
            sortOrder,
            links,
          });

          return {
            ...newStop,
            googleMapsUrl: googleMapsUrl(lat, lng),
          };
        })
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(stop, null, 2) }],
      };
    } catch (e: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${e.message ?? String(e)}` }],
        isError: true,
      };
    }
  }
);

// Serialize plan for JSON output (strip branded types)
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
        description: stop.description,
        lat: stop.lat,
        lng: stop.lng,
        googleMapsUrl: stop.googleMapsUrl ?? googleMapsUrl(stop.lat, stop.lng),
        links: stop.links ?? [],
      })),
    })),
  };
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server failed:", err);
  process.exit(1);
});