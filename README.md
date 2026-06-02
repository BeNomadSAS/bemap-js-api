# BeMap JavaScript API

Putting geolocation at the core of your business.

BeMap JS API is a JavaScript SDK for [BeNomad](http://www.benomad.com/)'s mapping
and geolocation platform — a single, unified API over the **OpenLayers**,
**Leaflet**, and **MapLibre GL** map engines, plus services for routing,
geocoding, autocomplete, isochrone, charging stations, and EV routing.

> This repository is the **ready-to-use distribution**: the built library, the
> runnable examples, and the full API reference. (The source and build tooling
> live in BeNomad's internal repository.)

## What's in here

```
dist/                       Built library + everything it needs
  bemap-js-api.js               development build (readable)
  bemap-js-api.min.js           production build (minified)
  bemap-js-api.css              library styles
  ol.js / leaflet.js /          the map engines — load the one you use
    maplibre-gl.js / pmtiles.js
  bemap-sw-tiles.js             Service Worker for PMTiles tile caching
  doc/                          full JSDoc API reference (open doc/index.html)
examples/                   Demo dashboard + a runnable example per feature
docs/                       Narrative guides (tile cache, migration, styling, …)
```

## Use it

**1. Load the engine you want + the BeMap bundle:**

```html
<link rel="stylesheet" href="dist/leaflet.css">
<link rel="stylesheet" href="dist/bemap-js-api.css">
<script src="dist/leaflet.js"></script>
<script src="dist/bemap-js-api.min.js"></script>
```
> Swap `leaflet` for `ol` (OpenLayers) or `maplibre-gl` + `pmtiles` (MapLibre).

**2. Create a context, show a map, add things:**

```javascript
var ctx = new bemap.Context({
    login:    "<your account>",
    password: "<your password>",
    secure:   true,
    host:     "bemap-beta.benomad.com"
});

var map = new bemap.LeafletMap(ctx, "map-div")
    .defaultLayers()
    .move(2.35, 48.85, 12);

map.addMarker(new bemap.Marker(new bemap.Coordinate(2.35, 48.85)));
```

Full setup options → [INSTALL.md](INSTALL.md). Step-by-step walkthrough → the examples.

## Try the examples

Serve this folder over a static server (or any host) and open the dashboard — it
lets you switch engines, switch geoservers, copy the code, and run every service:

```bash
npx http-server -p 8080
# then open  http://localhost:8080/examples/
```
> Open it via `localhost` / `127.0.0.1` (or HTTPS) so the PMTiles Service-Worker
> tile cache can register — Service Workers don't run on plain `http://`.

## API reference

Open **[`dist/doc/index.html`](dist/doc/index.html)** for the full JSDoc — every
class and method: `OlMap`, `LeafletMap`, `MapLibreMap`, `RoutingV2`, `Geocoder`,
`Autocomplete`, `ChargingStations`, `EvSmartRouting`, and more.

## Features

- Map display on **OpenLayers**, **Leaflet**, or **MapLibre GL** (+ BeNomad PMTiles vector tiles)
- Markers (custom icons, labels, clustering, drag), polylines, polygons, circles, popups
- Routing (multi-stop, alternatives, route sheets), EV smart routing + charging stations
- Isochrone / reachable-area, geocoding + reverse geocoding, address autocomplete
- WMS layers with GetFeatureInfo, a unified event system, typed `bemap.Error` handling

## Version

2.0.0

## License

See [LICENSE.md](LICENSE.md).
