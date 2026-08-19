# Turistguide Maps — Project Context

## Session Bootstrap

On every new session in this project:
- `/skill turistguide-maps` — load project skill (architecture, patterns, deployment)
- Verify stack: `npm run test` (should pass), `npm run build` (should succeed)

## Active Resources

- **MCP server:** `turistguide-maps` → `~/projects/turistguide-maps/bin/turistguide-maps-mcp.mjs`
- **Database:** turistguide-maps PostgreSQL (via Drizzle ORM)
- **Production:** `turistguide.karwackid.cloud` (behind Cloudflare Access)

## Local Runtime / Public Exposure

- Expected exposed local port: `3000`
- Bind address: `127.0.0.1`
- Public hostname: `turistguide.karwackid.cloud`
- Host port registry: `/Users/damiankarwacki/projects/infra/PORTS.md`

Cloudflare Tunnel routes `turistguide.karwackid.cloud` directly to `http://127.0.0.1:3000`. If `next dev` or `next start` uses a different port, verify the running process before changing tunnel routing.

## Architecture Reminders

- **Leaflet SSR Fix:** All Leaflet components must dynamic-import with `ssr: false`
- **Fakes are test-only:** `src/fakes/` never used at runtime
- **No `NODE_ENV` ternary:** `src/composition-root.ts` exports single `AppLayer`
- **Stop list ≠ detail:** List shows order+title only; detail view has full info + Google Maps link
- **Dev vs prod:** `next dev` shows overlay icon; `next start` does not. Never deploy `next dev`.

## Verification Checklist

- [ ] `npm run test` passes
- [ ] `npm run build` succeeds with zero errors
- [ ] Dynamic import `ssr: false` for Leaflet
- [ ] MCP launcher used (not direct `tsx src/mcp/server.ts`)
- [ ] No raw Google Maps data in wiki pages (ToS)
