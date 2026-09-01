---
name: benomad-tiles-integration
description: >
  Integrate BeNomad Tiles (vector PMTiles served by the authenticated
  Cloudflare Worker at mptiles-api*.benomad.net) and the BeMap JS API into a
  customer application. Use whenever someone wants to embed a BeNomad map,
  authenticate tile requests (login / token / X-Session-Token / ?token=),
  choose between the web SDK, raw MapLibre + PMTiles, or mobile z/x/y tiles,
  or debug 401/403/CORS/gzip/"Access Denied" tile errors. Triggers on
  "bemap-js-api", "MapLibreMap", "pmtiles", "mptiles-api", "X-Session-Token",
  "tilesSliceMode", "ctx.proxy", "BeNomad Tiles", "intégrer les tuiles",
  "tuiles vectorielles", "charte BeNomad". This is the CUSTOMER-FACING
  integration guide (distinct from the internal benomad-frontend conventions
  skill).
---

# BeNomad Tiles — Integration Guide (customer-facing)

Helps a customer wire BeNomad Tiles + BeMap JS API into their app on the first
try. It is the corrected source of truth: it fixes the traps that break
copy-pasted integrations (class names that don't exist in the bundle; server
clients blocked by the gateway). UI strings shown to end users go in the
customer's language; this guide is bilingual-friendly.

**Verified against `dist/bemap-js-api.js` v2.0.4 and live beta on 2026-08-26.**
When this disagrees with `llms.txt`, THIS wins.

## The 3 integration paths — pick one

| Path | Who it's for | How tiles are fetched | Template |
| --- | --- | --- | --- |
| **A. Web SDK** (recommended) | Web apps that want maps + geocoding/routing/EV with one library | The SDK handles login, JWT, `transformRequest`, cache. Reads slices as **cacheable 200s** by default (see below) | `templates/web-sdk.html` |
| **B. Web raw** | Web apps already on MapLibre GL that only want the basemap | `pmtiles://` + HTTP **Range** requests on `/default.pmtiles` | `templates/web-raw-maplibre.html` |
| **C. Mobile / fleet** | Native apps (Flutter, Kotlin, Swift) or server-to-server | Individual `/{file}/{z}/{x}/{y}.pbf` tiles (SQLite ambient cache) | `templates/mobile-flutter.dart` |

If unsure → **Path A**. It's the least code and the least error-prone.
For production credentials handling → **proxy mode** (rule 8) or
`templates/backend-token-proxy.md`.

## How the SDK reads the archive (changed in 2.0.1 — read this)

Since 2.0.1 the default is **`tilesSliceMode: '200'`**, not HTTP Range:

- **`'200'` (default)** — slices are read as `GET <archive>?r=<start>-<end>`, with
  **no `Range` header**, so the Worker answers **HTTP 200** with
  `Cache-Control: immutable`. Browsers cache 200s natively; they do *not*
  reliably cache 206 partials. That is the whole point of the mode, and it is
  why the tile **Service Worker auto-disables** here.
- **`'range'`** (alias `'206'`) — the classic `Range: bytes=A-B` path,
  byte-for-byte unchanged. This is what `pmtiles.js` does on its own, so
  **Path B still uses Range**.

Both routes return identical bytes (verified: 16 384 octets either way). Related
map options: `tileGate` (retry/abort gate, default on), `recoverableCache`
(default on), `rangeCacheMode`. `map.getTilesConfig()` dumps the resolved set —
use it before debugging anything tile-shaped.

## Engines

Three engines ship: **`bemap.MapLibreMap`** (MapLibre GL v5),
**`bemap.LeafletMap`** (Leaflet 1.9), **`bemap.OlMap`** (OpenLayers 10 — note
the name, it is *not* `OpenLayersMap`).

**BeNomad Tiles (PMTiles vector) are MapLibre-only.** Leaflet and OpenLayers
get raster/WMS, not the vector basemap. Calling a tiles-only method on them
rejects with a typed `bemap.Error` of code **`MAPLIBRE_ONLY`** — branch on that
rather than on a string. Anything else unimplemented on an engine lands on
`_notSupportedByEngine()`: one console warning, a `bemap.Error`, then a no-op.

## Cardinal rules (these are where integrations break)

1. **The `V2` suffix is not the modernity marker — check the class list.** Only
   **`bemap.RoutingV2`** and the base `bemap.ServiceV2` carry it. The names
   `GeocoderV2`, `ChargingStationsV2`, … that `llms.txt` advertises **do not
   exist**. But plenty of un-suffixed classes *are* the modern Promise API:
   these 11 extend `ServiceV2` — `RoutingV2`, `ReverseGeocoder`,
   `ChargingStations`, `EvVehicles`, `EvSmartRouting`, `EvReachableArea`,
   `ChargingTime`, `TraceRoute`, `NearPoiSearch`, `AclService`,
   `GeoServerInfoService`. Legacy callback classes: `Routing`, `Geocoder`,
   `Isochrone` (which extends `Routing`; `RoutingV2.isochrone()` is the modern
   route).
