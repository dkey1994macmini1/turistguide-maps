# Design PRD: Turistguide Maps — Redesign (Editorial Itinerary v7)

**Data:** 2026-08-20
**Repo:** `~/projects/turistguide-maps`
**Dotyczy:** Plan viewer (`/plans/[slug]`) oraz plan list (`/plans`)
**Primary surface:** Mobile-first, desktop secondary
**Język:** Polish
**Wybrany kierunek:** v7 — Hero Header + Task List + Bottom Sheet + Map Modal

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

## 4. Proposed Design Direction: Editorial Itinerary v7

### Core Philosophy
"Kazdy przystanek to nie checkpoint — to historia." Przeksztalcic liste przystankow w pionowy scroll editorialny, gdzie kazda karta to mini-spread (zdjecie + tytul + zarys). Mapa jest dostepna, ale nie narzucajaca sie.

### Layout — Mobile (Primary)
```
┌─────────────────────┐
│ Hero Header (photo)  │  full-bleed photo + dark overlay + serif title
│ (back | title | meta)│
├─────────────────────┤
│ Day Switcher (h-scroll) │ sticky
├─────────────────────┤
│                      │
│ Stop Item 1          │  thumb + title + meta chips + check
│ Stop Item 2          │
│ Stop Item 3          │  scrollable
│ ...                  │
│                      │
├─────────────────────┤
│ [FAB Map]            │  fixed bottom-right
└─────────────────────┘
```

Tap na stop item → **bottom sheet** z pelnym detalem (hero photo, meta pills, opis, audio, links).
Tap na FAB → **map modal** (full-screen, markers, tap marker → detail card).

---

## 5. Component Specs

### 5.1 Hero Header (`hero-header`)
- **Background:** Full-bleed photo (`aspect-ratio: 16/10`, `object-fit: cover`)
- **Overlay:** Gradient `linear-gradient(to top, rgba(28,25,23,0.85), rgba(28,25,23,0.15))`
- **Top bar:** Back button + action icons (offline, settings) on semi-transparent circles
- **Title:** `Playfair Display` 600, 1.6rem, white, bottom-aligned
- **Meta:** White 0.7 opacity, dot separators, gold link to photo-guide
- **Height:** 220-320px (min/max constraints)

### 5.2 Day Switcher (`day-switcher`)
- **Position:** Sticky below hero, z-index: 90
- **Background:** Surface (`#fafaf9`)
- **Tabs:** Horizontal scroll, gap 6px, padding 10px 16px
- **Tab:** White bg, 1.5px border, rounded 6px, flex-col (num + title + meta)
- **Active:** Accent (`#9a3412`) bg, white text
- **Past:** Opacity 0.4
- **Content:** `D{number} · {title} · {done}/{total} zrob.`

### 5.3 Stop Item (`stop-item`)
- **Container:** White bg, border 1px `#e7e5e4`, radius 12px, no shadow
- **Layout:** Flex row — thumb (48px) | content (flex:1) | check (24px circle)
- **Thumb:** 48x48, radius 6px, `object-fit: cover`
- **Title:** `Outfit` 600, 0.88rem, `#1c1917`
- **Meta row:** Icon chips — clock (duration), $ (cost), triangle (warning)
- **Check toggle:** 24px circle, border 2px. Done: green fill + white checkmark
- **Visited state:** Opacity 0.45, title strikethrough
- **Tap:** Opens bottom sheet
- **Hover (desktop):** Border accent color

### 5.4 Bottom Sheet (`detail-sheet`)
- **Trigger:** Tap on stop item
- **Position:** Fixed bottom, max-height 92dvh, radius 20px top
- **Desktop:** Centered, max-width 480px
- **Overlay:** `rgba(0,0,0,0.25)`

**Sections:**
1. **Handle:** 36x4px gray bar
2. **Hero photo:** 16:9, gradient overlay, title + summary white text
3. **Meta pills:** Inline flex-wrap chips (duration, cost, reservation, bring, warning). Warning pill: amber bg.
4. **Description:** Collapsed (max-height 140px) with fade-out gradient. "Rozwiń opis" / "Zwiń" button. "Kopiuj" button in same row.
5. **Audio block:** Play button + waveform + actions (Odtwórz / Pobierz / Generuj). Amber bg if exists. Empty state: surface bg + "Generuj audio z opisu".
6. **Links:** Stacked buttons (Mapa, Rezerwacja, Google Maps). No "Pokaż na mapie" — map is FAB-only.

### 5.5 FAB Map Button (`fab-map`)
- **Position:** Fixed bottom-right, 16px from edge
- **Size:** 50px circle
- **Background:** Accent `#9a3412`
- **Icon:** Map pin, white
- **Shadow:** `0 4px 14px rgba(154,52,18,0.3)`

