// Tool: create_plan

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { runEffectSafe, errResult, okResult } from "../helpers";

export function registerCreatePlan(server: McpServer): void {
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
}