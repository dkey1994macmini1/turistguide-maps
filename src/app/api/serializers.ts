import type { Plan } from "@/core/plan";
import type { PlanReadModel } from "@/core/ports/read-model-port";

export function serializePlan(p: Plan) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    startDate: p.startDate ? p.startDate.toISOString().split("T")[0] : null,
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeReadModel(plan: PlanReadModel) {
  return {
    ...serializePlan(plan),
    days: plan.days.map((day) => ({
      id: day.id,
      planId: day.planId,
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      stops: day.stops.map((stop) => ({
        id: stop.id,
        dayId: stop.dayId,
        title: stop.title,
        summary: stop.summary ?? null,
        description: stop.description,
        lat: stop.lat,
        lng: stop.lng,
        sortOrder: stop.sortOrder,
        links: stop.links.map((l) => ({ label: l.label, url: l.url })),
        googleMapsUrl: stop.googleMapsUrl,
        duration: stop.duration ?? null,
        cost: stop.cost ?? null,
        reservation: stop.reservation ?? null,
        bring: stop.bring ?? [],
        bestTime: stop.bestTime ?? null,
        warnings: stop.warnings ?? [],
        alternative: stop.alternative ?? null,
        audioUrl: stop.audioUrl ?? null,
        photo: stop.photo ?? null,
        visited: stop.visited ?? false,
      })),
    })),
  };
}
