// API response types matching the domain model

export type PlanListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type DayItem = {
  id: string;
  planId: string;
  dayNumber: number;
  title: string | null;
  description: string | null;
};

export type StopItem = {
  id: string;
  dayId: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  sortOrder: number;
  links: ReadonlyArray<{ label: string; url: string }>;
  googleMapsUrl: string;
};

export type DayWithStops = DayItem & {
  stops: StopItem[];
};

export type PlanReadModel = PlanListItem & {
  days: DayWithStops[];
};