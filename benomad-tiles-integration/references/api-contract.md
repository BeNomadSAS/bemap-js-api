# BeNomad Tiles + BeMap JS API — API contract (corrected source of truth)

Verified against the shipped `dist/bemap-js-api.js` (v2.0.0) and live beta/preprod.
Where this disagrees with `llms.txt`, THIS wins (llms.txt over-advertises `*V2`
services that were never bundled).

## Environments

| Env | Tiles base | BeMap host |
| --- | --- | --- |
| beta | `https://mptiles-api-beta.benomad.net` | `bemap-beta.benomad.com` |
| preprod | `https://mptiles-api-preprod.benomad.net` | `bemap-preprod.benomad.com` |
| prod | `https://mptiles-api.benomad.net` | `bemap.benomad.com` |

Two backends: **tiles** live on the tiles base (JWT auth); **JS API services**
(geocoding/routing/EV) live on the BeMap host (HTTP Basic via the SDK Context).

## Tiles auth lifecycle

- `POST {tilesBase}/api/login`, header `Authorization: Basic base64(login:password)` → `{ ok, username, token }`. Also sets an HttpOnly `session` cookie. **Token TTL ~1 h.**
- Attach the token on every tile/style request, 3 ways:
  - **cookie** — `credentials:'include'` (default in the SDK; no CORS preflight).
  - **header** — `X-Session-Token: <token>` (preferred for web app code you control).
  - **query** — `?token=<token>` (mobile fallback when headers can't be injected).
- `GET {tilesBase}/api/status` → 200 valid / 401 expired. `GET /api/logout` invalidates.

## Discovery (authenticated, not rate-limited)

- `GET /api/maps` → `{ default, defaultStyle, aliases, tilesets, styles }`.
- `GET /api/default`, `GET /api/default-style`, `GET /api/styles`.
- Always address tiles via the alias **`default`**, never a raw `.pmtiles` filename.

## Tile endpoints

| Purpose | Request | Success | Notes |
| --- | --- | --- | --- |
| Range (web) | `GET /default.pmtiles` + `Range: bytes=A-B` | **206** | Whole-file `pmtiles://`. `pmtiles.js` issues these. |
| Slice 200 (web, cacheable) | `GET /default?r=A-B` | **200** | `Cache-Control: public, max-age=2592000, immutable` + `ETag`. Same bytes as the 206. |
| ZXY (mobile/fleet) | `GET /default/{z}/{x}/{y}.pbf` | **200** tile / **204** empty | MVT, gzip via `Accept-Encoding`. |
| Style | `GET /{path}` (from `/api/default-style`, e.g. `/styles/charte_2026.json`) | 200 | Authenticated. Placeholders below. |
| Fonts | `GET /fonts/{fontstack}/{range}.pbf` | 200 | Glyphs. |

Negative cases: no `Range` on `.pmtiles` → **403**; `Range > 10 MB` → **403**;
multi-part Range → **403**; missing/expired auth → **401**; rate exceeded → **429**;
empty tile → **204**.

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

## BeMap JS API — the classes that ACTUALLY exist

Context:
```js
var ctx = new bemap.Context({
  host: 'bemap-beta.benomad.com',   // BeMap host for services
  secure: true,
  login: '...', password: '...',    // demo/eval only; production → token provider
  tilesHost: 'mptiles-api-beta.benomad.net'
});
```
Map (BeNomad Tiles = MapLibre engine only):
```js
var map = new bemap.MapLibreMap(ctx, 'map');   // div id or element
map.move(lon, lat, zoom);                       // lon FIRST
map.on('error', function (e) { /* tile/auth errors */ });
map.isTokenValid(); map.getToken(); map.refreshToken();
```
Services (v1 class names — return values differ; see below):

| Feature | Class | Call | Returns |
| --- | --- | --- | --- |
| Geocoding (direct) | `bemap.Geocoder(ctx)` | `.geocode(new bemap.GeocodingRequest({ place, language, maxResult, proximity, addressDetails:true }), { geoserver:'nominatim'\|'herehlp' })` | Promise → `resp.getGeocodingItems()` |
| Reverse geocoding | `bemap.ReverseGeocoder(ctx)` | `.revGeo(new bemap.ReverseGeocodingRequest({ coordinate:new bemap.Coordinate(lon,lat), radius, maxResult, language }))` | Promise → `resp.getGeocodingItems()` |
| Routing (v2) | `bemap.RoutingV2(ctx)` | `.calculate(new bemap.RoutingRequest({ destinations:[Coordinate,…], routingCriterias:[bemap.RoutingCriteria.FASTEST], options:[bemap.RoutingOptions.POLYLINE], routingVehicleProfile:new bemap.RoutingVehicleProfile({ transportMode:bemap.TransportMode.CAR }) }))` | Promise → `resp.getFirstRoute()` → `.getLength()/.getDuration()/.getPolyline()` |
| Routing (v1) | `bemap.Routing(ctx)` | `.compute({ request:{ destinations:[new bemap.Destination(lon,lat),…], options:[...] }, success, failed })` | callbacks; `routing.getFirstRoute()` |
| EV charging | `bemap.ChargingStations(ctx)` | `.search(new bemap.ChargingStationSearchRequest({ providers:['ecoMovement'], coordinate, radius }))` | Promise → `resp.getPools()` |
| EV vehicles | `bemap.EvVehicles(ctx)` | `.brands()` / `.list({brandId})` / `.get(key)` | Promise |
| Isochrone | `bemap.Isochrone(ctx)` | `.compute({...})` (v1 callbacks) | callbacks |

Service errors reject the Promise (v2) with a `bemap.Error`: `.getCode()`
(`UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `ABORTED`, `ROUTING_NO_ROUTE`,
`NETWORK`, …), `.getStatus()`, `.getMessage()`, `.getUrl()`. v1 classes use
`success`/`failed` callbacks instead.

## Entitlements

Services are gated per account. Typical roles: `ROLE_MAPPING` (tiles),
`ROLE_VEHICLE` (EV vehicles), `ROLE_CHARGINGSTATION` / `ROLE_EVSMARTROUTING` (EV),
plus geoserver/provider ACL for direct geocoding and charging providers. A
`400 "Access Denied"` or `403 FORBIDDEN` on a service means the account lacks that
role — provision it server-side; it is not an integration bug.

## Limits

Token 1 h · **100 req/s** per user · Range ≤ 10 MB · HTTPS only.
