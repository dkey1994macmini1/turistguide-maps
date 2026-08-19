# Design PRD: Turistguide Maps — Redesign (Editorial Itinerary)

**Data:** 2026-08-20
**Repo:** `~/projects/turistguide-maps`
**Dotyczy:** Plan viewer (`/plans/[slug]`) oraz plan list (`/plans`)
**Primary surface:** Mobile-first, desktop secondary
**Język:** Polish

---

## 1. Executive Summary

Redesign strony planu podrózy (`/plans/[slug]`) aplikacji Turistguide Maps. Obecny UI to generyczny "travel app" (fixed map + lista checkboxow) bez osobowosci wizualnej. Uzytkownik wyraznie preferuje styl fotoprzewodnika — editorial, storytelling, ciepla typografia, fotografie.

**Cel:** Przeksztalcic plan z suchego narzedzia w narracyjne doswiadczenie, zachowujac cala funkcjonalnosc (mapa, audio, metadane, visited, reorder, offline). Oraz odswiezyc liste planow (`/plans`) by pasowala do tego samego jezyka wizualnego.

---

## 2. Design Read

Reading this as: **travel-plan viewer** for **tourists/families on mobile**, with a **Polish** language, leaning toward **Next.js + vanilla CSS**.

User explicitly likes the photo-guide's editorial, storytelling visual style. The redesign must inject that warmth into a functional itinerary tool.

### Dials
- `DESIGN_VARIANCE: 8` — meaningful visual shift from generic to editorial
- `MOTION_INTENSITY: 4` — restrained, purposeful; mobile-first means tap feedback + scroll fade-ins, no heavy scroll hijacks
- `VISUAL_DENSITY: 5` — editorial cards need breathing room, but itinerary data must remain scannable

### Taste Skills
- Primary: `redesign-existing-projects` (audit + targeted upgrades)
- Direction overlay: `design-taste-frontend` (editorial layout, typography, motion)

---

## 3. Current State (Brief Audit)

### Screens
- **Plan list** (`/plans`): `page-container` + generic cards (`plan-card`) + archive toggle
- **Plan viewer** (`/plans/[slug]`): Fixed header + map (40vh) + scrollable day tabs + stop list + inline detail panel
- **Stop list** (`stop-list.tsx`): Dense rows with drag handle, number, title, checkbox
- **Stop detail** (`stop-detail.tsx`): Inline panel with photo, metadata rows (emoji icons), audio player (emoji buttons), collapsible description, links
- **Day switcher** (`day-switcher.tsx`): Horizontal scrollable pill tabs

### Pain Points
1. **Map dominates on mobile** — 40vh pushes list below fold
2. **Zero editorial personality** — system font, generic green, no photos in list
3. **Emoji everywhere** — buttons, metadata, actions feel like prototype
4. **Inline detail panel** — awkward on mobile; pushes content, no overlay
5. **Dense stop rows** — no whitespace, no visual hierarchy
6. **Bland color palette** — `#2d6a4f` is the default "travel app green"

---

## 4. Proposed Design Direction: Editorial Itinerary

### Core Philosophy
"Kazdy przystanek to nie checkpoint — to historia." Przeksztalcic liste przystankow w pionowy scroll editorialny, gdzie kazda karta to mini-spread (zdjecie + tytul + zarys). Mapa jest dostepna, ale nie narzucajaca sie.

### Layout — Mobile (Primary)
```
┌─────────────────────┐
│ Header               │  sticky
│ (back | title | actions)
├─────────────────────┤
│ Day Switcher (h-scroll) │ sticky below header
├─────────────────────┤
│                      │
│ Stop Card 1          │  photo (16:9) + title + summary
│ Stop Card 2          │  + visited toggle
│ Stop Card 3          │
│ ...                  │  scrollable
│                      │
├─────────────────────┤
│ [FAB Map]            │  fixed bottom-right
└─────────────────────┘
```

Tap na karte → **bottom sheet** z pelnym detalem (photo hero, metadata, audio, description, links).

