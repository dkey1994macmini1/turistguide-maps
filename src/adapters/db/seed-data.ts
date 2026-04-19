// Seed data — Oahu 6-day trip based on public/oahu/index.html
// Inserts 1 plan, 6 days, and 18 stops with realistic coordinates and descriptions

import type { PlanCreateInput } from "@/domain/plan";
import type { DayCreateInput } from "@/domain/day";
import type { StopCreateInput } from "@/domain/stop";

// ── Plan ──

export const oahuPlan: PlanCreateInput = {
  slug: "oahu-6-days",
  title: "Oahu 6 Days",
  description: "Realna mapa na OpenStreetMap, oparta na planie z wiki. Surf, snorkel, nature — wedding trip na Oahu.",
};

// ── Days ──

export const oahuDays: Omit<DayCreateInput, "planId">[] = [
  {
    dayNumber: 1,
    title: "Day 1 — Waikiki / Manoa",
    description: "Dżungla, pierwsze widoki i miękkie wejście w klimat wyspy.",
  },
  {
    dayNumber: 2,
    title: "Day 2 — Pearl Harbor / Pali",
    description: "Mocny dzień historyczny z dobrym kontrapunktem widokowym.",
  },
  {
    dayNumber: 3,
    title: "Day 3 — Windward Coast",
    description: "Lekki dzień przed ślubem: sunrise, ogród i spokojna plaża.",
  },
  {
    dayNumber: 4,
    title: "Day 4 — Wedding",
    description: "Dzień nieruchomy. Zero kombinowania z ambitnym sightseeingiem.",
  },
  {
    dayNumber: 5,
    title: "Day 5 — North Shore",
    description: "Dzień po ślubie. North Shore bez zimowego szaleństwa, ale z piękną linią brzegu.",
  },
  {
    dayNumber: 6,
    title: "Day 6 — Southeast Coast",
    description: "Snorkel + klify + ostatni surf. Bardzo mocny closing day.",
  },
];

// ── Stops ──

export const oahuStopsByDay: Record<number, Omit<StopCreateInput, "dayId">[]> = {
  1: [
    {
      title: "Manoa Falls",
      description: "Poranek w zieleni. Idź wcześnie, bo potem robi się tłoczno i błotniście.",
      lat: 21.3420596,
      lng: -157.7991809,
      sortOrder: 1,
      links: [],
    },
    {
      title: "Waikiki Beach",
      description: "Lekki reset po locie, pierwszy kontakt z wodą i orientacja w Honolulu.",
      lat: 21.2741046,
      lng: -157.8243118,
      sortOrder: 2,
      links: [],
    },
    {
      title: "Tantalus Lookout",
      description: "Najlepiej o zachodzie. Panorama Honolulu bez wysiłku.",
      lat: 21.3332,
      lng: -157.8058,
      sortOrder: 3,
      links: [],
    },
  ],
  2: [
    {
      title: "Pearl Harbor Visitor Center",
      description: "Rdzeń dnia. Tu nie ma sensu się spieszyć.",
      lat: 21.3674843,
      lng: -157.9384488,
      sortOrder: 1,
      links: [],
    },
    {
      title: "Nuuanu Pali Lookout",
      description: "Krótki, mocny przystanek po drodze powrotnej. Widok robi robotę.",
      lat: 21.3711,
      lng: -157.7975,
      sortOrder: 2,
      links: [],
    },
    {
      title: "Ko Olina",
      description: "Opcjonalny spokojny finał przy wodzie, jeśli nie chcecie wracać od razu do Waikiki.",
      lat: 21.3281625,
      lng: -158.1219874,
      sortOrder: 3,
      links: [],
    },
  ],
  3: [
    {
      title: "Lanikai Pillbox Trail",
      description: "Wyjazd przed świtem. Dla tego widoku warto wstać brutalnie wcześnie.",
      lat: 21.387919,
      lng: -157.7178727,
      sortOrder: 1,
      links: [],
    },
    {
      title: "Ho'omaluhia Botanical Garden",
      description: "Ko'olau cliffs z bliska. Jedno z tych miejsc, które w realu są lepsze niż na zdjęciach.",
      lat: 21.3882747,
      lng: -157.8070148,
      sortOrder: 2,
      links: [],
    },
    {
      title: "Lanikai Beach",
      description: "Plaża na spokojne wyhamowanie, nie na odhaczanie.",
      lat: 21.3917342,
      lng: -157.7148121,
      sortOrder: 3,
      links: [],
    },
    {
      title: "Byodo-In Temple",
      description: "Dobry, cichy finał dnia. Jedź po 15:30.",
      lat: 21.4226,
      lng: -157.8358,
      sortOrder: 4,
      links: [],
    },
  ],
  4: [
    {
      title: "Wedding base — Waikiki",
      description: "Pełny dzień zarezerwowany. Jedyny sensowny task rano: złapać booking na Hanauma Bay.",
      lat: 21.2793568,
      lng: -157.8285713,
      sortOrder: 1,
      links: [],
    },
  ],
  5: [
    {
      title: "Waimea Valley",
      description: "Botanika + wodospad. Dobre tempo na dzień po weselu.",
      lat: 21.6403,
      lng: -158.056,
      sortOrder: 1,
      links: [],
    },
    {
      title: "Laniakea Beach",
      description: "Żółwie to nie atrakcja do podbiegania. Trzymaj dystans.",
      lat: 21.6379,
      lng: -158.1055,
      sortOrder: 2,
      links: [],
    },
    {
      title: "Ehukai / Banzai Pipeline",
      description: "W maju bardziej symboliczne niż spektakularne — ale i tak warto stanąć.",
      lat: 21.6649,
      lng: -158.0535,
      sortOrder: 3,
      links: [],
    },
    {
      title: "Haleiwa Town",
      description: "Shave ice, luz i dobre zamknięcie dnia.",
      lat: 21.5876272,
      lng: -158.1035648,
      sortOrder: 4,
      links: [],
    },
  ],
  6: [
    {
      title: "Hanauma Bay",
      description: "Najbardziej logistycznie wrażliwy punkt całego planu. Bez wcześniejszego bookingu nie ma tematu.",
      lat: 21.269,
      lng: -157.6938,
      sortOrder: 1,
      links: [],
    },
    {
      title: "Makapu'u Lighthouse Trail",
      description: "Łatwy spacer, ale krajobraz pierwsza liga.",
      lat: 21.3099,
      lng: -157.6557,
      sortOrder: 2,
      links: [],
    },
    {
      title: "Queens / Waikiki final surf",
      description: "Jeśli zostanie energia i swell, to jest dobry finał Oahu.",
      lat: 21.2711,
      lng: -157.8217,
      sortOrder: 3,
      links: [],
    },
  ],
};