### 5.6 Map Modal (`map-modal`)
- **Trigger:** FAB tap
- **Position:** Fixed, full-screen, translateY slide
- **Header:** Title + close icon
- **Body:** Full Leaflet map (ssr: false)
- **Markers:** Numbered circles, accent color. Active: ink color, scaled up. Visited: green.
- **Tooltip:** Hover/tap on marker → label above marker
- **Bottom card:** Tap marker → card appears at bottom with thumb + title + meta + "Otwórz" button → opens detail sheet

### 5.7 Plan List Card (`plan-card` — for `/plans`)
Plan list page gets a light refresh to match the editorial language.

**Card layout:**
- **Container:** White bg, border 1px `#e7e5e4`, radius 12px, no shadow
- **Cover photo:** Full-width top, aspect-ratio 16:9 (if plan has cover image), otherwise surface bg with map-pin icon
- **Content padding:** 16px
- **Title:** `Playfair Display` 600, 1.15rem, `#1c1917`
- **Description:** `Outfit` 400, 0.82rem, `#78716c`, line-clamp 2
- **Meta strip:** `Outfit` 400, 0.75rem, `#a8a29e` — days count, stops count, date range
- **Slug:** Removed from visible card (internal only)
- **Archive action:** Bottom of card as text link (`Archiwizuj` / `Przywroc`) instead of floating pill button
- **Hover (desktop):** Border accent color

---

## 6. Design Tokens

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| `--ink` | `#1c1917` | Primary text, headers, active marker |
| `--stone` | `#78716c` | Secondary text, meta |
| `--muted` | `#a8a29e` | Labels, timestamps, disabled |
| `--border` | `#e7e5e4` | Card borders, dividers |
| `--surface` | `#fafaf9` | Page background, pill bg |
| `--bg` | `#ffffff` | Card bg, sheet bg |
| `--accent` | `#9a3412` | Primary accent: FAB, active tab, CTA, hover border, play button |
| `--accent-light` | `#fff7ed` | Audio block bg, subtle highlights |
| `--done` | `#059669` | Visited check, done marker |
| `--warn` | `#d97706` | Warning pills, alerts |

### Typography
| Role | Font | Weights | Usage |
|---|---|---|---|
| Display | `Playfair Display` | 600, 700 | Hero title, sheet hero, plan list title |
| UI / Body | `Outfit` | 400, 500, 600, 700 | All other text |

**Scale:**
- Hero title: 1.6rem, weight 600, white
- Sheet hero title: 1.3rem, weight 600, white
- Stop title: 0.88rem, weight 600
- Description: 0.9rem, weight 400, line-height 1.7
- Meta / labels: 0.75rem, weight 400-500
- Buttons: 0.78rem, weight 600

### Spacing
- Page padding: 16px
- Card gap: 8px
- Card internal padding: 12px
- Section gap inside sheet: 16px

### Shadows
- No card shadows (clean editorial look)
- FAB: `0 4px 14px rgba(154,52,18,0.3)`
- Map card: `0 -4px 20px rgba(0,0,0,0.12)`

### Radius
| Token | Value |
|---|---|
| `--radius-sm` | 6px |
| `--radius` | 12px |
| `--radius-lg` | 20px |

---

## 7. Responsive Behavior

### Mobile (< 768px)
- Single column, full-width
- Hero header with photo
- Bottom sheet slides from bottom
- Map is full-screen modal
- Day tabs horizontally scrollable

### Tablet / Desktop (>= 768px)
- Centered container max-width 640px
- Sheet centered modal (max-width 480px)
- Map modal full-screen but could be side-panel in future

---

## 8. Interactions & Motion

### Entry Animations
- **Stop items:** `fadeUp` — opacity 0→1, translateY 8px→0, duration 0.25s, staggered 0.03s
- **Sheet:** `translateY(100%) → translateY(0)`, 0.35s spring-like
- **Overlay:** opacity 0→1, 0.3s ease
- **Map modal:** `translateY(100%) → translateY(0)`, 0.35s ease

### Micro-interactions
- **Card hover (desktop):** border color → accent
- **Card active (tap):** scale(0.995)
- **Check toggle:** instant color swap
- **FAB hover:** scale(1.05)
- **FAB active:** scale(0.95)
- **Day tab:** background/color transition 0.15s
- **Read more button:** underline on hover
- **Marker tap:** scale(1.2), z-index bump

### Scroll Behavior
- Hero header scrolls with page (not fixed after initial view)
- Day switcher sticky
- Smooth scroll when switching days (optional)

### Accessibility
- **Reduced motion:** All animations disabled
- **Focus management:** When sheet opens, focus traps inside; close button first focusable
- **Sheet close:** Escape key, tap overlay, tap close button
- **Visited toggle:** `aria-label` dynamic
- **Day tabs:** `role="tablist"`, `role="tab"`, `aria-selected`
- **Images:** All photos have `alt` text

---

## 9. Pre-PRD Checklist

