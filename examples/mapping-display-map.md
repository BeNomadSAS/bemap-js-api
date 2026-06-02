Add a map browser in your web page
==================================

BeMap JS API ships three map engines on top of the same `bemap.Context`. **MapLibre** speaks BeNomad Tiles (vector PMTiles, v2.0 path). **Leaflet** and **OpenLayers** speak the BeMap WMS (raster tiles, v1.x path — still fully supported).

---

## The canonical Context

```
{"bemap":{"language":"javascript"}}
var ctx = new bemap.Context({
    "login":    'your-bemap-login',
    "password": 'your-bemap-password',
    "secure":   true,
    "host":     'bemap.benomad.com',
    "authInPost": false,
    "geoserver":  'default',
    // BeNomad Tiles v2.0 — MapLibre uses it, Leaflet/OL ignore it.
    "tilesHost":  'mptiles-api.benomad.net'
});
```

> Never commit production credentials. The runnable demos on this site use the dashboard-loaded `bemapMainCtx` from `examples/context.js`.

---

## BeNomad Tiles path (MapLibre)

When the Context carries `tilesHost`, `MapLibreMap` loads the bundled BeNomad gray-level style automatically — no inline style block, no third-party sources. Authentication, token renewal, and `X-Session-Token` injection are handled by the library.

```
{"bemap":{"language":"javascript","mapid":"map-ml","run":true}}
var map = new bemap.MapLibreMap(bemapMainCtx, 'map-ml', {
    minZoom: 0,
    maxZoom: 22
}).move(2.3412, 48.85693, 12);
```

**Required HTML**:

```
{"bemap":{"language":"xml"}}
<link rel="stylesheet" href="dist/maplibre-gl.css">
<script src="dist/maplibre-gl.js"></script>
<script src="dist/pmtiles.js"></script>
<script src="dist/bemap-js-api.js"></script>
```

To override the bundled style, pass your own `opts.style` (URL or full MapLibre Style JSON). The library still injects the JWT for any URL that points at `ctx.tilesHost`.

---

## WMS path (Leaflet)

```
{"bemap":{"language":"javascript","mapid":"map-lf","run":true}}
var map = new bemap.LeafletMap(bemapMainCtx, 'map-lf', {
    zoomControl:     true,
    minZoom:         2,
    maxZoom:         18,
    scrollWheelZoom: true
}).defaultLayers().move(2.3412, 48.85693, 12);
```

**Required HTML**:

```
{"bemap":{"language":"xml"}}
<link rel="stylesheet" href="dist/leaflet.css">
<script src="dist/leaflet.js"></script>
<script src="dist/bemap-js-api.js"></script>
```

---

## WMS path (OpenLayers)

```
{"bemap":{"language":"javascript","mapid":"map-ol","run":true}}
var map = new bemap.Ol3Map(bemapMainCtx, 'map-ol', {
    minZoom:        3,
    maxZoom:        18,
    enableRotation: true
}).defaultLayers().move(2.3412, 48.85693, 12);
```

**Required HTML**:

```
{"bemap":{"language":"xml"}}
<link rel="stylesheet" href="dist/ol.css">
<script src="dist/ol.js"></script>
<script src="dist/bemap-js-api.js"></script>
```

---

## Differences at a glance

| | MapLibre (BeNomad Tiles) | Leaflet / OpenLayers (WMS) |
|---|---|---|
| Tile format | Vector PMTiles, GPU-rendered | Raster PNG/JPEG, server-rendered |
| Auth | JWT (`X-Session-Token`) injected by `transformRequest` | HTTP Basic, set on the Context |
| Default style | Bundled `bemap.defaultStyle` (gray-level, bilingual) | BeMap WMS layers, `defaultLayers()` |
| 3D features | `setProjection('globe')`, `setTerrain`, `add3DBuildings` | Not available |
| Browser cache | Auto-registered Service Worker ([`dist/bemap-sw-tiles.js`](docs/browser-cache.md) — copy to site root) | Browser HTTP cache only |

The Context object is the same — only the constructor class changes.

---

## Complete HTML example (MapLibre + BeNomad Tiles)

```
{"bemap":{"language":"xml"}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>BeNomad BeMap JavaScript API</title>
    <link rel="stylesheet" href="../dist/maplibre-gl.css" type="text/css">
    <script src="../dist/maplibre-gl.js"></script>
    <script src="../dist/pmtiles.js"></script>
    <script src="../dist/bemap-js-api.min.js"></script>
</head>
<body>
    <div id="map1" style="width:100%;height:100vh;"></div>
    <script>
        var ctx = new bemap.Context({
            "login":    'your-bemap-login',
            "password": 'your-bemap-password',
            "secure":   true,
            "host":     'bemap.benomad.com',
            "tilesHost": 'mptiles-api.benomad.net'
        });
        var map = new bemap.MapLibreMap(ctx, 'map1').move(2.3412, 48.85693, 12);
    </script>
</body>
</html>
```
