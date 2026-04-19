# Turistguide Maps v1

## What
Mobile-first TypeScript web application built with Next.js for viewing personal travel plans with a synchronized map. A plan contains ordered travel days, and each day contains ordered stops. The app should feel calm, elegant, and spatially intuitive on mobile first, while still adapting well to desktop. Data is stored in local Postgres and managed only through a REST API. There is no editor UI in v1.

## Requirements
- User can view a list of travel plans.
- User can open a single plan by slug.
- User can switch between days of a plan, with one active day shown as the main focus.
- User can view ordered stops for the active day.
- User can select a stop from the list and see its details in a dedicated details surface.
- User can select a map marker and the matching stop becomes active in the list/details view.
- System keeps list selection, details view, and map selection synchronized.
- System shows active-day stops prominently on the map while preserving enough spatial context to avoid disorientation across the full trip.
- Each stop includes title, description, coordinates, and zero or more labeled links.
- REST API supports CRUD for plans, days, and stops.
- REST API supports reordering days and reordering stops within a day.
- Read API returns a full plan read model optimized for the viewer so the frontend does not need to stitch many requests.
- System validates malformed coordinates and invalid URLs with deterministic API errors.
- System stores data in local Postgres.
- Project includes seed/demo data so the viewer can be exercised immediately after setup.

## Technical Constraints
- Language: TypeScript only.
- Framework: Next.js.
- Styling: modern responsive UI suitable for mobile-first implementation.
- Architecture: keep v1 lean, but structure code so the project can evolve toward Ports & Adapters with clear domain boundaries and future MCP integration.
- Database: local Postgres.
- ORM / DB tooling: acceptable to use a mainstream TypeScript-friendly solution such as Drizzle.
- Mapping: use a web map library suitable for interactive markers and responsive map/list synchronization.
- Testing: include meaningful automated tests for domain logic and core API behavior.
- Runtime: local development on macOS, suitable for later deployment behind existing nginx/cloudflared setup.

## Suggested Domain Model
- Plan: id, slug, title, description, createdAt, updatedAt.
- Day: id, planId, dayNumber, optional title, description.
- Stop: id, dayId, title, description, lat, lng, sortOrder, links[].
- StopLink: label, url.

## UX Notes
- Mobile first is mandatory.
- This is not a dashboard and not an admin CRUD panel.
- Viewer should prioritize calm reading and map comprehension over dense controls.
- Details for the selected stop should have a stable, intentional place in the layout rather than feeling like an accidental popup.
- Day navigation must scale beyond short weekend trips.

## Out of Scope
- UI editor/admin panel.
- MCP server.
- Hermes skill integration.
- Multi-user auth or permissions.
- Drag-and-drop reordering.
- Photos, tags, comments, or collaboration.
- Route optimization or external places enrichment.
- Public sharing workflows beyond normal local/deployment access.
