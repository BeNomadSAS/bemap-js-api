Quick start
===========

BeMap JS API wraps **Leaflet**, **OpenLayers** and **MapLibre GL** on top of BeNomad's WMS server and **BeNomad Tiles** (PMTiles vector tiles).

This page gets a BeNomad map on your page in 30 seconds. Same Context object works on all three engines — switching the constructor switches the backend.

---

## 1. The canonical Context

Every BeMap app starts here. Replace the placeholders with your BeMap account credentials.

```
{"bemap":{"language":"javascript"}}
var ctx = new bemap.Context({
    "login":    'your-bemap-login',
    "password": 'your-bemap-password',
    "secure":   true,
    "host":     'bemap.benomad.com',
    "authInPost": false,
    "geoserver":  'default',
    // BeNomad Tiles v2.0 — when MapLibreMap sees tilesHost on the Context it
    // paints a tiny fallback, loads the live BeNomad charte from the Worker
    // after login, and authenticates every tile request (tilesAuth 'auto' by
    // default: same-site→cookie, cross-site→header; pin 'cookie'/'header'/'query'
    // to force a wire). Leaflet / OL ignore tilesHost and stay on WMS.
    // Environments — prod is the default; preprod & beta are for integration
    // testing / validation. Pair each API host with its matching tiles host:
    //   prod (default):  bemap.benomad.com    + mptiles-api.benomad.net   (prod also: bemap-prod.benomad.com)
    //   preprod:         bemap-preprod.benomad.com + mptiles-api-preprod.benomad.net
    //   beta:            bemap-beta.benomad.com    + mptiles-api-beta.benomad.net
    "tilesHost":  'mptiles-api.benomad.net'
});
```

> Never commit production credentials. For the runnable examples on this site, the dashboard already provides a `bemapMainCtx` object loaded from `examples/context.js`.

---

## 2. Required HTML

Load the engine + BeMap library. The `pmtiles.js` script is **required** when `tilesHost` is set — the library prints a loud console error if it is missing.

```
{"bemap":{"language":"xml"}}
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<!-- Engine — pick the one(s) you actually use -->
<link rel="stylesheet" href="dist/maplibre-gl.css">
<script src="dist/maplibre-gl.js"></script>
<script src="dist/pmtiles.js"></script>             <!-- required when ctx.tilesHost is set -->
<!-- OPTIONAL: cp dist/bemap-sw-tiles.js → your SITE ROOT (NOT a script tag) — only for tilesSliceMode:'range' (206). The default tilesSliceMode:'200' uses the browser HTTP cache, no Service Worker needed. -->

<!-- (or) Leaflet -->
<link rel="stylesheet" href="dist/leaflet.css">
<script src="dist/leaflet.js"></script>

<!-- (or) OpenLayers -->
<link rel="stylesheet" href="dist/ol.css">
<script src="dist/ol.js"></script>

<!-- BeMap JS API itself -->
<script src="dist/bemap-js-api.js"></script>

<div id="map" style="width:100vw;height:100vh"></div>
```

