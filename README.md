<div align="center">

# 🗺️ BeMap JavaScript API

### One SDK · three map engines · maps, routing, geocoding & EV — by [BeNomad](https://www.benomad.com)

### 🌐 **[▶ Open the live demo →](https://benomadsas.github.io/bemap-js-api/)**

[![live demo](https://img.shields.io/badge/▶_live_demo-online-2ea44f?style=flat-square)](https://benomadsas.github.io/bemap-js-api/)
![version](https://img.shields.io/badge/version-2.0.0-2ea44f?style=flat-square)
![engines](https://img.shields.io/badge/engines-MapLibre%20GL%20·%20Leaflet%20·%20OpenLayers-1f6feb?style=flat-square)
![tiles](https://img.shields.io/badge/BeNomad%20Tiles-PMTiles%20vector-8957e5?style=flat-square)
![license](https://img.shields.io/badge/license-Commercial-f0883e?style=flat-square)

**Vector tiles · 3D & globe · routing · geocoding · autocomplete · isochrones · EV charging & smart routing** — one unified, engine-agnostic API over **MapLibre GL v5**, **Leaflet 1.9**, and **OpenLayers v10**.

</div>

---

## ▶️ Try it in 10 seconds

**Just want to look?** → open the **[live demo](https://benomadsas.github.io/bemap-js-api/)** — nothing to install.

**To run it on your machine:**

**1. Get the code** — [**Download ZIP**](https://github.com/BeNomadSAS/bemap-js-api/archive/refs/heads/main.zip) and unzip it, or `git clone https://github.com/BeNomadSAS/bemap-js-api.git`.

**2. Start it** — **Windows:** double-click **`start.bat`** &nbsp;·&nbsp; **macOS / Linux:** run **`./start.sh`**

Your browser opens the **live demo dashboard** — no build, no config. *(Needs [Node.js](https://nodejs.org). No Node? Run `python -m http.server 8080` from the unzipped folder, then open <http://localhost:8080/examples/>.)*

> ⚠️ **Don't** double-click `index.html` — browsers block maps & docs on `file://`. The launcher runs a local server for you.

Then in the dashboard → click **Credentials** (top-right), pick your **Environment**, enter your **BeMap login**, and explore every feature with **live, copy-paste-ready** code.

---

## 🚀 Use it in your app — 2 steps

**1 · Copy the `dist/` files into your project, then load an engine + the BeMap bundle**

Copy the **`dist/`** folder from this package into your app (e.g. `public/`, `static/`, `assets/`), then reference the files — adjust the paths to wherever you put them:

```html
<link rel="stylesheet" href="dist/leaflet.css">
<link rel="stylesheet" href="dist/bemap-js-api.css">
<script src="dist/leaflet.js"></script>
<script src="dist/bemap-js-api.min.js"></script>
```
> Swap `leaflet` for `ol` (OpenLayers), or `maplibre-gl` + `pmtiles` (MapLibre + vector tiles). You only need the engine files you actually use.

**2 · Context → map → marker**

```javascript
var ctx = new bemap.Context({
    login:    "<your account>",
    password: "<your password>",
    secure:   true,
    host:     "bemap-beta.benomad.com"
});

var map = new bemap.LeafletMap(ctx, "map-div").defaultLayers().move(2.35, 48.85, 12);
map.addMarker(new bemap.Marker(new bemap.Coordinate(2.35, 48.85)));
```

The **same code runs on all three engines** — switch the constructor, switch the backend:

| Constructor | Backend |
|---|---|
| `new bemap.MapLibreMap(ctx, "map")` | **BeNomad Tiles** — vector PMTiles, 3D, globe *(v2.0 default)* |
| `new bemap.LeafletMap(ctx, "map").defaultLayers()` | BeMap **WMS** raster — lightweight |
| `new bemap.Ol3Map(ctx, "map").defaultLayers()` | BeMap **WMS** raster — full GIS |

---

## ✨ What's inside

- 🗺️ **Maps** — MapLibre GL vector tiles, Leaflet & OpenLayers raster; 3D buildings, terrain, globe projection
- 📍 **Geometry** — markers (icons, labels, clustering, drag), polylines, polygons, circles, popups
- 🧭 **Routing** — multi-stop, alternatives, route sheets, trace-route
- 🔌 **EV** — smart routing, charging stations, reachable area, charging-time, vehicle catalogue
- 🔎 **Geocoding** — forward, reverse, address autocomplete, isochrones / reachable zones
- ⚡ **BeNomad Tiles** — JWT-secured PMTiles + a zero-config Service-Worker tile cache
- 🧱 **One API, three engines** — same `Context`, same calls, just change the map class

---

## 📚 Learn more

| | |
|---|---|
| 🧪 **Live dashboard** | open `examples/` — every feature, runnable, with copyable code |
| 📖 **API reference** | open **`dist/doc/index.html`** — full JSDoc for every class & method |
| 🧩 **Integrate into your app** | **[INSTALL.md](INSTALL.md)** — bundlers, frameworks, the Service Worker |
| 🚀 **Publish online** | **[DEPLOY.md](DEPLOY.md)** — host the dashboard / your app + the one CORS rule |

---

## License

Commercial — see **[LICENSE.md](LICENSE.md)**. © BeNomad.
