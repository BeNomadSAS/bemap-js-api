---
name: benomad-tiles-integration
description: >
  Integrate BeNomad Tiles (vector PMTiles served by the authenticated
  Cloudflare Worker at mptiles-api*.benomad.net) and the BeMap JS API into a
  customer application. Use whenever someone wants to embed a BeNomad map,
  authenticate tile requests (login / token / X-Session-Token / ?token=),
  choose between the web SDK, raw MapLibre + PMTiles Range requests, or mobile
  z/x/y tiles, or debug 401/403/CORS/gzip/"Access Denied" tile errors. Triggers
  on "bemap-js-api", "MapLibreMap", "pmtiles", "mptiles-api", "X-Session-Token",
  "BeNomad Tiles", "intégrer les tuiles", "tuiles vectorielles", "charte BeNomad".
  This is the CUSTOMER-FACING integration guide (distinct from the internal
  benomad-frontend conventions skill).
---

# BeNomad Tiles — Integration Guide (customer-facing)

Helps a customer wire BeNomad Tiles + BeMap JS API into their app on the first
try. It is the corrected source of truth: it fixes the two traps that break
copy-pasted integrations (services that don't exist in the bundle; server
clients blocked by the gateway). UI strings shown to end users go in the
customer's language; this guide is bilingual-friendly.

## The 3 integration paths — pick one

| Path | Who it's for | How tiles are fetched | Template |
| --- | --- | --- | --- |
| **A. Web SDK** (recommended) | Web apps that want maps + geocoding/routing/EV with one library | The SDK handles login, JWT, `transformRequest`, cache | `templates/web-sdk.html` |
| **B. Web raw** | Web apps already on MapLibre GL that only want the basemap | `pmtiles://` + HTTP **Range** requests on `/default.pmtiles` | `templates/web-raw-maplibre.html` |
| **C. Mobile / fleet** | Native apps (Flutter, Kotlin, Swift) or server-to-server | Individual `/{file}/{z}/{x}/{y}.pbf` tiles (SQLite ambient cache) | `templates/mobile-flutter.dart` |

If unsure → **Path A**. It's the least code and the least error-prone.
For production credentials handling → `templates/backend-token-proxy.md`.

## Cardinal rules (these are where integrations break)

1. **BeMap JS API services: use the v1 class names.** The shipped bundle exposes
   `bemap.Geocoder`, `bemap.ReverseGeocoder`, `bemap.Routing`, `bemap.RoutingV2`,
   `bemap.ChargingStations`, `bemap.EvVehicles`, `bemap.Isochrone`. The `*V2`
   names some docs/`llms.txt` advertise (`GeocoderV2`, `ChargingStationsV2`, …)
   **do NOT exist** except `RoutingV2`. Never write `new bemap.GeocoderV2(...)`.
2. **Coordinates are lon-then-lat everywhere.** `new bemap.Coordinate(lon, lat)`,
   `map.move(lon, lat, zoom)`. Getting this backwards is the #1 "my point is in
   the ocean" bug.
3. **Tiles are gzip via content-negotiation.** The Worker gzips only when the
   client sends `Accept-Encoding: gzip`. Browsers do this and **auto-decompress**
   — do NOT gunzip again. Native/server HTTP clients that don't negotiate may
   receive raw gzip (`1f 8b`) and must gunzip before parsing MVT.
4. **Server-to-server clients must send a real `User-Agent`.** The gateway can
   `403` bot-like agents (e.g. the default `Python-urllib`, some HTTP libs). A
   `403` with valid credentials from a non-browser client usually means the UA
   was filtered — set an explicit UA, and if your domain must be allowlisted,
   contact BeNomad.
5. **Web origins must be CORS-allowlisted.** From a browser, login + tiles work
   only if your site origin is allowlisted by BeNomad. If you get opaque network
   failures cross-origin, ask BeNomad to allowlist your origin.
6. **`geocoding-direct` and EV are per-account entitlements.** A `400 "Access
   Denied"` on geocoding or charging-stations means the account is not
   provisioned for that service — it is NOT a code bug. Reverse-geocoding and
   routing may be granted while direct geocoding / EV are not.
7. **Never patch `window.fetch` to inject the token.** The SDK uses MapLibre's
   `transformRequest`. For raw MapLibre, use `transformRequest` or the `?token=`
   query — see the raw template.
8. **Never ship credentials in client code for production.** Use the backend
   token provider (`templates/backend-token-proxy.md`). Direct login/password in
   the browser is acceptable only for demos/evaluations.

## Environments & auth (quick reference — full contract in `references/api-contract.md`)

| Env | Tiles base | BeMap host (JS API auth) |
| --- | --- | --- |
| beta | `https://mptiles-api-beta.benomad.net` | `bemap-beta.benomad.com` |
| preprod | `https://mptiles-api-preprod.benomad.net` | `bemap-preprod.benomad.com` |
| prod | `https://mptiles-api.benomad.net` | `bemap.benomad.com` |

- Login: `POST {tilesBase}/api/login` with `Authorization: Basic base64(login:password)` → `{ ok, username, token }`. **Token valid 1 h**; re-login on `401`.
- Pass the token 3 ways: **cookie** (`credentials:'include'`, default, no preflight), **header** `X-Session-Token: <token>`, or **query** `?token=<token>` (mobile fallback).
- Discovery: `GET /api/maps` → `{ default, defaultStyle, tilesets, styles }`; `GET /api/default-style`.
- Use the alias `default` for tiles, never a raw filename.

## Workflow when helping a customer

1. Ask which path (A/B/C) and which environment. Default to A + the customer's env.
2. Copy the matching template, fill in env host + tilesHost. For production, wire the backend token provider instead of inline credentials.
3. Read `references/api-contract.md` for exact endpoints, status codes, limits, and style-placeholder substitution.
4. If anything fails, go to `references/troubleshooting.md` — it maps every symptom (401/403/CORS/gzip/blank map/"Access Denied") to a cause and fix.
5. To validate end-to-end, point them at the BeNomad test bench (3-brick GO/NO-GO + tile-hang detector) if available.

## Limits

Token 1 h · rate limit **100 req/s** per user (throttle bulk clients) · Range **> 10 MB → 403** · no Range on `.pmtiles` → 403 · HTTPS mandatory.
