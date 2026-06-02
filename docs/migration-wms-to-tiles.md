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
| Caching | browser default | Service Worker — 60-80% hit ratio typical |

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
  tilesHost: 'mptiles-api.benomad.net',     // NEW
  tilesFile: 'OSM_250901_WORLD.pmtiles'     // NEW (optional, default applies)
});
var map = new bemap.MapLibreMap(ctx, 'map');  // class change
map.defaultLayers();                          // unchanged
```

The rest of the app stays identical — markers, polylines, polygons,
clustering, drawing, routing, geocoding all work the same way on MapLibre.
The `bemap.BemapLayer({ name: 'background' })` call is short-circuited
inside `MapLibreMap.defaultLayers()` when `ctx.tilesHost` is set: the
background is supplied by the bundled BeNomad style instead.

## What about Leaflet and OpenLayers?

Both engines **stay on WMS** for v2.0. Adding `tilesHost` to a Context
that drives `LeafletMap` or `Ol3Map` is silently ignored. The map class
is the explicit switch.

## What you get for free

- **Service Worker caching** — `dist/bemap-sw-tiles.js` is auto-registered;
  the live HIT/MISS counter is exposed via `map.onCacheStats(fn)` and
  `map.getBrowserCacheStats()`. **You must copy that file to your site
  root once** — see [docs/browser-cache.md](browser-cache.md) for the
  one-line copy step, verification steps, and the diagnostic console
  logs the library emits when the SW is not reachable.
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
