# Installing BeMap JS API in your app

This guide is for **consumers** integrating BeMap into their web application.
For developing the library itself, see the "Building from source" section at the bottom.

> 🏃 **Just want to see it run first?** Double-click **`start.bat`** (Windows) or **`./start.sh`**
> (macOS / Linux), then open <http://localhost:8080/examples/>. Running & publishing in full:
> **[DEPLOY.md](DEPLOY.md)**.
>
> 🤖 **Using an AI assistant (Claude / Cursor / Copilot)?** Point it at the
> **`benomad-tiles-integration/`** skill shipped in this package — copy-paste
> templates (web SDK, raw MapLibre, Flutter, backend token proxy) plus an
> api-contract + troubleshooting reference tuned to get integration right the first try.

---

## 1. Get the package

After unzipping `bemap-js-api.zip`, you have:

```
bemap-js-api/
├── dist/
│   ├── bemap-js-api.js           # full bundle (development)
│   ├── bemap-js-api.min.js       # minified bundle (production)
│   ├── bemap-js-api.css          # required stylesheet
│   ├── bemap-sw-tiles.js         # Service Worker — optional (only for tilesSliceMode:'range'; the '200' default uses the browser HTTP cache)
│   ├── doc/                      # JSDoc API reference — open dist/doc/index.html
│   ├── ol.js, ol.css             # OpenLayers v10 (only if you use Ol3Map)
│   ├── leaflet.js, leaflet.css   # Leaflet 1.9 (only if you use LeafletMap)
│   ├── maplibre-gl.js, .css      # MapLibre GL v5 (only if you use MapLibreMap)
│   ├── pmtiles.js                # PMTiles protocol (required for BeNomad Tiles)
│   └── leaflet.markercluster.js  # only if you use ClusterLayer with Leaflet
├── examples/                     # full runnable dashboard — open examples/index.html
├── docs/                         # narrative tutorials (browser-cache, migration, …)
└── README.md, LICENSE.md, INSTALL.md, llms.txt
```

Copy the contents of `dist/` into your project's `public/` (or `static/`, `assets/`,
whatever your bundler serves). Pick only the engine files you actually use.

---

## 2. The minimum HTML

### WMS path (Leaflet / OpenLayers)

```html
<link rel="stylesheet" href="/bemap/leaflet.css">
<link rel="stylesheet" href="/bemap/bemap-js-api.css">
<script src="/bemap/leaflet.js"></script>
<script src="/bemap/bemap-js-api.js"></script>

<div id="map" style="width:100vw;height:100vh"></div>
<script>
  var ctx = new bemap.Context({
    host: 'bemap.benomad.com', secure: true,
    login: 'your-bemap-login',
    password: 'your-bemap-password'
  });
  var map = new bemap.LeafletMap(ctx, 'map');
  map.defaultLayers();
  map.move(2.35, 48.85, 12);
</script>
```

### BeNomad Tiles path (MapLibre, recommended for new apps)

```html
<link rel="stylesheet" href="/bemap/maplibre-gl.css">
<link rel="stylesheet" href="/bemap/bemap-js-api.css">
<script src="/bemap/maplibre-gl.js"></script>
<script src="/bemap/pmtiles.js"></script>           <!-- required when ctx.tilesHost is set -->
<script src="/bemap/bemap-js-api.js"></script>

<div id="map" style="width:100vw;height:100vh"></div>
<script>
  var ctx = new bemap.Context({
    host: 'bemap.benomad.com', secure: true,
    login: 'your-bemap-login',
    password: 'your-bemap-password',
    tilesHost: 'mptiles-api.benomad.net'
  });
  var map = new bemap.MapLibreMap(ctx, 'map');
  map.move(2.35, 48.85, 12);
</script>
```

> **Environments.** The examples above use **production** (the default). Two more
> environments exist for integration testing and validation — always pair an API
> host with its matching tiles host, and never mix hosts across environments:
>
> | Environment | `host` (BeMap API) | `tilesHost` (BeNomad Tiles) |
> | --- | --- | --- |
> | **Production** (default) | `bemap.benomad.com` (or `bemap-prod.benomad.com`) | `mptiles-api.benomad.net` |
> | **Preprod** (staging) | `bemap-preprod.benomad.com` | `mptiles-api-preprod.benomad.net` |
> | **Beta** (testing) | `bemap-beta.benomad.com` | `mptiles-api-beta.benomad.net` |

If `pmtiles.js` is missing the library prints a loud red console error with
the exact tag to add. Same for `maplibre-gl.js` / `maplibre-gl.css`.

---

## 3. **Optional** — Service Worker (only for classic 206-range mode)

By **default** (`tilesSliceMode: '200'`), tiles are fetched as cacheable
HTTP 200 slices that the **browser's own HTTP cache stores natively** —
repeat visits are free with **no Service Worker to deploy**. Most
integrators can skip this section entirely.

You only need the Service Worker if you opt into the classic HTTP-Range
path (`tilesSliceMode: 'range'`) or force `serviceWorker: true`. In that
case the library auto-registers `/bemap-sw-tiles.js`, which MUST be served
from your **site root** (not `/bemap/`) so its scope covers the origin:

```sh
cp bemap-js-api/dist/bemap-sw-tiles.js public/bemap-sw-tiles.js
```

Verify: open your app → DevTools → Console. On a working setup you'll see:

```
[bemap] BeNomad Tiles: browser cache active (Service Worker registered at /bemap-sw-tiles.js)
```

Several log lines cover the failure cases (HTTP page, missing file, stale
bundle, etc.) and each names the fix. Full tutorial — including the
200-slice vs range trade-off and the resilience knobs — in
[`docs/browser-cache.md`](docs/browser-cache.md).

