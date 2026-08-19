---
name: travel-photo-article
description: Creates and publishes a Turistguide Maps travel photo article: a place-led editorial companion to a mapped itinerary, with attributable imagery and scene-based captions. Use when the user asks for a photo guide, travel story, visual article, National Geographic-like editorial treatment, or an artifact under /artifacts/.
---

# Travel Photo Article

Build a visually led companion to a Maps plan. The map answers logistics; the article makes the destination worth anticipating.

## Editorial boundary

- Keep schedules, drive times, parking, reservations, accommodation configurations, checklists, and plan-management controls in `/plans/[slug]`.
- Put place character, history, culture, food, landscape, a small number of high-value recommendations, and selected practical judgment in the article.
- Read the relevant Turistguide wiki itinerary, destination, experience, and food/topic pages before writing. Use the wiki synthesis; return to raw or live research only for a missing, contradictory, or time-sensitive claim.
- Do not copy National Geographic text, a named author’s voice, or a specific article’s structure. Transfer editorial techniques, not protected expression.

## Build the story

1. Identify 3–6 chapters that are places, not days or logistics. Give each a clear reason to exist: for example landscape, civic history, food, or a cultural contrast.
2. Open with one thesis that explains the trip’s selection and pacing.
3. For each chapter, write:
   - a precise place-led heading;
   - one short narrative paragraph grounded in a durable fact or observable quality;
   - one `Warto wiedzieć`, `Smak miejsca`, `Nie przegap`, or equivalent micro-section;
   - one recommendation that changes how the traveler experiences the place.
4. Use one deliberate pause or visual interlude between denser chapters.
5. End with a final place that gives the journey a satisfying contrast or release.

## Caption rule

Every photo caption is one or two full Polish sentences:

1. Name the visible scene and its location as precisely as the photo metadata supports.
2. Add one fact, sensory detail, or traveler-facing observation that the pixels alone cannot convey.
3. Stop before a second idea becomes an explanation.

Use this working shape:

```text
[Widoczna scena] w [potwierdzone miejsce]. [Jeden kontekst lub trop dla podróżnika].
```

- If the image depicts only a general region, say so; do not assign it to a specific town, venue, or route without evidence.
- Keep photographer credit and Pexels photo-page link visible beside the caption.
- Avoid generic labels such as “widok Toskanii”, vague mood words, anthropomorphism, unsupported historic claims, and captions that merely restate the alt text.
- For the evidence and local TTS conventions, read `../turistguide/docs/national-geographic-caption-research.md` when revising captions or benchmarking editorial voice.

## Photos and attribution

- Use the local Pexels CLI workflow already documented in `../turistguide/references/pexels-photos.md`.
- Download only selected candidates. Keep the Pexels page URL, photographer, and an accurate alt text.
- Prefer the traveler’s own images whenever they are sharper, more specific, or show a real trip moment; preserve the supplied attribution/copyright information.
- Never claim an image shows a private venue unless the photo and source confirm it.

## Technical artifact workflow

1. Create or update the React/Vite article source under Turistguide’s `output/`.
2. Set Vite `base` to `/artifacts/<artifact-slug>/`.
3. Run the source project’s build and lint.
4. Publish the complete Vite `dist/` tree to:

```text
turistguide-maps/public/artifacts/<artifact-slug>/
```

5. Route `/artifacts/<artifact-slug>` and `/artifacts/<artifact-slug>/` to its `index.html` in `next.config.ts`.
6. Do not publish a Parcel `bundle.html` as the production article: its import-map asset paths are not reliable under Maps routing. Publish Vite’s HTML, JavaScript, CSS, and image assets together.
7. Run `npm run test:run` and `npm run build` in `turistguide-maps`, then use the approved release workflow.
8. Verify the clean URL without assuming a trailing slash. Assert that the HTML references:

```text
/artifacts/<artifact-slug>/assets/...
```

and that the JavaScript, CSS, and at least one JPEG return the expected content types.

## Completion criteria

- The article has a place-led thesis and 3–6 chapters.
- All imagery loads from the deployed clean URL.
- Every photo has an accurate scene caption plus visible credit.
- Maps remains the source for logistics; the article contains no duplicate operating checklist.
- Source build/lint, Maps tests, Maps build, and deployed resource checks pass.
