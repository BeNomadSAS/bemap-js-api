# BeNomad Tiles + BeMap JS API — API contract (corrected source of truth)

Verified against the shipped `dist/bemap-js-api.js` **v2.0.4** and live beta on
**2026-08-26**. The probes below ran against 2.0.3; the only runtime change in
2.0.4 is the default `bemap.Icon()` image (BEMAP-1908), which touches nothing
described on this page. Where this disagrees with `llms.txt`, THIS wins.

Every status code in the "Tile endpoints" and "Negative cases" tables below was
re-measured on beta on that date; the two rows that did NOT reproduce are marked.

## Environments

| Env | Tiles base | BeMap host |
| --- | --- | --- |
| beta | `https://mptiles-api-beta.benomad.net` | `bemap-beta.benomad.com` |
| preprod | `https://mptiles-api-preprod.benomad.net` | `bemap-preprod.benomad.com` |
| prod | `https://mptiles-api.benomad.net` | `bemap.benomad.com` |
| dev *(local origins only)* | `https://mptiles-api-dev.benomad.net` | `bemap-dev.benomad.org` |

Two backends: **tiles** live on the tiles base (JWT auth); **JS API services**
(geocoding/routing/EV) live on the BeMap host (HTTP Basic via the SDK Context,
or via your proxy — see "Proxy mode").

## Tiles auth lifecycle