---

## 4. Get your credentials

The dashboard ships **without** bundled credentials. On first visit the
topbar shows a yellow `[Demo]` badge with empty login/password — the
service calls will fail with `401 Unauthorized` until you set your own.

For production credentials, contact your BeNomad account manager — they
provision a login/password tied to the services your contract covers
(WMS, BeNomad Tiles, Geocoding v2, Routing v2, POI v2, EV Smart Routing,
etc.).

The dashboard's topbar exposes a **Credentials** button (next to
"Open ↗" / "← Dashboard"). Clicking it opens a small panel with login +
password inputs. Saved values persist in `localStorage` under
`bemap.user-credentials.v1` and are used:

- For every service call made from the dashboard.
- Substituted into copyable code snippets (the code panel under each example).
- Carried across page reloads and across the entire SPA.

The badge next to the button reads **Demo** (yellow) or **User** (green).

---

## 5. Framework integration notes

The library is a plain UMD-style global (`window.bemap`). It works in any
framework:

### npm (vendored copy)

```sh
npm install --save file:./vendor/bemap-js-api
```

Or copy `dist/` into your repo and add `<script>` tags directly in
`index.html`. The library does NOT depend on a module bundler.

### Vite

```js
// vite.config.js
export default {
  publicDir: 'public',   // place bemap-sw-tiles.js + dist/* here
};
```

### Webpack

Add `dist/bemap-js-api.js` via `<script>` tag (entry-point approach) or
import it as a side-effect module:

```js
import 'bemap-js-api/dist/bemap-js-api.js';
// window.bemap is now available
```

### Next.js / Server-rendered frameworks

Use `next/script` with `strategy="beforeInteractive"` and put the SW
file in `public/bemap-sw-tiles.js`:

```jsx
<Script src="/bemap-js-api.js" strategy="beforeInteractive" />
```

### Angular

Add the scripts to `angular.json` under `architect.build.options.scripts`.
The SW file goes in `src/assets/` and is copied to the deployment root
by the Angular CLI's `assets` config.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Red console error mentioning missing `<script>` tag | A required engine library (maplibre-gl / pmtiles / leaflet / ol) is not loaded | Add the exact `<script>` tag the error names |
| Grey screen on MapLibre pan / fly | Tiles haven't loaded yet | The library now extends the bundled style's background to zoom 0 with a light-blue fill — if you still see grey, your container's CSS may be overriding. Add `background: #d4ecf5` to your map `<div>`. |
| Tiles never cache locally | SW not at site root | See section 3 above + `docs/browser-cache.md` |
| `401 Unauthorized` on tile requests | Bad credentials, or token expired and renewal failed | Check Network panel — `POST /api/login` should return 200. The library auto-renews 5 min before expiry. Manual reset: clear `sessionStorage` and reload. |
| `403 Forbidden` on a specific tile | Your account is not authorised for this tileset | Contact your BeNomad account manager. The library surfaces this on `map.on('error', ...)` with `code: bemap.Error.FORBIDDEN`. |
| Markers vanish when calling `removeLayer` | (Fixed in v2.0+) | Upgrade your bundle |

---

## Building from source (library developers only)

Skip this section if you're integrating the library into your app — the
zip ships with `dist/` already built.

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) v14+
- npm

### Build

```sh
git clone <repository-url>
cd bemap-js-api
npm install
npx grunt              # default: clean + concat + minify + copy
```

### Tasks

| Command | Description |
| --- | --- |
| `npx grunt` | Full build (clean + concat + minify + copy vendored libs) |
| `npx grunt scripts:dev` | Concat sources into `dist/bemap-js-api.js` + emit SW |
| `npx grunt scripts:dist` | Minify + copy vendored libs into `dist/` |
| `npx grunt doc` | Generate JSDoc into `dist/doc/` |
| `npx grunt test` | Karma + ChromeHeadless — runs 2,287 specs |
| `npx grunt monitoring` | Watch sources, rebuild on save |
| `npx grunt package` | Full build + JSDoc + zip → `package/bemap-js-api.zip` |

### Tests

`npx grunt test` runs the full Karma suite (2,287 specs across 88 files):

- unit-test files covering every public class + engine
- 3 retrocompat suites (BFleet, EVMove5, BeMap-Doc) — must NOT be edited
- legacy + integration/e2e test files

### Source layout

```
src/
  bemap.js                            Core namespace + Context + Error + utilities
  _bemap/bemap-runtime-config.js      RuntimeConfig Proxy singleton
  bemap-object.js, bemap-listener.js  Base classes
  bemap-map.js                        Abstract Map + EventType / DEFAULT_LAYER enums
  bemap-mapevent.js                   Map event class
  bemap-service.js                    Abstract Service base
  bemap-model/                        Coordinate, BoundingBox, Layer, Marker, etc.
  bemap-ol/bemap-ol-v10/              OpenLayers v10 engine
  bemap-leaflet/                      Leaflet 1.9 engine
  bemap-maplibre/                     MapLibre v5 engine + BeNomad Tiles + SW client
  bemap-sw/sw-tiles.js                Service Worker (emitted to dist/bemap-sw-tiles.js)
  bemap-services-v2/                  V2 service classes (geocoding, routing, POI, EV)
  bemap-services/                     V1 service classes (legacy, retrocompat)
  bemap-attribution/                  AttributionWidget
  bemap-extensions/                   Google polyline decoder
src-test/                             Karma + Jasmine specs
gruntfile.js                          Build pipeline
karma.conf.js                         Test runner
```