### Layout — Desktop (>= 768px)
```
┌─────────────────────────────────────────┐
│ Header                                   │
├─────────────────────────────────────────┤
│ Day Switcher                             │
├─────────────────────────────────────────┤
│ ┌──────────┬──────────────────────────┐│
│ │ Photo    │  Title                    ││
│ │ (240px)  │  Summary                  ││
│ │          │  [visited]               ││
│ ├──────────┼──────────────────────────┤│
│ │ Photo    │  Title                    ││
│ │          │  Summary                  ││
│ └──────────┴──────────────────────────┘│
│                                          │
└─────────────────────────────────────────┘
```

Cards switch to horizontal layout (photo left, content right) on desktop for better photo visibility.

---

## 5. Component Specs

### 5.1 Header (`plan-header`)
- **Position:** sticky, top: 0, z-index: 100
- **Background:** white (`#ffffff`)
- **Border-bottom:** 1px `var(--border)`
- **Title:** `Playfair Display` 600, 1.5rem mobile / 1.8rem desktop, color: `#293b2e`
- **Meta line:** `Outfit` 400, 0.8rem, `#6b6b6b`
- **Photo-guide link:** Inline-flex, gap 4px, `#293b2e`, 600 weight, arrow icon
- **Actions:** Icon buttons (offline, settings) — 36px circle, cream bg, olive on hover

### 5.2 Day Switcher (`day-switcher`)
- **Position:** sticky below header, z-index: 90
- **Background:** cream (`#faf9f7`)
- **Tabs:** Horizontal scroll, gap 8px, padding 12px 16px
- **Tab style:** White bg, 1.5px border `#e8e6e1`, rounded 12px
- **Active tab:** Olive bg `#293b2e`, white text, number badge in semi-transparent white
- **Past tab:** Opacity 0.55
- **Content:** `D{number} · {title} · {stopCount}`
- **Font:** `Outfit` 500, 0.82rem

### 5.3 Stop Card (`stop-card`)
- **Container:** White bg, border 1px `#e8e6e1`, radius 12px, shadow `0 1px 3px rgba(0,0,0,0.06)`
- **Photo:** Full-bleed top, aspect-ratio 16:9, `object-fit: cover`
- **Photo overlay:** Gradient from bottom (olive 50% opacity) for text legibility
- **Order badge:** Bottom-left of photo, 32px circle, white bg, olive text, shadow
- **Content padding:** 16px mobile / 20px desktop
- **Title:** `Playfair Display` 600, 1.15rem, `#1a1a1a`
- **Summary:** `Outfit` 400, 0.82rem, `#6b6b6b`, line-clamp 2
- **Visited toggle:** 28px circle, right side of header. Default: white bg + `#e8e6e1` border. Visited: olive bg, white checkmark.
- **Visited state:** Photo opacity 0.7, title strikethrough + muted color, summary muted
- **Hover (desktop):** Shadow elevates to `0 8px 24px rgba(0,0,0,0.08)`, translateY(-2px)
- **Tap (mobile):** Scale(0.995) on active

**Desktop variant (>= 768px):**
- Grid: 240px photo | 1fr content
- Photo radius: 12px 0 0 12px
- Content vertically centered

### 5.4 Bottom Sheet (`stop-detail-sheet`)
- **Trigger:** Tap on stop card (not on visited toggle)
- **Position:** Fixed bottom, max-height 88dvh, radius 24px top corners
- **Desktop:** Centered, max-width 480px, `translate(-50%, 100%) → translate(-50%, 0)`
- **Overlay:** `rgba(0,0,0,0.35)`, fades in
- **Handle:** 40x4px gray bar, centered top
- **Close button:** Top-right of hero, 36px circle, `rgba(0,0,0,0.4)` + blur, white X
- **Hero photo:** 16:10 aspect ratio, full width, overlay gradient
- **Hero text:** White, absolute bottom-left, Playfair Display 1.5rem
- **Body padding:** 20px 16px

