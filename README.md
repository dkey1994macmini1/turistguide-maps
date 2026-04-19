# turistguide-maps

Static travel maps for `turistguide.karwackid.cloud`.

## Structure

- `public/index.html` — landing page
- `public/oahu/index.html` — Oahu trip map based on OpenStreetMap + Leaflet

## Local preview

From the project root:

```bash
python3 -m http.server 8787 -d public
```

Then open:

- `http://127.0.0.1:8787/`
- `http://127.0.0.1:8787/oahu/`

## Deployment

Served directly by local nginx on macOS and exposed through Cloudflare Tunnel at:

- `https://turistguide.karwackid.cloud/`
- `https://turistguide.karwackid.cloud/oahu/`