With the default `tilesSliceMode:'200'`, tiles come back as cacheable HTTP 200s the **browser HTTP cache stores natively** — the Service Worker copy above is **not needed**. It is only required for the classic `tilesSliceMode:'range'` (206) path. Full setup + verification + troubleshooting: [Browser cache](#page-../docs/browser-cache.md).

---

## 3. Three engines, one Context

| Constructor | Backend | Notes |
|---|---|---|
| `new bemap.MapLibreMap(ctx, 'map')` | **BeNomad Tiles** (vector PMTiles) | Default path for v2.0 — fluid pan/zoom, 3D buildings, terrain, globe projection. Reads `ctx.tilesHost`. |
| `new bemap.LeafletMap(ctx, 'map').defaultLayers()` | **BeMap WMS** | Lightweight, mobile-friendly. Ignores `tilesHost`. |
| `new bemap.Ol3Map(ctx, 'map').defaultLayers()` | **BeMap WMS** | Full GIS feature set (OL v10). Ignores `tilesHost`. |

### MapLibre (BeNomad Tiles — the v2.0 path)

```
{"bemap":{"language":"javascript","mapid":"map1","run":true}}
var map = new bemap.MapLibreMap(bemapMainCtx, 'map1', {
    pitch:   0,
    bearing: 0,
    minZoom: 0,
    maxZoom: 22
}).move(2.35, 48.85, 12);
```

The library:

- POSTs the Context credentials to `https://mptiles-api.benomad.net/api/login` and caches the JWT.
- Authenticates every tile request with **`auto`** by default: same site as `tilesHost` ⇒ cookie (`credentials:'include'`, no preflight), cross-site ⇒ `X-Session-Token` header (incognito-safe). Pin `tilesAuth:'cookie'` / `'header'` / `'query'` on the Context/options to force a specific wire.
- Renews the token 5 minutes before expiry, and on every `401` the next request gets a fresh token transparently.
- Paints a tiny font-free fallback instantly, then loads the **live default style from the Worker** after login (full charte with bilingual place labels + Worker fonts). Change the charte server-side and every app picks it up — no rebuild.
- **Caches tiles for free.** By default (`tilesSliceMode:'200'`), tiles are fetched as HTTP 200 slices the **browser HTTP cache stores natively** — a sub-second second visit with **no Service Worker to deploy**. For the classic HTTP-Range path (`tilesSliceMode:'range'`), the library auto-registers `dist/bemap-sw-tiles.js` (copy it to your site root once). Adds self-healing (`recoverableCache`) + a timeout/retry gate (`RangeGate`), all tunable. See [Browser cache](#page-../docs/browser-cache.md) and the [tiles perf playground](#nav-example-maplibre-tiles-perf.html).

### Leaflet (WMS)

```
{"bemap":{"language":"javascript","mapid":"map2","run":true}}
var map = new bemap.LeafletMap(bemapMainCtx, 'map2', {
    zoomControl:    true,
    minZoom:        2,
    maxZoom:        18,
    dragging:       true,
    scrollWheelZoom: true
}).defaultLayers().move(2.35, 48.85, 12);
```

All [Leaflet map options](https://leafletjs.com/reference.html#map-option) are supported.

### OpenLayers (WMS)

```
{"bemap":{"language":"javascript","mapid":"map3","run":true}}
var map = new bemap.Ol3Map(bemapMainCtx, 'map3', {
    zoom:           10,
    minZoom:        3,
    maxZoom:        18,
    enableRotation: true
}).defaultLayers().move(2.35, 48.85, 12);
```

---

## 4. Add a marker

The exact same call works on every engine — the Context decides the backend, not the marker code. (Live marker/polyline/click demos are in the dedicated [examples](index.html); shown here as code so the quick-start page stays light.)

```
{"bemap":{"language":"javascript"}}
var map = new bemap.MapLibreMap(bemapMainCtx, 'map-marker').move(2.35, 48.85, 14);

var marker = new bemap.Marker(
    new bemap.Coordinate(2.35, 48.85), {
        icon: new bemap.Icon({
            src:          'images/map-marker-red.svg',
            anchorX:      0.5,
            anchorY:      1,
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
        })
    });

map.addMarker(marker);
```

---

## 5. Add a polyline

```
{"bemap":{"language":"javascript"}}
var map = new bemap.MapLibreMap(bemapMainCtx, 'map-line').move(2.35, 48.85, 13);

map.addPolyline(new bemap.Polyline([
    new bemap.Coordinate(2.30, 48.85),
    new bemap.Coordinate(2.35, 48.86),
    new bemap.Coordinate(2.40, 48.85)
], {
    style: new bemap.LineStyle({ color: new bemap.Color(0, 120, 200, 1), width: 4 })
}));
```

---

## 6. Listen to map clicks

```
{"bemap":{"language":"javascript"}}
var map = new bemap.MapLibreMap(bemapMainCtx, 'map-click').move(2.35, 48.85, 12);

map.on(bemap.Map.EventType.CLICK, function(evt) {
    var c = evt.getCoordinate();
    console.log('clicked at', c.getLon(), c.getLat());
});
```

---

## 7. Customising the look

By default `bemap.MapLibreMap` paints a tiny font-free fallback, then loads the **live BeNomad default style from the Worker** after login (bilingual labels, Worker fonts). To use your own style instead, pass it in `opts.style`:

```
{"bemap":{"language":"javascript"}}
var map = new bemap.MapLibreMap(ctx, 'map', {
    style: 'https://my-cdn.example.com/my-custom-style.json'
});
```

If the style references `tilesHost` URLs, the library still authenticates them automatically (`auto` by default — same-site cookie, cross-site header; or a pinned `tilesAuth`).

See [Style customisation](#page-../docs/style-customisation.md) for the full guide.

---

## 8. Where to go next

- [examples index](index.html) — every feature with a runnable demo
- [MapLibre guide](#page-guide-maplibre.md) — BeNomad Tiles, 3D buildings, terrain, globe projection
- [Leaflet guide](#page-guide-leaflet.md) — WMS path
- [OpenLayers guide](#page-guide-openlayers.md) — WMS path
- [Migration WMS → BeNomad Tiles](#page-../docs/migration-wms-to-tiles.md) — upgrade an existing app
- [Browser cache](#page-../docs/browser-cache.md) — zero-config Service Worker tile cache