**Sections inside sheet:**
1. **Metadata grid:** 2 columns on mobile, gap 12px. Each item: icon (16px, olive) + label (0.7rem muted) + value (0.78rem primary). Background: cream, radius 8px, padding 10px 12px.
2. **Audio player:** Cream container, border 1px `#f0ede8`, radius 12px. Play button: 40px circle, olive bg. Waveform bars: 24 bars, varying heights. Time: 0.7rem muted.
3. **Description:** 0.9rem, line-height 1.7. Collapsed: line-clamp 4. "Czytaj wiecej / Zwin" toggle.
4. **Links:** Stacked buttons, cream bg, border, olive text. Icon (map pin) + label.

### 5.5 FAB Map Button (`fab-map`)
- **Position:** Fixed bottom-right, 20px from edge + safe-area-inset-bottom
- **Size:** 52px circle
- **Background:** `#293b2e`
- **Icon:** Map pin, white, 22px
- **Shadow:** `0 8px 24px rgba(0,0,0,0.08)`
- **Hover:** Scale(1.05)
- **Tap:** Scale(0.95)

### 5.6 Map Modal (`map-modal`)
- **Trigger:** FAB tap
- **Position:** Fixed, full-screen, `translateY(100%) → translateY(0)`
- **Header:** Title "Mapa trasy" + close icon button
- **Body:** Full Leaflet map (ssr: false), markers for current day's stops
- **Close:** Tap header X or swipe down (optional enhancement)

### 5.7 Plan List Card (`plan-card` — for `/plans`)
Plan list page gets a light refresh to match the editorial language without full redesign.

**Card layout:**
- **Container:** White bg, border 1px `#e8e6e1`, radius 12px, shadow `0 1px 3px rgba(0,0,0,0.06)`
- **Cover photo:** Full-width top, aspect-ratio 16:9 (if plan has cover image), otherwise cream bg with olive map-pin icon centered
- **Content padding:** 16px
- **Title:** `Playfair Display` 600, 1.15rem, `#293b2e`
- **Description:** `Outfit` 400, 0.82rem, `#6b6b6b`, line-clamp 2
- **Meta strip:** `Outfit` 400, 0.75rem, `#9a9a9a` — days count, stops count, date range
- **Slug:** Removed from visible card (internal only)
- **Archive action:** Bottom of card as text link (`Archiwizuj` / `Przywroc`) instead of floating pill button
- **Hover (desktop):** Shadow elevation + translateY(-2px)

**Empty state:** Centered olive map-pin icon + "Nie masz jeszcze planow" + subtle CTA to create (if applicable).

**Header (`/plans`):**
- Title: `Playfair Display` 600, 1.5rem, `#293b2e`
- Subtitle: `Outfit` 400, 0.85rem, `#6b6b6b`
- Archive link: Text link below list, `#6b6b6b` → `#293b2e` on hover

---

## 6. Design Tokens

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| `--olive` | `#293b2e` | Primary brand, headers, active states, FAB |
| `--olive-light` | `#3d5a45` | Hover states, secondary olive |
| `--cream` | `#faf9f7` | Page background, metadata bg |
| `--white` | `#ffffff` | Cards, sheet bg, badge bg |
| `--gold` | `#c9a96e` | Accents: links hover, waveform highlight, decorative |
| `--gold-light` | `#e8d5a3` | Subtle accents, hover highlights |
| `--text-primary` | `#1a1a1a` | Body text, titles |
| `--text-secondary` | `#6b6b6b` | Summaries, meta, inactive tabs |
| `--text-muted` | `#9a9a9a` | Labels, timestamps, disabled |
| `--border` | `#e8e6e1` | Card borders, dividers |
| `--border-light` | `#f0ede8` | Subtle borders, audio container |

### Typography
| Role | Font | Weights | Usage |
|---|---|---|---|
| Display | `Playfair Display` | 400i, 600, 700 | Plan title, stop titles, sheet hero |
| UI / Body | `Outfit` | 400, 500, 600 | Meta, labels, buttons, summaries, descriptions |

