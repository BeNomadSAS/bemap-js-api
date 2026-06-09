# Browser cache (Service Worker) — tutorial

The library ships `dist/bemap-sw-tiles.js` — a cache-first Service Worker
that intercepts PMTiles range requests and `.pbf` tile fetches, caches
them in the browser's Cache Storage, and serves repeat visits from disk.

## Why it's bundled

- **Latency**: 5 ms median on HIT vs. 50–200 ms on MISS (cold network).
- **Quota**: typical France-scale browsing fits in ~50-200 MB. PMTiles
  bundles tiles as range slices of one file, so duplicate fetches are
  common — the cache catches them.
- **Hit ratio**: 60-80 % on normal pan/zoom sessions.
- **Zero config**: `bemap.MapLibreMap` auto-registers the SW from
  `/bemap-sw-tiles.js` when the page is HTTPS or localhost.

## Setup — three steps

### 1. Copy the SW to your site root

The Service Worker file MUST be served from your origin root for
`scope: '/'` to apply. After installing the library:

```sh
# npm / Vite / webpack consumer
cp node_modules/bemap-js-api/dist/bemap-sw-tiles.js ./public/bemap-sw-tiles.js

# static site
cp bemap-js-api/dist/bemap-sw-tiles.js /var/www/html/bemap-sw-tiles.js
```

Verify it's reachable: open `https://your-site.example.com/bemap-sw-tiles.js`
in a browser — you should see the SW source.

### 2. Set `ctx.tilesHost`

The SW only auto-registers when the Context has a `tilesHost`. WMS
consumers don't pay for a SW they don't need.

```js
var ctx = new bemap.Context({
  host: 'bemap.benomad.com', secure: true,
  login: '...', password: '...',
  tilesHost: 'mptiles-api-beta.benomad.net'   // <-- this is the switch
});
new bemap.MapLibreMap(ctx, 'map');       // SW registers automatically
```

### 3. Verify it works

Open DevTools → **Console**. On a successful first load you will see:

```
[bemap] BeNomad Tiles: browser cache active (Service Worker registered at /bemap-sw-tiles.js)
```

Then DevTools → **Application** → **Service Workers** — expect a row for
`/bemap-sw-tiles.js` with status `activated and is running`.

Then DevTools → **Application** → **Cache Storage** → `bemap-tiles-v2` —
entries appear as you pan. Empty after pan = SW isn't intercepting.

Then DevTools → **Network** — tile requests (`*.pmtiles` byte-range,
`*.pbf`) should show **(ServiceWorker)** in the *Initiator* column and
`X-SW-Cache: HIT` in response headers after the first miss.

## Diagnostic logs the library emits

Open DevTools → Console on every page that constructs a `bemap.MapLibreMap`
with `ctx.tilesHost` set:

| You see this | Cache state | Action |
| --- | --- | --- |
| `[bemap] BeNomad Tiles: browser cache active (Service Worker registered at /bemap-sw-tiles.js)` | ✅ **ON** | Nothing — you're set |
| `[bemap] BeNomad Tiles: browser cache disabled by opts.browserCache:false — every tile will hit the network` | ❌ OFF (opt-out) | Remove `browserCache:false` from your `MapLibreMap` options |
| `[bemap] BeNomad Tiles: Service Worker not supported here — tile caching is OFF.` | ❌ OFF (insecure context) | Serve over HTTPS, or test on `localhost` |
| `[bemap] BeNomad Tiles: Service Worker registration returned null — tile caching is OFF.` | ❌ OFF (file missing) | Copy `dist/bemap-sw-tiles.js` to your site root |
| `[bemap] BeNomad Tiles: Service Worker registration failed — tile caching is OFF.` | ❌ OFF (network / 404) | Check that `/bemap-sw-tiles.js` returns 200 |
| `[bemap] BeNomad Tiles: bemap.BrowserCache is not loaded — tile caching is OFF.` | ❌ OFF (stale bundle) | Rebuild your `dist/bemap-js-api.js` from a current source tree |

No log at all → either `ctx.tilesHost` is not set (so the library doesn't
care about the SW) or your bundle is older than v2.0.

## Toggle

```js
var map = new bemap.MapLibreMap(ctx, 'map'); // browserCache defaults to true

map.enableBrowserCache();    // on
map.disableBrowserCache();   // off
map.clearBrowserCache();     // wipe Cache Storage
map.getBrowserCacheStats();  // { enabled, hits, misses, entries, bytesEstimated }

map.onCacheStats(function (stats) {
  // live updates ~250 ms while activity is ongoing
});
```

The on/off state is persisted in `localStorage` under the key
`bemap_browser_cache`, so customer consent banners can flip it at any
time without dropping the SW registration.

## GDPR position

The tile cache is a **strictly necessary technical cache** — no personal
data, no tracking identifiers, no cookies. It stores the same map
chunks the CDN would have served anyway, just locally. The library does
not require user opt-in for the cache itself.

If your legal team requires explicit consent, wire the consent banner to
`enableBrowserCache()` / `disableBrowserCache()`.

## Configuration

| Option | Default | Effect |
| --- | --- | --- |
| `browserCache: true` | (default) | Auto-register the SW when HTTPS or localhost |
| `browserCache: false` | | Skip SW registration entirely |
| `browserCache: 'auto'` | | Same as `true` — explicit shorthand |
| `serviceWorkerPath: '/sw.js'` | `/bemap-sw-tiles.js` | Custom SW path |

## Where the file goes

After `grunt scripts:dev` the build emits `dist/bemap-sw-tiles.js` from
the `concat.sw` target. **This is the file customers copy to their
site root.**

The SW lives in its own global scope, so it cannot be merged into the
main `dist/bemap-js-api.js` bundle. Customers must serve it from the
site root for `scope: '/'` to apply.

## Multi-host coordination

If two `MapLibreMap` instances on the same page register different
`tilesHost` values, the SW accumulates them (up to 4 distinct hosts). The
5th distinct host triggers a `CACHE_HOST_CONFLICT` message that flows
into the map's error channel:

```js
map._onError('error', function (err) {
  if (err.code === bemap.Error.CACHE_HOST_CONFLICT) {
    // Too many concurrent tile hosts — your fifth host will not be cached
  }
});
```
