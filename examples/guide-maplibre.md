# MapLibre GL v5 Guide — BeNomad Tiles

MapLibre GL JS is the BeMap v2.0 **default path**: GPU-rendered vector tiles served as PMTiles from **BeNomad Tiles** (`mptiles-api.benomad.net`), with 3D buildings, 3D terrain, globe projection, and a Service-Worker-backed browser cache — all out of the box.

---

## 1. The canonical setup (v2.0 default)

Set `tilesHost` on the Context, then instantiate `bemap.MapLibreMap`. The library does the rest — login, JWT, `X-Session-Token` injection, default style, and zero-config tile cache.

```
{"bemap":{"language":"javascript"}}
var ctx = new bemap.Context({
    "login":      'your-bemap-login',
    "password":   'your-bemap-password',
    "secure":     true,
    "host":       'bemap.benomad.com',
    "authInPost": false,
    "geoserver":  'default',
    // BeNomad Tiles v2.0 — MapLibreMap reads this and switches to the
    // bundled BeNomad default style.
    "tilesHost":  'mptiles-api.benomad.net'
});

var map = new bemap.MapLibreMap(ctx, 'map1').move(2.3412, 48.85693, 12);
```

**Required HTML** — the library prints a loud console error with the exact tag to add if anything is missing:

```
{"bemap":{"language":"xml"}}
<link rel="stylesheet" href="dist/maplibre-gl.css">
<script src="dist/maplibre-gl.js"></script>
<script src="dist/pmtiles.js"></script>             <!-- required when ctx.tilesHost is set -->
<script src="dist/bemap-js-api.js"></script>
```

What happens behind the scenes:

- The Context credentials are POSTed to `https://mptiles-api.benomad.net/api/login` and the resulting JWT is cached.
- A `transformRequest` callback injects `X-Session-Token` on every PMTiles range request.
- The token is renewed 5 minutes before expiry; on any `401` the next request transparently gets a fresh token.
- The bundled gray-level style (`bemap.defaultStyle`) is loaded with bilingual place labels (browser-language + local name).
- `dist/bemap-sw-tiles.js` is registered as a Service Worker at the page root — **you must copy that file to your site root once**. See [Browser cache](docs/browser-cache.md) for the one-step setup, verification, and the diagnostic console logs the library emits when the SW is unreachable.

> Never commit production credentials. The runnable demos on this site use the dashboard-loaded `bemapMainCtx` from `examples/context.js`.

### Runnable demo

```
{"bemap":{"language":"javascript","mapid":"map-default","run":true}}
var map = new bemap.MapLibreMap(bemapMainCtx, 'map-default').move(2.3412, 48.85693, 12);
```

| Constructor option | Type | Default | Description |
|--------------------|------|---------|-------------|
| `style` | object/string | bundled `bemap.defaultStyle` | Override the bundled BeNomad style |
| `pitch` | number | 0 | Camera tilt (0–85) |
| `bearing` | number | 0 | Map rotation in degrees |
| `zoom` | number | 2 | Initial zoom level |
| `minZoom` | number | 0 | Minimum zoom level |
| `maxZoom` | number | 22 | Maximum zoom level |
| `maxBounds` | array | — | Restrict panning `[[sw_lng, sw_lat], [ne_lng, ne_lat]]` |
| `tilesFile` | string | `OSM_250901_WORLD.pmtiles` | PMTiles file to load (per-instance override) |

---

## 2. Override the default style

The library ships with the BeNomad gray-level style. If you have your own MapLibre Style JSON (corporate charte, dark mode, day/night theming, …), pass it in `opts.style`. The library still injects `X-Session-Token` automatically for any URL that points at `ctx.tilesHost`.

```
{"bemap":{"language":"javascript"}}
// Inline style object
var map = new bemap.MapLibreMap(ctx, 'map1', {
    style: yourMapLibreStyleJson
}).move(2.3412, 48.85693, 12);

// Or a URL the library will GET
var map = new bemap.MapLibreMap(ctx, 'map1', {
    style: 'https://your-cdn.example.com/your-style.json'
}).move(2.3412, 48.85693, 12);
```

See [Style customisation](docs/style-customisation.md) for the full guide on writing your own style.

---

## 3. Switch tilesets (internal customers)

The public demo is served from `OSM_250901_WORLD.pmtiles`. Internal customers with an ACL-gated subscription can load other tilesets:

```
{"bemap":{"language":"javascript"}}
var map = new bemap.MapLibreMap(ctx, 'map1', {
    tilesFile: 'Here-2025-4_WORLD.pmtiles'   // HERE-licensed, internal customers only
}).move(2.3412, 48.85693, 12);
```

If your account does not have access to the requested file the Worker returns `403` and the library surfaces a clean `bemap.Error` via `map.on('error', …)`.

---

## 4. 3D features (MapLibre only)

These methods are no-ops on `LeafletMap` / `Ol3Map` and log a `console.warn` once.

### Camera

```
{"bemap":{"language":"javascript"}}
map.setPitch(45);                       // tilt camera, 0–85
map.setBearing(-17);                    // rotate, degrees
map.flyTo(2.35, 48.85, 14);             // smooth animated move
map.easeTo({ center: [2.35, 48.85], zoom: 16, pitch: 60, bearing: 45 });
map.jumpTo({ center: [2.35, 48.85], zoom: 12 });
```

### Globe projection

```
{"bemap":{"language":"javascript"}}
map.setProjection('globe');             // switch to globe
map.setProjection('mercator');          // back to flat
map.spinGlobe({ speed: 0.05 });         // autonomous slow rotation
map.stopSpinGlobe();
```