**Scale:**
- Plan title: 1.5rem (mobile) / 1.8rem (desktop), weight 600, tracking -0.01em
- Stop title: 1.15rem, weight 600
- Sheet hero title: 1.5rem, weight 600
- Summary / meta: 0.82rem, weight 400
- Description: 0.9rem, weight 400, line-height 1.7
- Labels: 0.7rem, weight 400, color muted
- Buttons: 0.85rem, weight 500

### Spacing
- Page padding: 16px mobile / 24px desktop
- Card gap: 20px mobile / 24px desktop
- Card internal padding: 16px mobile / 20px desktop
- Section gap inside sheet: 20px

### Shadows
| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` |
| `--shadow-md` | `0 8px 24px rgba(0,0,0,0.08)` |
| `--shadow-lg` | `0 16px 48px rgba(0,0,0,0.12)` |

### Radius
| Token | Value |
|---|---|
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 16px |
| `--radius-xl` | 24px |

---

## 7. Responsive Behavior

### Mobile (< 768px)
- Single column, full-width cards
- Map is FAB-triggered modal (not fixed)
- Bottom sheet slides up from bottom
- Day tabs horizontally scrollable
- Touch-first: tap cards, tap toggles

### Tablet / Desktop (>= 768px)
- Cards: horizontal layout (photo 240px left, content right)
- Max-width container: 640px centered
- Bottom sheet: centered modal (max-width 480px) sliding from bottom
- Hover states active
- Day tabs may wrap instead of scroll if space permits

### Large Desktop (>= 1024px)
- Max-width: 720px
- More whitespace around container

---

## 8. Interactions & Motion

### Entry Animations
- **Stop cards:** `fadeUp` — opacity 0→1, translateY 16px→0, duration 0.4s ease, staggered 0.05s per card
- **Sheet:** `translateY(100%) → translateY(0)`, 0.35s `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like)
- **Overlay:** opacity 0→1, 0.3s ease
- **Map modal:** `translateY(100%) → translateY(0)`, 0.35s ease

### Micro-interactions
- **Card hover (desktop):** shadow elevation + translateY(-2px), 0.2s ease
- **Card active (tap):** scale(0.995), 0.15s ease
- **Visited toggle:** instant color swap + checkmark pop (scale 1.1 → 1, 0.15s)
- **FAB hover:** scale(1.05) + shadow elevation
- **FAB active:** scale(0.95)
- **Day tab:** background/color transition 0.2s ease
- **Read more button:** underline on hover

### Scroll Behavior
- Header and day switcher sticky
- Smooth scroll when tapping day tab (optional: scroll to first stop of that day)
- Card photos: subtle scale(1.03) on card hover (desktop only, `transform` not `width`)

### Accessibility
- **Reduced motion:** All animations disabled (`prefers-reduced-motion`)
- **Focus management:** When sheet opens, focus traps inside sheet; close button is first focusable
- **Sheet close:** Escape key, tap overlay, tap close button
- **Visited toggle:** `aria-label` dynamic based on state
- **Day tabs:** `role="tablist"`, `role="tab"`, `aria-selected`
- **Images:** All photos have `alt` text from data
- **Color contrast:** All text passes WCAG AA against backgrounds

---

## 9. Pre-PRD Checklist

- [x] User outcome: turysta widzi plan jako narracyjna historie, nie sucha liste
- [x] Primary flow: open plan → scroll cards → tap card → bottom sheet with detail
- [x] Failure states: empty stop list ("Brak przystankow na ten dzien."), no photo fallback (solid cream bg + icon), offline map (placeholder with message)
- [x] Accessibility: keyboard nav, focus trap, reduced motion, contrast, labels
- [x] Performance: lazy-load images (`loading="lazy"`), `transform` animations only, no layout thrash
- [x] Interface quality: prototype validated via screenshots
- [x] Taste route: Design Read + dials declared
- [x] Design system: tokens defined above
- [x] Trust: user knows what happens after tap (card opens sheet, toggle marks visited)
- [x] Undo / escape: close sheet via X, overlay tap, Escape key; uncheck visited
- [x] Metrics: task success (open detail), visited toggle rate, day switch rate
- [x] Validation: prototype screenshots + user feedback (user explicitly likes photo-guide style)

