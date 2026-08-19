# Turistguide Maps — UX/UI Redesign Research

**Data:** 2026-08-20
**Repo:** `~/projects/turistguide-maps`
**Live URL:** https://turistguide.karwackid.cloud/plans/tuscany-family-august-2026
**Reference (liked):** https://turistguide.karwackid.cloud/artifacts/tuscany-family-august-2026
**Primary surface:** Mobile-first (desktop jako drugorzędny)
**Language:** Polish

---

## Design Read

Reading this as: **travel-plan viewer** for **tourists/families on mobile**, with a **Polish** language, leaning toward **Next.js + vanilla CSS + Leaflet**.

The user explicitly likes the photo-guide's editorial, storytelling visual style and wants the plan-viewer to match that energy. The current plan-viewer is a generic utility — the redesign must inject editorial warmth and narrative rhythm into a functional itinerary tool.

### Taste-Skill Dials
- `DESIGN_VARIANCE: 8` — the gap between liked (editorial) and current (generic) is large; we're going for a meaningful visual shift
- `MOTION_INTENSITY: 4` — mobile-first means restrained, purposeful motion (scroll-linked reveals, tap feedback)
- `VISUAL_DENSITY: 5` — editorial storytelling needs breathing room, but itinerary data must remain scannable

**Primary taste skill:** `redesign-existing-projects` (existing-app upgrade) + `design-taste-frontend` (for editorial landing/visual direction)

---

## Current State Audit

### Screenshots captured
- `/tmp/turistguide/photo-guide-mobile.png` — reference, liked
- `/tmp/turistguide/plan-mobile.png` — current, disliked
- `/tmp/turistguide/plan-desktop.png` — current desktop

### What's in the photo guide (liked)
- **Hero:** Full-bleed destination photo with large serif title overlay, warm olive-green (`#293b2e`) header bar
- **Typography:** Serif display + clean sans-serif body; hierarchy through size/weight, not color
- **Layout:** Single-column editorial flow; photo bleeds edge-to-edge; text in generous padding
- **Color palette:** Dark olive header, warm cream/off-white body, black text, subtle gold/amber accents
- **Mood:** Magazine-quality, storytelling-first, immersive photography, calm authority
- **Interaction:** Scroll-driven narrative; each section feels like a magazine spread

### What's in the plan viewer (disliked)
- **Layout:** Fixed header + map (40vh) + scrollable list below. Map dominates the screen on load; list gets compressed.
- **Typography:** System sans-serif throughout; no display font; headings are small and weak (`1.25rem`)
- **Color palette:** Generic "green travel app" — `--color-primary: #2d6a4f`, `--color-primary-light: #52b788`. Safe but forgettable. Warm cream background (`#faf9f7`) is the only nice touch.
- **Components:**
  - Day tabs: horizontal scroll, green pill active state — functional but bland
  - Stop list items: drag handle + number + title + checkbox. Dense, utilitarian. No photos.
  - Stop detail panel: structured metadata rows with emoji icons. Informative but visually noisy.
  - Audio player: emoji buttons (🗑, 🔊, 📂, 📥, 📋) — feels like a prototype
- **Map:** Leaflet with default OSM tiles — functional but generic; marker cluster looks like any travel app
- **Interaction:** Checkbox toggle for "visited", drag-to-reorder, tap to open detail panel. No delight.
- **States:** Loading skeleton is minimal; empty state is plain; no offline state visuals beyond badge

### Audit Findings (redesign-existing-projects diagnose list)

#### Typography
- **System font throughout** — replace with a font that has character. Suggestion: `Outfit` or `Geist` for UI; pair with `Playfair Display` or `Source Serif 4` for editorial headers to match the photo-guide's serif personality
- **Headlines lack presence** — `1.25rem` for plan title is tiny; should be `2rem+` on mobile, `3rem+` on desktop
- **Only Regular (400) and Bold (700)** — introduce Medium (500) and SemiBold (600)
- **Missing letter-spacing** — large headers need `-0.02em` tracking; small labels need `+0.05em`

#### Color & Surfaces
- **Generic green** `#2d6a4f` — the most common "travel app" color. Replace with the photo-guide's dark olive `#293b2e` as the primary anchor
- **Warm cream body** `#faf9f7` — keep this; it's the one good thing from current design
- **Oversaturated accents** `#52b788` screams "AI green". Desaturate or replace with muted olive/sage
- **Flat shadows** — `rgba(0,0,0,0.08)` is generic. Tint shadows to the olive hue
- **Missing texture** — photo-guide has photo depth; plan-viewer is flat vectors

