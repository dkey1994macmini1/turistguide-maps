// Serialize plan data for MCP tool responses

import { googleMapsUrl } from "@/core/ports/read-model-port";

// Light stop data — for get_itinerary (no TTS fields)
function serializeStopLight(stop: any) {
  return {
    id: stop.id,
    title: stop.title,
    summary: stop.summary ?? null,
    lat: stop.lat,
    lng: stop.lng,
    googleMapsUrl: stop.googleMapsUrl ?? googleMapsUrl(stop.lat, stop.lng),
    links: stop.links ?? [],
    duration: stop.duration ?? null,
    cost: stop.cost ?? null,
    reservation: stop.reservation ?? null,
    bring: stop.bring ?? [],
    bestTime: stop.bestTime ?? null,
    alternative: stop.alternative ?? null,
    audioUrl: stop.audioUrl ?? null,
    photo: stop.photo ?? null,
    visited: stop.visited ?? false,
  };
}

// Full stop data — for add_stop / update_stop responses (includes TTS fields)
function serializeStopFull(stop: any) {
  return {
    id: stop.id,
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
    photo: stop.photo ?? null,
    visited: stop.visited ?? false,
  };
}

// Light plan — for get_itinerary (stops without TTS fields)
export function serializePlanLight(plan: any) {
  const startDate: Date | null = plan.startDate ?? null;
  return {
    slug: plan.slug,
    title: plan.title,
    description: plan.description,
    startDate: startDate ? startDate.toISOString().split("T")[0] : null,
    days: (plan.days ?? []).map((day: any) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      isPast: computeIsPast(startDate, day.dayNumber),
      stops: (day.stops ?? []).map(serializeStopLight),
    })),
  };
}

// Full plan — for add/update operations (stops with TTS fields)
export function serializePlan(plan: any) {
  const startDate: Date | null = plan.startDate ?? null;
  return {
    slug: plan.slug,
    title: plan.title,
    description: plan.description,
    startDate: startDate ? startDate.toISOString().split("T")[0] : null,
    days: (plan.days ?? []).map((day: any) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      isPast: computeIsPast(startDate, day.dayNumber),
      stops: (day.stops ?? []).map(serializeStopFull),
    })),
  };
}

function computeIsPast(startDate: Date | null, dayNumber: number): boolean {
  if (!startDate) return false;
  const dayStart = new Date(startDate);
  dayStart.setDate(dayStart.getDate() + (dayNumber - 1));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return dayStart < now;
}

// TTS fields only — for get_stop_audio
export function serializeStopAudio(stop: any) {
  return {
    id: stop.id,
    title: stop.title,
    description: stop.description,
    audioUrl: stop.audioUrl ?? null,
  };
}