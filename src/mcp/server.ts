// MCP Server entry point — stdio transport
// Day-by-day itinerary management for turistguide-maps

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetStopAudio } from "./tools/get-stop-audio";
import { registerListItineraries } from "./tools/list-itineraries";
import { registerGetItinerary } from "./tools/get-itinerary";
import { registerCreatePlan } from "./tools/create-plan";
import { registerDeletePlan } from "./tools/delete-plan";
import { registerUpdatePlan } from "./tools/update-plan";
import { registerAddDay } from "./tools/add-day";
import { registerRemoveDay } from "./tools/remove-day";
import { registerUpdateDay } from "./tools/update-day";
import { registerAddStop } from "./tools/add-stop";
import { registerRemoveStop } from "./tools/remove-stop";
import { registerUpdateStop } from "./tools/update-stop";

const server = new McpServer({
  name: "turistguide-maps",
  version: "0.2.0",
});

registerListItineraries(server);
registerGetItinerary(server);
registerGetStopAudio(server);
registerCreatePlan(server);
registerDeletePlan(server);
registerUpdatePlan(server);
registerAddDay(server);
registerRemoveDay(server);
registerUpdateDay(server);
registerAddStop(server);
registerRemoveStop(server);
registerUpdateStop(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server failed:", err);
  process.exit(1);
});