- [x] User outcome: turysta widzi plan jako narracyjna historie, nie sucha liste
- [x] Primary flow: open plan → scroll list → tap item → bottom sheet with detail
- [x] Failure states: empty stop list, no photo fallback, offline map placeholder
- [x] Accessibility: keyboard nav, focus trap, reduced motion, contrast, labels
- [x] Performance: lazy-load images, `transform` animations only
- [x] Interface quality: prototype validated via screenshots
- [x] Taste route: Design Read + dials declared
- [x] Design system: tokens defined above
- [x] Trust: user knows what happens after tap (sheet opens, toggle marks visited)
- [x] Undo / escape: close sheet via X, overlay tap, Escape key; uncheck visited
- [x] Metrics: task success (open detail), visited toggle rate, day switch rate
- [x] Validation: prototype screenshots + user feedback

---

## 10. Open Questions

1. **Zdjecia dla kazdego stopu?** Prototyp zaklada zdjecia. Jesli nie wszystkie stopy maja photo, potrzebny fallback: surface bg + lokalizacja icon.
2. **Reorder — jak zaimplementowac w kartach?** Drag-and-drop na kartach z zdjeciami jest trudniejsze niz w gestych wierszach. Rozwiazanie: tryb "Edytuj" wlaczany przez przycisk w headerze, ktory pokazuje drag-handles.
3. **Czy redesign obejmuje tez liste planow (`/plans`)?** Obecnie skupiam sie na viewerze. Lista planow moze dostac light refresh (zdjecia cover, lepsza typografia), ale to poza MVP tego PRD.

---

## 11. Resolved Decisions

**Resolved decisions (plan viewer):**
1. **Mapa nie jest fixed** — staje sie FAB-triggered modal
2. **Detail jako bottom sheet, nie inline panel**
3. **Header jako hero photo** — full-bleed z gradient overlay, jak fotoprzewodnik
4. **Serif (Playfair Display) dla tytulow** — bezposrednie nawiazanie do fotoprzewodnika
5. **Emoji zastapione SVG**
6. **Meta jako inline pills, nie grid** — bardziej czytelne i kompaktowe
7. **Opis z fade-out + "Rozwiń"** — nie zalewa UI gdy dlugi
8. **Audio jako blok ponizej opisu** — secondary, nie primary
9. **Kolory wlasne, nie z fotoprzewodnika** — near-black + stonowany brick accent + warm neutrals
10. **FAB = mapa wewnetrzna, Google Maps = tylko external link** — brak redundancji
11. **Map marker tap → bottom card → detail sheet** — pelna interakcja mapy

**Resolved decisions (plan list):**
12. **Karty planow z cover photo** — editorial cards zamiast generic list
13. **Slug ukryty** — wewnetrzny identyfikator, nie widoczny dla uzytkownika
14. **Archiwizacja jako text link** — mniej inwazyjna niz floating pill

---

## 12. Prototype Artifacts

- **Prototype v7 (final):** `docs/research/prototypes/2026-08-20-turistguide-redesign/index-v7.html`
- **Screenshots:**
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/v7-final-list.png`
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/v7-final-sheet.png`
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/v7-expanded.png`
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/v7-map.png`
  - `docs/research/prototypes/2026-08-20-turistguide-redesign/screenshots/v7-map-marker.png`
- **Research note:** `docs/research/2026-08-20-turistguide-redesign.md`

---

## 13. Execution Notes

**Stack:** Next.js + vanilla CSS (istniejacy). Nie Tailwind — projekt uzywa `globals.css` z CSS variables.

**Font loading:** Uzyc `next/font` dla Playfair Display i Outfit. Nie linkowac Google Fonts przez `<link>`.

**Leaflet:** Zachowac dynamic import z `ssr: false`. Map modal moze uzywac tego samego `TravelMap` komponentu.

**Dnd-kit:** Zachowac dla reorder. W trybie "Edytuj" pokazac drag-handles na kartach.

**Image optimization:** Uzyc `next/image` dla zdjec stopow. Dodac `sizes="(max-width: 768px) 100vw, 240px"`.

**Component changes:**
- `plan-viewer-client.tsx` — nowa struktura layoutu (hero header, lista, FAB, sheet, map modal)
- `stop-list.tsx` → `stop-cards.tsx` (karty zamiast listy)
- `stop-detail.tsx` → `stop-detail-sheet.tsx` (bottom sheet zamiast inline panel)
- `day-switcher.tsx` — restyle tabs, zachowac logike
- `globals.css` — dodac nowe zmienne, font-face declarations
- Nowy: `map-modal.tsx` — full-screen map z marker interaction

**Nie modyfikowac:**
- API routes (`/api/plans/*`, `/api/stops/*`)
- Data model (`PlanReadModel`, `StopItem`)
- Offline features (offline-dialog, offline-badge, offline-map)
- Settings menu (poza restylem jesli potrzeba)
