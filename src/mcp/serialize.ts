// Serialize plan data for MCP tool responses

import { googleMapsUrl } from "@/core/ports/read-model-port";

export function serializePlan(plan: any) {
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
        audioUrl: stop.audioUrl ?? null,
      })),
    })),
  };
}