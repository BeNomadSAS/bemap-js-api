# Migration guide — WMS → BeNomad Tiles

The v2.0 release introduces BeNomad Tiles as an alternative to the WMS
background. Migration is **opt-in** and **non-breaking** — every existing
v1.0 app keeps working without code changes.

## Why migrate

| Concern | WMS | BeNomad Tiles |
| --- | --- | --- |
| Engine | Leaflet / OpenLayers / MapLibre (raster) | MapLibre only (vector) |
| Rendering | Raster PNG/JPG | Vector — fluid pan/zoom, no pixelisation |
| 3D buildings / terrain / globe | not supported | first-class |
| Multilingual labels | static | per-browser-language at runtime |
| Custom branding | server-side style only | client style swap at runtime |
| Network | bgis WMS server | dedicated Worker, near-CDN latency |
| Caching | browser default | Browser HTTP cache (default, via 200-slice reads) — or Service Worker (classic 206-range mode) |

## What you load on the page

WMS path (today):

```html
<link rel="stylesheet" href="dist/leaflet.css">
<script src="dist/leaflet.js"></script>
<script src="dist/bemap-js-api.js"></script>
```

BeNomad Tiles path (v2.0) — **adds `pmtiles.js`**:

```html
<link rel="stylesheet" href="dist/maplibre-gl.css">
<script src="dist/maplibre-gl.js"></script>
<script src="dist/pmtiles.js"></script>             <!-- NEW for BeNomad Tiles -->
<script src="dist/bemap-js-api.js"></script>
```

If `pmtiles.js` is missing the library emits a red console banner with
the exact tag to add. Same goes for `maplibre-gl.js` and `maplibre-gl.css`.

## The one Context change

Before:

```js
var ctx = new bemap.Context({
  host: 'bemap.benomad.com', secure: true,
  login: 'l', password: 'p'
});
var map = new bemap.LeafletMap(ctx, 'map');
map.defaultLayers();
```

After:

```js
var ctx = new bemap.Context({
  host: 'bemap.benomad.com', secure: true,
  login: 'l', password: 'p',
  tilesHost: 'mptiles-api.benomad.net',     // NEW — pair with host's env (prod here)
  // tilesFile optional: omit for the server-resolved 'default' (or ctx.geoserver)
  tilesFile: 'OSM_250901_WORLD.pmtiles'     // NEW — or pin an exact tileset
});
var map = new bemap.MapLibreMap(ctx, 'map');  // class change
map.defaultLayers();                          // unchanged
```

The rest of the app stays identical — markers, polylines, polygons,
clustering, drawing, routing, geocoding all work the same way on MapLibre.
The `bemap.BemapLayer({ name: 'background' })` call is short-circuited
inside `MapLibreMap.defaultLayers()` when `ctx.tilesHost` is set: the
background is supplied by the BeNomad Tiles vector charte instead (a tiny
font-free fallback first, then the live charte loaded from the Worker).

**Auth** is `auto` by default: same site as `tilesHost` ⇒ cookie (no
preflight), cross-site ⇒ `X-Session-Token` header (incognito-safe) — so no
auth config is needed. Pin a specific wire with the `tilesAuth` option
(`'auto'` | `'cookie'` | `'header'` | `'query'`). To keep credentials
server-side, use `tilesTokenProvider` instead of `login`/`password` — see
[Backend token provider](integration-tiles-token-provider.md).

## What about Leaflet and OpenLayers?

Both engines **stay on WMS** for v2.0. Adding `tilesHost` to a Context
that drives `LeafletMap` or `Ol3Map` is silently ignored. The map class
is the explicit switch.

## What you get for free

- **Browser tile caching** — by **default** (`tilesSliceMode:'200'`), tiles
  are fetched as cacheable HTTP 200 slices that the **browser HTTP cache
  stores natively** → repeat visits are free with **no Service Worker**. If
  you opt into classic HTTP Range (`tilesSliceMode:'range'`), the library
  auto-registers `dist/bemap-sw-tiles.js` (copy it to your site root once);
  the live HIT/MISS counter is then exposed via `map.onCacheStats(fn)` /
  `map.getBrowserCacheStats()`. See [Browser cache](#page-../docs/browser-cache.md).
- **Self-healing + resilient reads** — `recoverableCache:true` (default)
  recovers a failed header/directory read instead of a permanent hole; the
  `RangeGate` adds a per-request timeout + one retry (tunable via
  `tilesSliceTimeoutMs`, `tilesSliceMaxRetries`, `tilesSliceConcurrency`,
  `tileGate`). Try every knob in
  [`examples/example-maplibre-tiles-perf.html`](#nav-example-maplibre-tiles-perf.html).
- **MapLibre-only methods** — call them directly on the map:
  `setProjection('globe')`, `setPitch(60)`, `setBearing(45)`,
  `easeTo({...})`, `setStyle({...})`, `setPaintProperty(...)`,
  `add3DBuildings()`, `setSky({...})`, `spinGlobe({speed:0.05})`.
- **Cross-engine methods** — `easeTo`, `jumpTo`, `addHeatmap` / `removeHeatmap`,
  `setBearing` (on OL) now exist on every engine, so the same business code
  works on all three. Where the engine cannot honour an option (e.g. `pitch`
  on Leaflet), the method silently ignores it and emits a one-time warning.

## Rollback

Setting `tilesHost: null` (or removing the field) is the rollback. The
library can host both Contexts side-by-side — see
`examples/example-migration-side-by-side.html`.
