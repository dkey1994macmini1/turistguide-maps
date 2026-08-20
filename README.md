# turistguide-maps

Mobile-first travel itinerary viewer for `https://turistguide.karwackid.cloud`.

Next.js 15, React, Leaflet, Effect, Drizzle, and PostgreSQL provide the web
viewer, offline snapshots, PDF export, and audio guides. The web UI keeps its
own REST editing workflow; agents and scripts manage itinerary data through the
one-shot CLI.

## Run

```bash
npm run dev
npm run test:run
npm run build
```

## CLI

The executable loads `.env` then `.env.local`; data commands require
`DATABASE_URL`.

```bash
node bin/turistguide-maps.mjs commands --json
node bin/turistguide-maps.mjs plan list --limit 50
node bin/turistguide-maps.mjs plan get --slug tuscany-family-august-2026
node bin/turistguide-maps.mjs stop add --slug trip --day 1 --input stop.json
```

All successful commands emit a JSON envelope to stdout. Failures emit one
structured JSON error to stderr. See [docs/cli-contract.md](docs/cli-contract.md)
for command, input, confirmation, and exit-code semantics.

## Deployment

Use `scripts/release.sh` for the local production deployment. It tests, builds,
restarts the Next.js server on `127.0.0.1:3000`, and performs its smoke check.
