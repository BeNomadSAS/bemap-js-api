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
    // BeNomad Tiles v2.0 — when MapLibreMap sees tilesHost on the Context
    // it uses the bundled BeNomad default style and injects the JWT on
    // every tile request. Leaflet / OL ignore tilesHost and stay on WMS.
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
<!-- ALSO: cp dist/bemap-sw-tiles.js → your SITE ROOT (NOT a script tag) — required when ctx.tilesHost is set for tile caching -->

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

Full setup + four-channel verification (Console / SW panel / Cache Storage / Network) + troubleshooting: [Browser cache (Service Worker)](#page-../docs/browser-cache.md). Skipping the SW copy still works (the lib falls through to plain network), but every tile hits the network on every visit.

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
- Injects the `X-Session-Token` header on every tile request via `transformRequest`.
- Renews the token 5 minutes before expiry, and on every `401` the next request gets a fresh token transparently.
- Loads the bundled gray-level style (`bemap.defaultStyle`) with bilingual place labels.
- **Auto-registers `dist/bemap-sw-tiles.js` as a Service Worker** for tile caching — **you must copy that file to your site root once**. Tile caching is the difference between a sub-second second visit and a multi-second one — **don't skip this step**. Full setup, verification, and the diagnostic console logs the library emits on success or failure are documented in [Browser cache (Service Worker)](#page-../docs/browser-cache.md).

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

The exact same call works on every engine — the Context decides the backend, not the marker code.

```
{"bemap":{"language":"javascript","mapid":"map-marker","run":true}}
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
{"bemap":{"language":"javascript","mapid":"map-line","run":true}}
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
{"bemap":{"language":"javascript","mapid":"map-click","run":true}}
var map = new bemap.MapLibreMap(bemapMainCtx, 'map-click').move(2.35, 48.85, 12);

map.on(bemap.Map.EventType.CLICK, function(evt) {
    var c = evt.getCoordinate();
    console.log('clicked at', c.getLon(), c.getLat());
});
```

---

## 7. Customising the look

By default `bemap.MapLibreMap` loads the **bundled BeNomad gray-level style** with bilingual labels. To use your own style, pass it in `opts.style`:

```
{"bemap":{"language":"javascript"}}
var map = new bemap.MapLibreMap(ctx, 'map', {
    style: 'https://my-cdn.example.com/my-custom-style.json'
});
```

If the style references `tilesHost` URLs, the library still injects `X-Session-Token` automatically.

See [Style customisation](docs/style-customisation.md) for the full guide.

---

## 8. Where to go next

- [examples index](index.html) — every feature with a runnable demo
- [MapLibre guide](#page-guide-maplibre.md) — BeNomad Tiles, 3D buildings, terrain, globe projection
- [Leaflet guide](#page-guide-leaflet.md) — WMS path
- [OpenLayers guide](#page-guide-openlayers.md) — WMS path
- [Migration WMS → BeNomad Tiles](docs/migration-wms-to-tiles.md) — upgrade an existing app
- [Browser cache](docs/browser-cache.md) — zero-config Service Worker tile cache