- `POST {tilesBase}/api/login`, header `Authorization: Basic base64(login:password)` → `{ ok, username, token }`. Also sets an HttpOnly `session` cookie. **Token TTL is exactly 3600 s** (measured: JWT `exp − iat` = 3600).
- Attach the token on every tile/style request, 3 ways:
  - **cookie** — `credentials:'include'` (default in the SDK; no CORS preflight).
  - **header** — `X-Session-Token: <token>` (preferred for web app code you control; **forced** in proxy mode).
  - **query** — `?token=<token>` (mobile fallback when headers can't be injected).
- `GET {tilesBase}/api/status` → 200 valid / 401 expired. `GET /api/logout` invalidates.

## Discovery (authenticated, not rate-limited)

- `GET /api/maps` → `{ default, defaultStyle, aliases, tilesets, styles, versions, aliasVersions }`.
- `GET /api/default`, `GET /api/default-style`, `GET /api/styles`.
- Always address tiles via the alias **`default`**, never a raw `.pmtiles` filename.

`versions` / `aliasVersions` map each tileset (and each alias) to a short
cache-busting token. Since 2.0.1 the SDK resolves it at load and appends
`?v=<token>` to the archive URL, so an archive rebuilt under the same name
becomes a distinct immutable URL instead of rendering a blank map from stale
cache. A Worker that ships no token still self-heals via ETag revalidation of
the ~16 KB header slice.

Live sample (beta, 2026-08-26). **Never hard-code the style filename** — the
charte is revised without notice, so read `defaultStyle` from this payload or
call `/api/default-style`:

```json
{ "default": "OSM_WORLD_250901_Protomaps_20260711.pmtiles",
  "defaultStyle": "styles/<current-charte>.json",
  "aliases": { "default": "OSM_WORLD_250901_Protomaps_20260711.pmtiles",
               "osm": "OSM_WORLD_250901_Protomaps_20260711.pmtiles",
               "here": "Here-2025-4_WORLD.pmtiles" },
  "aliasVersions": { "default": "3a0654bd", "osm": "3a0654bd", "here": "07133c2b" } }
```

## Tile endpoints

| Purpose | Request | Success | Notes |
| --- | --- | --- | --- |
| **Slice 200 (SDK default)** | `GET /default?r=A-B` | **200** | No `Range` header. `Cache-Control: public, max-age=2592000, immutable` + `ETag`. Browser-cacheable, which 206 partials are not — this is why it is the default since 2.0.1. |
| Range 206 (Path B / pmtiles.js) | `GET /default.pmtiles` + `Range: bytes=A-B` | **206** | Whole-file `pmtiles://`. Same bytes as the 200 slice (verified: 16 384 octets both ways). |
| ZXY (mobile/fleet) | `GET /default/{z}/{x}/{y}.pbf` | **200** | MVT, `Content-Type: application/x-protobuf`, gzip via `Accept-Encoding`. |
| Style | `GET /{path}` — take the path from `/api/default-style`, never hard-code it | 200 | Authenticated. Placeholders below. |
| Fonts | `GET /fonts/{fontstack}/{range}.pbf` | 200 | Glyphs. The SDK bundles none; a root-relative `/fonts/...` is absolutised to `<tilesHost>/fonts/...`. `ctx.glyphsUrl` overrides. |

### Negative cases (re-measured on beta, 2026-08-26)

| Case | Status | Body |
| --- | --- | --- |
| No `Range` on `.pmtiles` | **403** | `{"error":"Range header required for PMTiles files"}` |
| `Range` > 10 MB | **403** | `{"error":"Range too large (20971521 bytes). Max: 10485760 bytes"}` |
| Multi-part Range | 403 | — |
| Missing / expired auth | **401** | — |
| Rate exceeded | 429 | — |
| Empty tile | **not reproduced** | Three ocean tiles (z10/z12/z14) all returned **200** with a 38–65-octet MVT, never `204`. Treat `204` as unconfirmed: handle it defensively, but do not rely on it to detect emptiness — check the payload size instead. |

## MVT encoding

Tiles are MVT (Mapbox Vector Tiles). The Worker serves them **gzip when the client
negotiates it** (`Accept-Encoding: gzip`). Browsers negotiate and transparently
decompress — read the response as normal bytes, do not gunzip. Native/server HTTP
clients that don't send `Accept-Encoding` may get raw gzip (magic `1f 8b`) and must
gunzip before decoding the MVT.

## Style placeholders

The BeNomad style JSON ships with two placeholders to substitute at load:
- `metadata.source_placeholder` (default `"TILES_SOURCE"`) → repoint the vector source at the real authenticated tile URL.
- `metadata.place_label_placeholder` (default `"__BILINGUAL_PLACE__"`) → a MapLibre `format` expression for bilingual labels (device/browser language + local name) on `place_city` / `place_town` / `place_village` layers.

## Engines

| Class | Engine | Vector PMTiles basemap |
| --- | --- | --- |
| `bemap.MapLibreMap` | MapLibre GL v5 | **yes** (3D buildings, terrain, globe) |
| `bemap.LeafletMap` | Leaflet 1.9 | no — raster/WMS only |
| `bemap.OlMap` | OpenLayers 10 | no — raster/WMS only |

The class is `OlMap`, **not** `OpenLayersMap`. Tiles-only methods called on
Leaflet/OL reject with a typed `bemap.Error` of code **`MAPLIBRE_ONLY`**; any
other engine gap lands on `_notSupportedByEngine()` — one console warning naming
the engine, a `bemap.Error` on the error channel, then a harmless no-op.

## BeMap JS API — the classes that ACTUALLY exist

Context:
```js
var ctx = new bemap.Context({
  host: 'bemap-beta.benomad.com',   // BeMap host for services
  secure: true,
  login: '...', password: '...',    // demo/eval only; production → proxy mode
  tilesHost: 'mptiles-api-beta.benomad.net'
});
```
Map:
```js
var map = new bemap.MapLibreMap(ctx, 'map');   // div id or element
map.move(lon, lat, zoom);                       // lon FIRST
map.on('error', function (e) { /* tile/auth errors */ });
map.isTokenValid(); map.getToken(); map.refreshToken();
map.getTilesConfig();                           // resolved tiles options — start debugging here
```

### Modern Promise services (extend `bemap.ServiceV2`)

These reject with a typed `bemap.Error` and accept an `AbortSignal`. **Only
`RoutingV2` carries a `V2` suffix — the suffix is not the modernity marker.**

| Feature | Class |
| --- | --- |
| Routing, matrix, isochrone | `bemap.RoutingV2` — `.calculate()` `.matrix()` `.isochrone()` `.cancel(id)` |
| Reverse geocoding | `bemap.ReverseGeocoder` — `.revGeo(...)` |
| GPS trace map-matching | `bemap.TraceRoute` (+ `bemap.traceRouteQuality.score(resp)`) |
| POI search around a point | `bemap.NearPoiSearch` |
| EV charging pools | `bemap.ChargingStations` — `.search(...)` |
| EV journey planning | `bemap.EvSmartRouting` |
| EV reachable area | `bemap.EvReachableArea` |
| EV vehicle catalogue (v1.1) | `bemap.EvVehicles` — `.brands()` `.list({brandId})` `.get(key)` |
| Charging duration | `bemap.ChargingTime` |
| Account entitlements | `bemap.AclService` — `GET service/acl/1.0/user/details` |
| Geoserver capabilities | `bemap.GeoServerInfoService` |

### Legacy callback services

`bemap.Routing` (`.compute({request, success, failed})`), `bemap.Geocoder`
(`.geocode(...)`, extends `bemap.Service`), `bemap.Isochrone` (extends
`bemap.Routing` — prefer `RoutingV2.isochrone()`).

### Autocomplete & helpers

`bemap.Autocomplete`, `bemap.GeoAutocomplete` (with `attachToInput()`),
`bemap.AttributionWidget`, `bemap.BrowserCache`,
`bemap.helpers.snapToRoad(...)`, `bemap.helpers.listGeoservers(ctx)`,
`bemap.snippet.contextLine(ctx)`.

Service errors reject the Promise with a `bemap.Error`: `.getCode()`
(`UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `ABORTED`, `INVALID_ARGUMENT`,
`OFFLINE`, `MAPLIBRE_ONLY`, `TILE_LOAD_FAILED`, `STYLE_LOAD_FAILED`,
`ROUTING_*`, `EV_*`, `CHARGING_*`, …), `.getStatus()`, `.getMessage()`,
`.getUrl()`. Legacy classes use `success`/`failed` callbacks instead.

## Tile read modes (2.0.1+)

`tilesSliceMode` selects how the SDK reads the archive:

| Value | Wire | Why |
| --- | --- | --- |
| **`'200'`** *(default)* | `GET <archive>?r=A-B`, no `Range` header → **200** | Natively browser-cacheable. Repeat tiles ~11–29 ms vs ~30–70 ms on 206. The tile **Service Worker auto-disables** here. |
| `'range'` / `'206'` | `Range: bytes=A-B` → **206** | Classic path, byte-for-byte unchanged. What raw `pmtiles.js` does. |

Companion options: `tileGate` (default on — 3 retries at 200/500/1000 ms on
429/5xx/timeout, smart-abort that never kills a streaming body),
`recoverableCache` (default on — evicts rejected promises so a failed directory
read cannot poison every dependent tile until reload), `rangeCacheMode`
(`'auto'` forces `cache:'no-store'` on desktop Chromium 206 reads),
`tilesSliceTimeoutMs` (3500 TTFB), `tilesErrorRefreshMs` (4000).
URL kill-switches: `?noslice`, `?nogate`.

## Proxy mode (2.0.2) — no credentials in the browser

Set `proxy` on the Context and omit `login`/`password`:

```js
var ctx = new bemap.Context({
  proxy: 'my-proxy.example.com',   // written like `host`: bare host inherits `secure`
  bemapEnv: 'beta',                // optional → sent as X-BeMap-Env
  tilesHost: 'mptiles-api-beta.benomad.net'
});
```

- **Invariant:** with `proxy` set, no `Authorization: Basic` and no
  `appid`/`appcode` is sent anywhere — even if `login`/`password` are also
  configured.
- **Scope:** services, WMS and the tiles *login* go through the proxy
  (`<proxy>/tiles/login`, carrying `X-BeMap-Tiles-Host`). Tile **bytes** and
  `/api/*` discovery stay **direct** to `tilesHost` — they are token-authenticated
  and involve no credential.
- Tile auth is forced to **`header`** behind a proxy (a cookie from the proxy's
  origin could never be sent to `tilesHost`).
- Helpers: `getProxy()` / `setProxy()` / `getProxyHeaders()` /
  `getProxyHeadersList()` / `getBemapEnv()`.
- Two documented limits: a map built on a proxy-less Context installs no hook and
  cannot gain one later; and `setProxy()` never rewrites URLs already inside a
  live map.
- Leaflet/OL load raster WMS via `<img>`, which cannot carry `X-BeMap-Env` — a
  multi-environment proxy needs a per-environment proxy URL for those engines.

Full guide, including how to protect the proxy: [`docs/integration-proxy.md`](../../docs/integration-proxy.md).

## Entitlements

Services are gated per account. Tiles need **`ROLE_MAPPING`** *and*
**`ROLE_MAPPING_MPTILES`**; typical others are `ROLE_VEHICLE`,
`ROLE_CHARGINGSTATION`, `ROLE_EVSMARTROUTING`, plus geoserver/provider ACL for
direct geocoding and charging providers. A `400 "Access Denied"` or `403
FORBIDDEN` means the account lacks that role — provision it server-side; it is
not an integration bug.

Don't guess: `bemap.AclService` (`GET service/acl/1.0/user/details`, 200 on beta
and prod) returns the account's full role list, its authorised `geoservers`
(each `{key, value}`, one flagged `byDefault`) and its
`chargingStationProviders`.

## Limits

Token 3600 s · **100 req/s** per user · Range/slice ≤ 10 MB · HTTPS only.