2. **Coordinates are lon-then-lat everywhere.** `new bemap.Coordinate(lon, lat)`,
   `map.move(lon, lat, zoom)`. Getting this backwards is the #1 "my point is in
   the ocean" bug.
3. **Tiles are gzip via content-negotiation.** The Worker gzips only when the
   client sends `Accept-Encoding: gzip`. Browsers do this and **auto-decompress**
   — do NOT gunzip again. Native/server HTTP clients that don't negotiate may
   receive raw gzip (`1f 8b`) and must gunzip before parsing MVT.
4. **Server-to-server clients must send a *plausible* `User-Agent`.** The
   gateway `403`s UAs it recognises as bots. Measured on beta: an explicit
   `Python-urllib/3.11` → **403**, while an *empty* UA → **200**. So this is a
   blocklist, not a required header — but never ship a default library UA. A
   `403` with valid credentials from a non-browser client is almost always this.
5. **Web origins must be CORS-allowlisted.** From a browser, login + tiles work
   only if your site origin is allowlisted by BeNomad. If you get opaque network
   failures cross-origin, ask BeNomad to allowlist your origin.
6. **`geocoding-direct` and EV are per-account entitlements.** A `400 "Access
   Denied"` on geocoding or charging-stations means the account is not
   provisioned for that service — it is NOT a code bug. Check what the account
   actually has with `bemap.AclService` → `GET service/acl/1.0/user/details`,
   which returns the role list, the authorised geoservers and the charging
   providers. Tiles need **`ROLE_MAPPING`** *and* **`ROLE_MAPPING_MPTILES`**.
7. **Never add a second `window.fetch` patch.** The SDK already owns exactly one
   global interceptor, shared by `bemap.TilesAuth` and `bemap.RangeFetchPolicy`.
   Wrapping `fetch` yourself on top of it is what breaks token injection. For
   raw MapLibre, use `transformRequest` or the `?token=` query — see the raw
   template.
8. **Never ship credentials in client code for production — use `ctx.proxy`.**
   Since 2.0.2 the Context takes a `proxy` option: point it at your own server,
   omit `login`/`password`, and **no BeMap credential is sent anywhere** — even
   if credentials are also configured. Written like `host` (bare host inherits
   its protocol from `secure`). Tile *bytes* and `/api/*` discovery stay direct
   to `tilesHost` (token-authenticated); only services, WMS and the tiles
   *login* go through the proxy, whose tile-auth wire is forced to `header`.
   Full contract in [`docs/integration-proxy.md`](../docs/integration-proxy.md).
   Inline login/password is acceptable only for demos and evaluations.

## Environments & auth (quick reference — full contract in `references/api-contract.md`)

| Env | Tiles base | BeMap host (JS API auth) |
| --- | --- | --- |
| beta | `https://mptiles-api-beta.benomad.net` | `bemap-beta.benomad.com` |
| preprod | `https://mptiles-api-preprod.benomad.net` | `bemap-preprod.benomad.com` |
| prod | `https://mptiles-api.benomad.net` | `bemap.benomad.com` |

(The dashboard also offers a **Dev** entry, `mptiles-api-dev.benomad.net` +
`bemap-dev.benomad.org`, but only when served from a local origin.)

- Login: `POST {tilesBase}/api/login` with `Authorization: Basic base64(login:password)` → `{ ok, username, token }`. **Token valid exactly 3600 s**; re-login on `401`.
- Pass the token 3 ways: **cookie** (`credentials:'include'`, default, no preflight), **header** `X-Session-Token: <token>`, or **query** `?token=<token>` (mobile fallback).
- Discovery: `GET /api/maps` → `{ default, defaultStyle, aliases, tilesets, styles, versions, aliasVersions }`; `GET /api/default-style`.
- Use the alias `default` for tiles, never a raw filename. `versions`/`aliasVersions` are cache-busting tokens — the SDK appends `?v=<token>` so a rebuilt archive is a new immutable URL.

## Workflow when helping a customer

1. Ask which path (A/B/C) and which environment. Default to A + the customer's env.
2. Copy the matching template, fill in env host + tilesHost. For production, wire proxy mode (rule 8) instead of inline credentials.
3. Read `references/api-contract.md` for exact endpoints, status codes, limits, and style-placeholder substitution.
4. If anything fails, go to `references/troubleshooting.md` — it maps every symptom (401/403/CORS/gzip/blank map/"Access Denied") to a cause and fix.
5. To validate end-to-end, point them at the BeNomad test bench (3-brick GO/NO-GO + tile-hang detector) if available.

## Limits

Token 3600 s · rate limit **100 req/s** per user (throttle bulk clients) · Range/slice **> 10 MB → 403** · no `Range` on `.pmtiles` → 403 · HTTPS mandatory.
