<div align="center">

# 🗺️ BeMap JavaScript API

### One SDK · three map engines · maps, routing, geocoding & EV — by [BeNomad](https://www.benomad.com)

![version](https://img.shields.io/badge/version-2.0.0-2ea44f?style=flat-square)
![engines](https://img.shields.io/badge/engines-MapLibre%20GL%20·%20Leaflet%20·%20OpenLayers-1f6feb?style=flat-square)
![tiles](https://img.shields.io/badge/BeNomad%20Tiles-PMTiles%20vector-8957e5?style=flat-square)
![license](https://img.shields.io/badge/license-Commercial-f0883e?style=flat-square)

**Vector tiles · 3D & globe · routing · geocoding · autocomplete · isochrones · EV charging & smart routing** — one unified, engine-agnostic API over **MapLibre GL v5**, **Leaflet 1.9**, and **OpenLayers v10**.

</div>

---

## ▶️ Try it in 10 seconds

> **Windows:** double-click **`start.bat`** &nbsp;·&nbsp; **macOS / Linux:** run **`./start.sh`**

Your browser opens the **live demo dashboard** — no build, no config. *(Needs [Node.js](https://nodejs.org). No Node? Run `python -m http.server 8080` and open <http://localhost:8080/examples/>.)*

> ⚠️ **Don't** double-click `index.html` — browsers block maps & docs on `file://`. Always go through a local server (the launchers above do exactly that).

Inside the dashboard → click **Credentials** (top-right), pick your **Environment**, enter your **BeMap login**, and explore every feature with **live, copy-paste-ready** code.

---

## 🚀 Use it in your app — 2 steps

**1 · Load an engine + the BeMap bundle**

```html
<link rel="stylesheet" href="dist/leaflet.css">
<link rel="stylesheet" href="dist/bemap-js-api.css">
<script src="dist/leaflet.js"></script>
<script src="dist/bemap-js-api.min.js"></script>
```
> Swap `leaflet` for `ol` (OpenLayers), or `maplibre-gl` + `pmtiles` (MapLibre + vector tiles).

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

## 🌍 Put it online

Host the `examples/` dashboard — or your own app — on any static host: **GitHub Pages**, Netlify, S3, your own server. The only requirement is that your BeMap **API host** and **tiles host** allow your site's origin (CORS). Step-by-step → **[DEPLOY.md](DEPLOY.md)**.

---

## License

Commercial — see **[LICENSE.md](LICENSE.md)**. © BeNomad.