#### Layout
- **Map dominates on mobile** — 40vh is too much; on a phone it pushes the list below the fold. Map should be accessible but not primary.
- **No max-width container** — content stretches edge-to-edge on wide screens; needs `max-width: 420px` feel on mobile, centered on desktop
- **Sidebar on desktop** — rigid split-screen. Consider an editorial layout where map is contextual, not always visible.
- **Cards with border+shadow+white** — `plan-card` and `stop-list-item` both use this generic pattern. Remove borders; use spacing and subtle background shifts instead.
- **Missing whitespace** — stop list items are dense. Double padding; let items breathe.

#### Interactivity & States
- **No hover states on stop items** — add background shift, slight scale on tap
- **Instant transitions** — add `200-300ms` ease to all interactive elements
- **Emoji buttons** — replace with SVG icons (Phosphor or custom). Emoji are unprofessional.
- **Missing skeleton loaders** — current loading state is just "Loading..." text
- **No empty-state illustration** — "Brak przystanków" is plain

#### Content & Copy
- **"Loading..."** — generic. Use contextual copy.
- **Audio actions use emoji** — "🔊 Generuj audio", "🎤 Dodaj plik" — replace with text + icon
- **Metadata labels are emoji-based** — `⏱`, `💰`, `🎫` — replace with inline SVG icons

#### Component Patterns
- **Three generic cards on plan list** — functional but uninspired
- **Checkbox toggle for visited** — works but is joyless. Consider a more satisfying "done" interaction (strike-through + subtle animation)
- **Detail panel is a wall of metadata** — needs visual hierarchy: photo first, then summary, then expandable details

---

## Core UX Problem

The photo-guide answers: *"Where are we going and why is it amazing?"*
The plan-viewer answers: *"What do we do next?"* — but currently does so with zero emotional resonance.

The redesign must bridge these two modes: **storytelling warmth** + **actionable itinerary**. On mobile, the user is likely walking, driving, or standing in a queue — they need clarity first, beauty second. But beauty should reinforce clarity, not compete with it.

### User Jobs-to-be-Done (mobile context)
1. **Quick scan:** *"What's next today?"* — see the next 2-3 stops at a glance
2. **Deep dive:** *"Tell me about this place"* — photo, description, audio, practical info
3. **Orientation:** *"Where is it on the map?"* — map as context, not primary UI
4. **Progress tracking:** *"What have we done?"* — visited/done state
5. **Day navigation:** *"What about tomorrow?"* — switch days easily

### Constraints
- Must work offline (offline snapshot already built)
- Must preserve Leaflet SSR fix (`ssr: false`)
- Must keep existing data model (stops, days, audio, metadata)
- Must not break drag-and-drop reorder (dnd-kit)
- Mobile-first; desktop is secondary

---

## Three Directions

### Direction A: Conservative — Polish the Current
**Idea:** Keep current layout (map + list), fix colors, typography, spacing. Keep all existing functionality.

**Changes:**
- Swap to dark olive `#293b2e` primary, keep warm cream background
- Add serif font for headers (Playfair Display via Google Fonts)
- Increase spacing in stop list items
- Replace emoji with SVG icons
- Add hover/active states
- Polish loading/empty states

**Pros:** Low risk, fast to implement, preserves all UX patterns
**Cons:** Still feels like a generic travel app; map still dominates; doesn't capture the photo-guide's editorial soul

**Verdict:** Too safe. Won't solve the emotional gap.

---

### Direction B: Best-Fit — Editorial Itinerary
**Idea:** Transform the plan viewer into an editorial experience. Map becomes secondary (collapsible or contextual). Stop list becomes a storytelling scroll — each stop is a card with photo, title, and narrative summary. Tap to expand detail with full metadata.

