// Seed data — Oahu 6-day trip based on public/oahu/index.html
// Inserts 1 plan, 6 days, and 18 stops with realistic coordinates and descriptions

import type { PlanCreateInput } from "../../core/plan";
import type { DayCreateInput } from "../../core/day";
import type { StopCreateInput } from "../../core/stop";

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

const gmaps = (query: string) => `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

export const oahuStopsByDay: Record<number, Omit<StopCreateInput, "dayId">[]> = {
  1: [
    {
      title: "Manoa Falls",
      description: "Poranek w zieleni — 1.5 km spacer przez bambusowy las i dżungl do 45-metrowego wodospadu. Idź wcześnie (przed 9:00), bo potem robi się tłoczno i błotniście. Ścieżka w większości przygotowana, ale po deszczu śliska. Buty z dobrym bieżnikiem, nie klapki. Po zejściu możesz odbić na Tantalus — to tylko 15 min autem.",
      lat: 21.3420596,
      lng: -157.7991809,
      sortOrder: 1,
      links: [{ label: "Google Maps", url: gmaps("Manoa Falls Trail Honolulu HI") }],
    },
    {
      title: "Waikiki Beach",
      description: "Lekki reset po locie. Wejdź do wody, zorientuj się w klimacie, obejrzyj Diamond Head z brzegu. Nie planuj tu całego popołudnia - to miejsc typu 'przejdź się, zjedz poke, idź dalej'. Queens to dobry punkt orientacyjny na późniejszy surf, jeśli jednak chcesz po prostu popływać.",
      lat: 21.2741046,
      lng: -157.8243118,
      sortOrder: 2,
      links: [{ label: "Google Maps", url: gmaps("Waikiki Beach Honolulu HI") }],
    },
    {
      title: "Tantalus Lookout",
      description: "Panorama Honolulu z góry — bez wysiłku, bo droga prowadzi pod sam szczyt. Najlepiej o zachodzie: miasto poniżej świeci, Diamond Head na horyzoncie. Parking u góry jest mały, więc jak jest pełno, kręć się Round Top Drive — znajdziesz miejsce. 10 min jazdy z Waikiki.",
      lat: 21.3332,
      lng: -157.8058,
      sortOrder: 3,
      links: [{ label: "Google Maps", url: gmaps("Tantalus Lookout Puu Ualakaa State Park Honolulu HI") }],
    },
  ],
  2: [
    {
      title: "Pearl Harbor Visitor Center",
      description: "Rdzeń dnia. Rezerwacja online jest obowiązkowa — bez biletu nie wejdziesz. Najlepiej pierwsza sesja rano (8:00), bo potem kolejki rosną. Na USS Arizona Memorial spędzisz ok. 75 min razem z filmem i łodzią. Cały visitor center + muzeum to ok. 2–3h. Nie spieszone dni, potraktuj to jak kontemplację, nie checkbox.",
      lat: 21.3674843,
      lng: -157.9384488,
      sortOrder: 1,
      links: [{ label: "Google Maps", url: gmaps("Pearl Harbor Visitor Center Honolulu HI") }],
    },
    {
      title: "Nuuanu Pali Lookout",
      description: "Krótki przystanek po drodze powrotnej z Pearl Harbor — 20 min od centrum. Gdzie King Kamehameha rozgromiał Oahu army w 1795. Widok na windward coast robi robotę, ale uwaga na wiatr — potrafi wyciągnąć czapkę z głowy. 5 min od parkingu do viewpoints, nie potrzebujesz więcej.",
      lat: 21.3711,
      lng: -157.7975,
      sortOrder: 2,
      links: [{ label: "Google Maps", url: gmaps("Nuuanu Pali Lookout Honolulu HI") }],
    },
    {
      title: "Ko Olina",
      description: "Opcjonalny spokojny finał dnia. Cztery chronione laguny, minimalny tłum w porównaniu do Waikiki. Jeśli masz ochotę na spokojną wodę bez pośpiechu — to jest to. 30 min autem z Pearl Harbor. Jeśli nie masz energii, wróć prosto do Waikiki i skończ dzień na Queens — nic nie tracisz.",
      lat: 21.3281625,
      lng: -158.1219874,
      sortOrder: 3,
      links: [{ label: "Google Maps", url: gmaps("Ko Olina Resort Kapolei HI") }],
    },
  ],
  3: [
    {
      title: "Lanikai Pillbox Trail",
      description: "Wyjazd przed świtem — poważnie, 5:00–5:30. Krótki ale stropy trek (25 min w górę) prowadzi do dwóch betonowych bunkrów z panoramą Kailua i Mokuluas. Pierwszy pillbox wystarczy, drugi jest dla masochistów. Bring flashlight na zejście jeśli jesteś o wschodzie. Parking przy Kaiwa Rd jest tiny — bądź tam przed 6:00.",
      lat: 21.387919,
      lng: -157.7178727,
      sortOrder: 1,
      links: [{ label: "Google Maps", url: gmaps("Lanikai Pillbox Trail Kailua HI") }],
    },
    {
      title: "Ho'omaluhia Botanical Garden",
      description: "Ko'olau cliffs z bliska — jedno z tych miejsc, które w realu są lepsze niż na zdjęciach. Wstęp darmowy (donation welcome). Weź mapkę przy wejściu bo garden jest rozległy. Najlepszy shot: jezioro z paliami na pierwszym planie i ściana gór za. 1–1.5h spokojnego spaceru. Zamknięte w poniedziałki i święta.",
      lat: 21.3882747,
      lng: -157.8070148,
      sortOrder: 2,
      links: [{ label: "Google Maps", url: gmaps("Hoomaluhia Botanical Garden Kaneohe HI") }],
    },
    {
      title: "Lanikai Beach",
      description: "Plaża na spokojne wyhamowanie po porannym trekku. Turkusowa woda, dwa Mokulua Islands na horyzoncie, biały piasek. Nie jest to plaża na 'odhaczanie' - to jest plaża na leżenie i nicnierobienie. Public access przez małe przejścia między domami (Mokulua Drive). Nie ma publicznego parkingu - drop-off lub rower.",
      lat: 21.3917342,
      lng: -157.7148121,
      sortOrder: 3,
      links: [{ label: "Google Maps", url: gmaps("Lanikai Beach Kailua HI") }],
    },
    {
      title: "Byodo-In Temple",
      description: "Dobry, cichy finał dnia. Replika świątyni z Uji (Japonia) w dolinie Valley of the Temples. Pagoda, staw z koi, dzwon pokoju. Spokojne 45 min. Wstęp $5. Jedź po 15:30 — mniej ludzi i lepsze światło na zdjęcia. 15 min od Ho'omaluhia.",
      lat: 21.4226,
      lng: -157.8358,
      sortOrder: 4,
      links: [{ label: "Google Maps", url: gmaps("Byodo-In Temple Kaneohe HI") }],
    },
  ],
  4: [
    {
      title: "Wedding base — Waikiki",
      description: "Pełny dzień zarezerwowany. Jedyny sensowny task rano: złapać booking na Hanauma Bay na D6 (rezerwacje otwierają się o 7:00 HST, 2 dni ahead). Poza tym — zero planowania, skup się na dniu. Jeśli coś pójdzie nie tak logistycznie, to jest margines na załatwienie spraw.",
      lat: 21.2793568,
      lng: -157.8285713,
      sortOrder: 1,
      links: [{ label: "Google Maps", url: gmaps("Waikiki Honolulu HI") }],
    },
  ],
  5: [
    {
      title: "Waimea Valley",
      description: "Botanika + wodospad w jednym. Przygotowana ścieżka 0.8 mi przez botanic garden prowadzi do Waimea Falls — możesz wejść do wody (life vest wymagany, darmowy na miejscu). Wstęp $25 dla dorosłych, ale worth it jeśli lubisz plants i wodospady. 1.5–2h bez pośpiechu. Otwarte codziennie 8:30–17:00.",
      lat: 21.6403,
      lng: -158.056,
      sortOrder: 1,
      links: [{ label: "Google Maps", url: gmaps("Waimea Valley Haleiwa HI") }],
    },
    {
      title: "Laniakea Beach",
      description: "Żółwie hawajskie (honu) wychodzą na brzeg odpocząć — typowo midday. Trzymaj dystans 10 stóp, nie dotykaj, nie stawaj między nim a wodą. Beach ma zero infrastructure, więc bring water i shade. Parking przy drodze jest dramatyczny — patience. 5 min od Waimea Valley.",
      lat: 21.6379,
      lng: -158.1055,
      sortOrder: 2,
      links: [{ label: "Google Maps", url: gmaps("Laniakea Beach Turtle Beach Haleiwa HI") }],
    },
    {
      title: "Ehukai / Banzai Pipeline",
      description: "Zimą to najpotężniejszy break na świecie. W maju — spokojna woda i pusty beach, ale i tak warto stanąć na tym piasku i wyobrazić sobie 30-foot waves. Ehukai Beach Park ma parking, prysznice i toalety. 5 min od Laniakea.",
      lat: 21.6649,
      lng: -158.0535,
      sortOrder: 3,
      links: [{ label: "Google Maps", url: gmaps("Ehukai Beach Park Banzai Pipeline Pupukea HI") }],
    },
    {
      title: "Haleiwa Town",
      description: "North Shore gateway — shave ice w Matsumoto's (kieruj się na linię, nie na flavor), food trucks z garlic shrimp, kilka surf shopów. Spacer po town to 30 min. Luźne zamknięcie dnia przed powrotem do Waikiki. 45 min drogi z powrotem przez H2.",
      lat: 21.5876272,
      lng: -158.1035648,
      sortOrder: 4,
      links: [{ label: "Google Maps", url: gmaps("Haleiwa Town HI") }],
    },
  ],
  6: [
    {
      title: "Hanauma Bay",
      description: "Najbardziej logistycznie wrażliwy punkt całego planu. Rezerwacja online obowiązkowa (otwierają 2 dni ahead, 7:00 HST — ustaw alarm). Parking szybko się kończy — bądź 30 min przed timeslotem. Wstęp $25, wypożyczenie snorkel gear $20. Woda jest kalna, ryby kolorowe, coral w rekonwalescencji. 2h w wodzie wystarczą. Żadnego kontaktu z coral — stóp na piasku.",
      lat: 21.269,
      lng: -157.6938,
      sortOrder: 1,
      links: [{ label: "Google Maps", url: gmaps("Hanauma Bay Nature Preserve Honolulu HI") }],
    },
    {
      title: "Makapu'u Lighthouse Trail",
      description: "Paved trail 2 mi round-trip z widokami na southeast coast i Molokai w oddali (przy dobrej widoczności). Łatwy, bez cienia — bring water i hat. Na trasie są viewing terrasy z whale-watching plakatami (zimą widzą humpbacki). 45 min w sumie. 10 min od Hanauma Bay autem.",
      lat: 21.3099,
      lng: -157.6557,
      sortOrder: 2,
      links: [{ label: "Google Maps", url: gmaps("Makapuu Point Lighthouse Trail Waimanalo HI") }],
    },
    {
      title: "Queens / Waikiki final surf",
      description: "Closing day z surfem na Queens — łagodny break przy Kuhio Beach, idealny na ostatnią sesję. Rentals dostępne na plaży ($20–25). Jeśli swell nie jest, po prostu popływaj i obejrzyj zachód z Queens Surf Beach — dobry koniec Oahu.",
      lat: 21.2711,
      lng: -157.8217,
      sortOrder: 3,
      links: [{ label: "Google Maps", url: gmaps("Queens Surf Beach Waikiki Honolulu HI") }],
    },
  ],
};