### 3D buildings

```
{"bemap":{"language":"javascript"}}
map.add3DBuildings();                   // uses BeNomad Tiles building layer by default
map.remove3DBuildings();
```

### 3D terrain (relief)

```
{"bemap":{"language":"javascript"}}
map.setTerrain({ exaggeration: 1.5 });  // hillshade + DEM, BeNomad recipe
map.removeTerrain();
```

### Sky / atmosphere / light

```
{"bemap":{"language":"javascript"}}
map.setSky({
    'sky-color':         '#87CEEB',
    'sky-type':          'atmosphere',
    'fog-color':         '#ffffff',
    'fog-ground-blend':  0.5
});

map.setLight({
    anchor:    'viewport',
    color:     '#fff',
    intensity: 0.5
});
```

| Method | Description |
|--------|-------------|
| `setPitch(deg)` | Tilt camera (0–85) |
| `setBearing(deg)` | Rotate map |
| `flyTo(lon, lat, zoom)` | Smooth animated move |
| `easeTo(opts)` / `jumpTo(opts)` | MapLibre camera ops |
| `setProjection('globe' / 'mercator')` | Projection switch |
| `spinGlobe({ speed })` / `stopSpinGlobe()` | Autonomous rotation |
| `add3DBuildings(opts)` / `remove3DBuildings()` | Extruded buildings |
| `setTerrain(opts)` / `removeTerrain()` | 3D relief |
| `setSky(opts)` / `setLight(opts)` | Atmosphere / lighting |

A live showcase of every method is at [Function Showcase](functions.html).

---

## 5. Markers, polylines, polygons, popups

The marker / polyline / polygon code is **engine-agnostic** — identical to `LeafletMap` and `Ol3Map`.

```
{"bemap":{"language":"javascript"}}
var map = new bemap.MapLibreMap(ctx, 'map1').move(2.3412, 48.85693, 13);

// Marker
var marker = new bemap.Marker(
    new bemap.Coordinate(2.3412, 48.85693), {
        icon: new bemap.Icon({
            src:          'images/map-marker-red.svg',
            anchorX:      0.5,
            anchorY:      1,
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
        })
    });
map.addMarker(marker);

// Marker click
map.onMarker(marker, bemap.Map.EventType.CLICK, function(evt) {
    console.log('Marker clicked at', evt.getCoordinate());
});

// Polyline
map.addPolyline(new bemap.Polyline([
    new bemap.Coordinate(2.33, 48.86),
    new bemap.Coordinate(2.34, 48.855),
    new bemap.Coordinate(2.35, 48.86)
], {
    style: new bemap.LineStyle({ width: 4, color: new bemap.Color(0, 100, 255, 0.8) })
}));

// Polygon
map.addPolygon(new bemap.Polygon([
    new bemap.Coordinate(2.34, 48.855),
    new bemap.Coordinate(2.35, 48.855),
    new bemap.Coordinate(2.345, 48.86)
], {
    style: new bemap.PolygonStyle({
        fillColor:   new bemap.Color(255, 0, 0, 0.2),
        borderColor: new bemap.Color(255, 0, 0, 0.8),
        borderWidth: 2
    })
}));

// Map click
map.on(bemap.Map.EventType.CLICK, function(evt) {
    var c = evt.getCoordinate();
    console.log('Map clicked at', c.getLongitude(), c.getLatitude());
});
```

---

## 6. Browser cache (Service Worker)

When served over HTTPS, the library auto-registers `dist/bemap-sw-tiles.js` at the page root. PMTiles range requests are cached locally, giving a 60–80 % hit ratio after the first load and a 5 ms median latency on cache HIT.

```
{"bemap":{"language":"javascript"}}
map.enableBrowserCache();
map.disableBrowserCache();
map.getBrowserCacheStats();   // { enabled, hits, misses, entries, bytesEstimated }
map.clearBrowserCache();

map.on('cache:stats', function(stats) {
    console.log('cache:', stats.hits, 'hits /', stats.misses, 'misses');
});
```

See [Browser cache](docs/browser-cache.md) for the full configuration matrix.

---

## 7. Migrating from Leaflet / OpenLayers

Same Context object, different constructor:

```
{"bemap":{"language":"javascript"}}
// Before — Leaflet + WMS
var map = new bemap.LeafletMap(ctx, 'map').defaultLayers();

// After — MapLibre + BeNomad Tiles
var map = new bemap.MapLibreMap(ctx, 'map');  // tilesHost on the Context does the rest
```

A side-by-side migration walk-through lives at [docs/migration-wms-to-tiles.md](docs/migration-wms-to-tiles.md).

---

## Complete HTML example

```
{"bemap":{"language":"xml"}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>BeMap — MapLibre + BeNomad Tiles</title>
    <link rel="stylesheet" href="../dist/maplibre-gl.css" type="text/css">
    <script src="../dist/maplibre-gl.js"></script>
    <script src="../dist/pmtiles.js"></script>
    <script src="../dist/bemap-js-api.min.js"></script>
</head>
<body>
    <div id="map1" style="width:100%;height:100vh;"></div>
    <script>
        var ctx = new bemap.Context({
            "login":     'your-bemap-login',
            "password":  'your-bemap-password',
            "secure":    true,
            "host":      'bemap.benomad.com',
            "tilesHost": 'mptiles-api.benomad.net'
        });
        var map = new bemap.MapLibreMap(ctx, 'map1').move(2.3412, 48.85693, 12);
    </script>
</body>
</html>
```