**Changes:**
- **Mobile layout:** Full-width hero photo per stop. Scroll is vertical, editorial, like the photo-guide.
- **Map:** Floating mini-map button or pull-up sheet. Not fixed on screen.
- **Day switcher:** Horizontal scroll stays but styled as editorial chapter tabs (dark olive active, cream inactive)
- **Stop cards:** Photo on top (full-bleed or rounded corners), serif title, sans-serif summary, subtle "expand" indicator. Tap to open detail overlay/sheet.
- **Detail sheet:** Bottom sheet on mobile (not inline panel). Photo hero, description, metadata grid, audio player, Google Maps link.
- **Visited state:** Satisfying check animation (stroke draws), card opacity reduces slightly.
- **Colors:** Dark olive (`#293b2e`) primary, warm cream (`#faf9f7`) background, muted gold (`#c9a96e`) accent for CTAs/links, black text.
- **Typography:** `Playfair Display` (400, 600, 700) for display; `Outfit` or system sans (400, 500, 600) for UI text.
- **Motion:** Scroll-linked fade-in for cards; spring physics on sheet open/close; subtle parallax on stop photos.

**Pros:** Matches the photo-guide's editorial quality; storytelling + utility combined; map is available but not intrusive; bottom sheet is standard mobile pattern
**Cons:** More complex to implement; requires new layout components; offline map snapshot needs thought

**Verdict:** **Recommended.** Strongest fit between user's aesthetic preference and functional requirements.

---

### Direction C: Divergent — Immersive Map-First Story
**Idea:** Flip the paradigm. The map IS the story. Stops are presented as map-driven waypoints with rich popups. Scroll through stops and the map animates between them. List becomes a minimap timeline.

**Changes:**
- **Mobile:** Full-screen map as background; stop cards are horizontal swipeable overlays at the bottom (like Google Maps place cards)
- **Desktop:** Split screen but map is 60%, list is 40% — inverted from current
- **Card design:** Each stop card has photo, title, summary; swipe left/right to navigate stops; map pans to match
- **Audio:** Play button on card, not in detail panel
- **Detail:** Expand card to full-screen bottom sheet

**Pros:** Novel, immersive, very "travel app" feeling; leverages existing map investment
**Cons:** Complex to get right; horizontal swipe can conflict with map pan; requires significant Leaflet animation work; offline mode harder (map tiles); may overwhelm users who want a simple checklist

**Verdict:** Too risky for the current stack. Map-first works for discovery, not for "what do I do next today." The user's complaint is that the current UI looks bad, not that they want a different interaction model.

---

## Selected Direction: B — Editorial Itinerary

### Why
- Directly addresses the user's aesthetic preference (photo-guide style)
- Preserves all functional requirements (list, detail, map, audio, visited, reorder)
- Mobile-first: vertical scroll is the most natural mobile interaction
- Map is available but de-emphasized — correct priority for an itinerary viewer
- Bottom sheet for detail is a well-understood mobile pattern
- Editorial cards make each stop feel like a destination, not a todo item

### Trade-offs
- Stop list requires images (current data model may not have photos for all stops — need graceful fallback)
- Bottom sheet requires new component (can be built with CSS transforms, no new library needed)
- Drag-and-reorder becomes less obvious in a card layout — may need a dedicated "edit mode" toggle
- Offline map snapshot UI needs redesign (currently full-screen map replacement)

---

## Design Risks
1. **Photo availability:** Not all stops may have photos. Need a solid placeholder/fallback.
2. **Performance:** Large images in scroll list can cause jank. Need lazy loading and image optimization.
3. **Accessibility:** Bottom sheet must trap focus, handle swipe gestures, support screen readers.
4. **Offline:** Bottom sheet content must work offline (it does, since it's static data — but map needs fallback).
5. **Reorder friction:** Drag-to-reorder in a card list is harder than in a dense row. May need an explicit "Edit" mode.

---

## Key References
- **Photo guide:** https://turistguide.karwackid.cloud/artifacts/tuscany-family-august-2026 (liked style)
- **Current plan:** https://turistguide.karwackid.cloud/plans/tuscany-family-august-2026 (to redesign)
- **Pattern:** Google Maps bottom sheet (mobile), Apple Maps card carousel
- **Pattern:** Editorial card layouts (NYT Travel, Condé Nast Traveler mobile)

---

## Open Questions (for user)
1. Do all stops have photos, or should we design a fallback for photo-less stops?
2. Is drag-and-reorder used often, or can it move behind an "Edit" mode?
3. Should the redesign also cover the plan list page (`/plans`) or only the plan viewer (`/plans/[slug]`)?