---

## 10. Open Questions

1. **Zdjecia dla kazdego stopu?** Prototyp zaklada zdjecia. Jesli nie wszystkie stopy maja photo, potrzebny fallback: cream bg + lokalizacja icon (map pin).
2. **Reorder — jak zaimplementowac w kartach?** Drag-and-drop na kartach z zdjeciami jest trudniejsze niz w gestych wierszach. Rozwiazanie: tryb "Edytuj" wlaczany przez przycisk w headerze, ktory pokazuje drag-handles.
3. **Czy redesign obejmuje tez liste planow (`/plans`)?** Obecnie skupiam sie na viewerze. Lista planow moze dostac light refresh (zdjecia cover, lepsza typografia), ale to poza MVP tego PRD.
4. **Audio — czy player powinien grac w tle przy zamknietym sheecie?** Aktualnie nie; audio jest lokalne dla stopu. Mozna rozwazyc mini-player sticky na dole, ale to poza MVP.

---

## 11. Resolved Decisions

1. **Mapa nie jest fixed** — staje sie FAB-triggered modal. Uzytkownik otwiera mape tylko gdy potrzebuje orientacji, nie domyslnie.
2. **Detail jako bottom sheet, nie inline panel** — standardowy mobile pattern, nie psuje scrolla listy.
3. **Serif (Playfair Display) dla tytulow** — bezposrednie nawiazanie do fotoprzewodnika. UI text w sans (Outfit).
4. **Emoji zastapione SVG** — profesjonalny wyglad, skalowalne ikony.
5. **Kolory z fotoprzewodnika** — dark olive + warm cream + muted gold. Nie generyczny travel-green.

**Resolved decisions (plan list):**
6. **Karty planow z cover photo** — editorial cards zamiast generic list
7. **Slug ukryty** — wewnetrzny identyfikator, nie widoczny dla uzytkownika
8. **Archiwizacja jako text link** — mniej inwazyjna niz floating pill

---

## 12. Prototype Artifacts

- **Prototype:** `docs/research/prototypes/2026-08-20-turistguide-redesign/index.html`
- **Screenshots:**
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/mobile-list.png`
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/mobile-detail.png`
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/desktop-list.png`
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/desktop-detail.png`
- **Research note:** `docs/research/2026-08-20-turistguide-redesign.md`

---

## 13. Execution Notes

**Stack:** Next.js + vanilla CSS (istniejacy). Nie Tailwind — projekt uzywa `globals.css` z CSS variables.

**Font loading:** Uzyc `next/font` dla Playfair Display i Outfit. Nie linkowac Google Fonts przez `<link>`.

**Leaflet:** Zachowac dynamic import z `ssr: false`. Map modal moze uzywac tego samego `TravelMap` komponentu.

**Dnd-kit:** Zachowac dla reorder. W trybie "Edytuj" pokazac drag-handles na kartach.

**Image optimization:** Uzyc `next/image` dla zdjec stopow. Dodac `sizes="(max-width: 768px) 100vw, 240px"`.

**Component changes:**
- `plan-viewer-client.tsx` — nowa struktura layoutu (bez fixed map, z FAB i sheet)
- `stop-list.tsx` — zamienic na `stop-cards.tsx` (karty zamiast listy)
- `stop-detail.tsx` — przerobic na bottom sheet (albo nowy komponent `stop-detail-sheet.tsx`)
- `day-switcher.tsx` — restyle tabs, zachowac logike
- `globals.css` — dodac nowe zmienne, font-face declarations

**Nie modyfikowac:**
- API routes (`/api/plans/*`, `/api/stops/*`)
- Data model (`PlanReadModel`, `StopItem`)
- Offline features (offline-dialog, offline-badge, offline-map)
- Settings menu (poza restylem jesli potrzeba)
