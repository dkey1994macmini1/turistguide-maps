// API response types matching the domain model

export type PlanListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  heroStopId: string | null;
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
  summary: string | null;
  lat: number;
  lng: number;
  sortOrder: number;
  links: ReadonlyArray<{ label: string; url: string }>;
  googleMapsUrl: string;
  duration: { min: number; max: number } | null;
  cost: { amount: number; currency: string; note?: string } | null;
  reservation: string | null;
  bring: ReadonlyArray<string>;
  bestTime: string | null;
  warnings: ReadonlyArray<string>;
  alternative: string | null;
  audioUrl: string | null;
  photo: {
    src: string;
    alt: string;
    photographer: string;
    photoUrl?: string;
  } | null;
  visited: boolean;
};

export type DayWithStops = DayItem & {
  stops: StopItem[];
};

export type PlanReadModel = PlanListItem & {
  days: DayWithStops[];
};