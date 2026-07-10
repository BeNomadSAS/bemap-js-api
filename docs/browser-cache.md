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
  // Environments — prod (default) shown; preprod & beta exist for testing:
  //   preprod: bemap-preprod.benomad.com + mptiles-api-preprod.benomad.net
  //   beta:    bemap-beta.benomad.com    + mptiles-api-beta.benomad.net
  tilesHost: 'mptiles-api.benomad.net'   // <-- this is the switch
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

Then DevTools → **Application** → **Cache Storage** → `bemap-tiles-v3` —
entries appear as you pan. Empty after pan = SW isn't intercepting.

Then DevTools → **Network** — tile requests (`*.pmtiles` byte-range,
`*.pbf`) should show **(ServiceWorker)** in the *Initiator* column and an
`X-SW-Cache` response header: `MISS` on the cold (network) fetch and
`HIT` once the tile is served from Cache Storage. (The cold response
keeps its real status — a 206 range read stays 206; only the cached
copy is normalised to 200.)

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
| `rangeCacheMode: 'auto'` | (default) | Desktop-Chromium PMTiles Range no-store fix — see below. `'auto'` applies it on desktop Chromium only |
| `rangeCacheMode: 'default'` | | Opt out — never override the browser's default cache mode |
| `rangeCacheMode: 'no-store'` | | Force `no-store` on every Range request in every browser |

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

## Desktop-Chromium Range performance (`rangeCacheMode`)

PMTiles reads slices of one archive with HTTP **Range** requests (206
responses). On **desktop Chromium** (Chrome / Edge / Brave / Opera on
macOS, Windows, or Linux), Chromium's disk cache **serialises**
concurrent same-URL range reads, which makes those reads **~3–5× slower**
than the same reads issued with `cache: 'no-store'`. The upstream
`pmtiles` library already forces `no-store` — but **only on Windows
Chromium**. `bemap.RangeFetchPolicy` extends the same fix to **all**
desktop Chromium.

- **Auth-independent and worker-independent.** It is applied at the
  `fetch()` layer, not gated on the Service Worker — PMTiles requests can
  fire before the SW registers, and the fix helps against the BeNomad
  Worker, raw R2/S3, and public/presigned URLs alike.
- **Safari, iOS (including Chrome-on-iOS / CriOS), and Firefox are
  unaffected and left completely untouched** — no `cache` override is
  applied for them.
- **Exactly one global `fetch` interceptor.** When `ctx.tilesHost` is set,
  `bemap.TilesAuth` already patches `window.fetch` for tile auth (see the
  cookie section below) and simply *reuses* this policy inside that single
  patch. For a raw
  `opts.tiles` PMTiles URL (an origin that bypasses TilesAuth), a
  standalone installer patches `fetch` once — and no-ops if TilesAuth
  already owns the patch. There is never a second global patch.
- **Never mutates your `init`.** An explicit `cache` mode you pass
  (`reload` / `force-cache` / `no-store` / `no-cache`) is always
  preserved; the policy only ever fills in `no-store` when you left
  `cache` unset.

```js
// Default — no action needed. 'auto' applies the fix on desktop Chromium.
new bemap.MapLibreMap(ctx, 'map');

// Opt out entirely (keep the browser's default cache behaviour):
new bemap.MapLibreMap(ctx, 'map', { rangeCacheMode: 'default' });

// Force no-store on every Range request, in every browser:
new bemap.MapLibreMap(ctx, 'map', { rangeCacheMode: 'no-store' });
```

`rangeCacheMode` is a page-level default, read by **both** the
BeNomad-Tiles path and the raw-`opts.tiles` path, so a single option
covers every PMTiles fetch on the page.

## Tile auth — pick your wire mechanism (`tilesAuth`)

By **default** browser tile auth is **`auto`**: the SDK compares the app's
origin with `tilesHost` and picks the right wire mechanism per deployment —
**same site ⇒ cookie** (first-party HttpOnly session cookie, zero preflight);
**cross-site ⇒ header** (`X-Session-Token`, works in incognito / Safari /
Firefox, where a third-party cookie is blocked). A new consumer needs **no**
auth config and it never silently breaks cross-site. You can still pin the
wire mechanism per Context (or override per map) with a `tilesAuth` config:

```js
new bemap.Context({
  tilesHost: 'tiles.example.net',
  tilesAuth: {
    mode: 'auto',                   // 'auto' (default) | 'cookie' | 'header' | 'query'
    credentials: 'include',         // cookie mode: 'include' | 'same-origin' | 'omit'
    tokenHeader: 'X-Session-Token', // header mode
    tokenParam: 'token'             // query mode
  }
});

new bemap.Context({ tilesHost: '...', tilesAuth: 'header' });        // string shorthand
new bemap.MapLibreMap(ctx, 'map', { tilesAuth: { mode: 'query' } }); // per-map override
```

| `mode` | How tile/style requests authenticate |
| --- | --- |
| `auto` *(default)* | Resolve at runtime: **same registrable domain** as `tilesHost` ⇒ `cookie`; **cross-site** ⇒ `header`. Zero config, never breaks cross-site. |
| `cookie` | `credentials: <credentials>`; no header, no query → **no CORS preflight**. First-party only — a cross-site `SameSite=None` cookie is blocked in incognito / Safari / Firefox. Needs cookie-capable Worker CORS (below). |
| `header` | `<tokenHeader>: <jwt>` on each request. Works without cookies (incognito-safe). Preflight cost is **path-dependent**: on the Range+`no-store` path a custom header preflights *every* request; on the **200-slice** path (the default) it is one cheap `OPTIONS` the first time each slice URL is seen, cached 24h by `Access-Control-Max-Age` — no per-request storm. |
| `query` | `?<tokenParam>=<jwt>` on the URL. No header/cookie → no preflight, incognito-safe; the Worker keeps the token out of its edge cache key. Cost: token in the URL, and the browser cache refills on token rotation (~daily). |

Applies uniformly to the pmtiles Range interceptor, MapLibre's
`transformRequest` (style/glyph/sprite/XYZ), `TilesStyle.fetch`, and
`login`/`logout`. Unset ⇒ `auto`. `rangeCacheMode` is a separate option
(cache behaviour, not auth) and is unchanged.

### Cookie mode details (auto-selected same-site)

`bemap.TilesAuth` sends `credentials: 'include'` on
tile requests (both the global `fetch` interceptor that pmtiles Range
reads flow through, and MapLibre's `transformRequest` for
style/glyph/sprite/XYZ) — and attaches **no** `X-Session-Token` header.

Why it matters: a custom request header is **not** CORS-safelisted, so it
forces a **preflight `OPTIONS`** on every cross-origin request. Combined
with `cache: 'no-store'` (the desktop-Chromium Range fix above), Chromium
bypasses its preflight cache and sends **one `OPTIONS` per Range request**
— a preflight storm that starves the actual tile GETs. A Range GET
carrying only the safelisted `Range` header sends **no preflight**, so the
storm disappears while `no-store` stays.

The cookie is set at login: `TilesAuth.login()` POSTs with
`credentials: 'include'` so the browser stores the Worker's
`Set-Cookie: session=…; HttpOnly; Secure; SameSite=None`, and the
`whenTokenReady()` gate ensures login has completed before any tile
request fires.

**Deployment requirements** (the Worker side, not the SDK):

- The Worker must return, on tile `200`/`206` **and** any `OPTIONS`,
  `Access-Control-Allow-Credentials: true` and an
  `Access-Control-Allow-Origin` that **echoes the exact request Origin**
  (never `*` — credentialed responses with `*` are rejected by the
  browser and the tile is dropped).
- Cookie mode is **first-party only**. `SameSite=None; Secure` cookies are
  blocked in a third-party context (app site ≠ tiles site) by Safari ITP,
  Firefox Total Cookie Protection, and Chrome incognito / tracking-protection.
  This is exactly why the **`auto`** default falls to `header` cross-site — so
  you only ever land on cookie mode where it is genuinely same-site. If you
  *pin* `mode:'cookie'` on a cross-site app it will `401` in those browsers;
  use `auto` (or `header`) there instead.
- Login and logout still send `Authorization: Basic` / `X-Session-Token`,
  so they preflight **once per session** (not per tile) — the Worker
  `OPTIONS` must list those headers, echo the Origin, and set
  `Allow-Credentials: true` (a long `Max-Age` caches it).

> **Mobile note.** MapLibre **Native** (Flutter) cannot set cookies or
> custom headers and uses the Worker's `?token=` query param — a separate
> stack (`bemap-flutter-api`), unaffected by this browser-SDK change.

## Self-healing pmtiles cache (`recoverableCache`)

pmtiles keeps an in-memory cache of the archive **header** and **directory**
reads. The stock cache (`SharedPromiseCache`) caches the *promise* — and when a
read fails (a timeout, a network blip, an aborted socket) it leaves the
**rejected** promise cached forever. Every tile that depends on that
directory then replays the same failure → a **permanent blank region until a
full page reload**. (pmtiles only invalidates on an ETag mismatch, never on a
timeout/error.)

`bemap.RecoverablePromiseCache` fixes this: it evicts a cache entry the moment
its promise rejects, so the **next** read re-fetches instead of replaying the
failure. It is transparent — success caching, in-flight de-duplication, LRU
pruning and `invalidate()` are all unchanged; only *failed* reads differ.

`bemap.MapLibreMap` wires it into the tiles archive automatically:

```js
new bemap.MapLibreMap(ctx, 'map');                              // recoverableCache: true (default)
new bemap.MapLibreMap(ctx, 'map', { recoverableCache: false }); // opt out → pmtiles' stock cache
```

| Option | Default | Effect |
| --- | --- | --- |
| `recoverableCache: true` | (default) | Self-healing cache — a failed header/directory read recovers on the next read. |
| `recoverableCache: false` | | Stock `SharedPromiseCache` (a failed read stays a hole until reload). |

The wiring is defensive: if the archive URL can't be resolved to match what
MapLibre requests, the pmtiles Protocol simply auto-creates its own default
cache (exactly today's behaviour) — a mismatch can never break tile loading, it
only means the fix doesn't apply. `map.getTilesConfig()` reports the resolved
tiles config (`recoverableCache`, `rangeCacheMode`, `tilesAuth`, `serviceWorker`).

> **Note.** This addresses *recoverable* freezes. A reload-proof freeze (survives
> Ctrl+Shift+R) is usually a wedged HTTP/2 socket that outlives the reload — the
> durable fix there is **HTTP/3** on the tile host + client (infrastructure, not
> SDK code).

## 200-slice mode (`tilesSliceMode`) — browser-cached tiles, often no SW

**This is the biggest tile perf lever.** pmtiles normally reads the archive with
HTTP **Range → 206 Partial Content**, which browsers do **not** reliably store in
their HTTP cache — that's the whole reason the Service Worker exists on the Range
path. In **200-slice** mode the SDK reads the archive as `<archive>?r=<start>-<end>`
GETs (inclusive offsets, **no** `Range` header); the Worker returns a plain **HTTP
200** with `Cache-Control: public, max-age=2592000, immutable`, which the
**browser's native HTTP cache stores** at a stable URL. Repeat tiles and repeat
visits are then served from disk **with zero Service Worker**.

```js
new bemap.MapLibreMap(ctx, 'map');                              // tilesSliceMode: '200' (default)
new bemap.MapLibreMap(ctx, 'map', { tilesSliceMode: 'range' }); // classic HTTP Range (206)
```

| Option | Default | Effect |
| --- | --- | --- |
| `tilesSliceMode: '200'` | (default) | `?r=` slices → cacheable 200s (browser HTTP cache). **Requires a Worker that serves the `?r=` route** — BeNomad Tiles does on all envs. |
| `tilesSliceMode: 'range'` | | Classic HTTP Range (206) via pmtiles' stock source — byte-for-byte today's path. `'206'` is accepted as an alias. |
| `serviceWorker: true \| false` | auto | Auto = SW **off** under `'200'` (browser cache replaces it), **on** under `'range'`. Force either way. Legacy `browserCache:false` still opts out. |

Auth composes for free: slice reads go through `window.fetch`, so `bemap.TilesAuth`
injects the configured auth (cookie / header / `?token=`); and a 200-slice has no
`Range` header, so `rangeCacheMode`'s `no-store` correctly does **not** apply — the
200 stays cacheable.

> **Worker dependency.** `'200'` only works against a Worker that serves the `?r=`
> slice route (returns 200 + `immutable`). If yours doesn't, set
> `tilesSliceMode: 'range'`. A slice read against a non-slicing Worker fails with
> a clear `HTTP <status>` error (it does not silently corrupt tiles).

### Resilience gate (`tileGate`) — smart-abort timeout + retries (+ optional cap)

Slice reads run through `bemap.RangeGate` with **smart-abort** semantics: each
attempt gets a private `AbortController`; a caller cancel (pan/zoom) or the TTFB
timeout may abort the socket **only before the response headers arrive**. Once
headers are in, the socket is never killed (aborting a streaming body poisons the
browser's shared H2/H3 connection) — the body drains to completion, a caller
cancel is honoured *logically* afterwards (the bytes are discarded but the browser
cache stays warm), and a generous body safety cap guards only a truly dead socket.
Transient failures (429 / 5xx / timeout / network) are retried with backoff —
**never** on a caller cancel. An optional concurrency cap is **off by default**
(the origin is fast, so uncapped is smoother; the cap is a tradeoff you opt into).

| Option | Default | Effect |
| --- | --- | --- |
| `tileGate` | `true` | Master switch for timeout+retry(+cap). `false` → raw fetch. |
| `tilesSliceTimeoutMs` | `3500` | Per-attempt TTFB (pre-header) timeout. Keep above the Worker's ~3000 ms tile deadline so its 504 is received (and retried) instead of aborted. `0` = none. |
| `tilesSliceBodyTimeoutMs` | `20000` | Post-header body safety cap. Generous on purpose — only guards a truly dead socket. `0` = none. |
| `tilesSliceMaxRetries` | `3` | Retries on a transient failure; never on a pan/zoom cancel. |
| `tilesSliceRetryBackoffMs` | `[200, 500, 1000]` | Backoff (ms) before retries #1/#2/#3… (last entry repeats). |
| `tilesSliceConcurrency` | `0` | In-flight cap. `0` = uncapped. `>0` caps concurrent reads (FIFO). |
| `tilesErrorRefreshMs` | `4000` | Terminal safety net: debounced refresh of the tile sources after a *recoverable* tile error (timeout / 504 / network) — MapLibre never re-requests an errored tile on its own. `0` disables. |

### Runtime toggles + config readout

The SDK ships no UI (embedders build it — see the playground example). Live methods:

```js
map.setTileGateActive(false);        // flip the gate live — no reload
map.getTileGateActive();             // → Boolean
map.setTilesSliceMode('range');      // applies to archives wired AFTER this (reload for a full A/B)
map.getTilesConfig();                // resolved: { tilesSliceMode, recoverableCache, rangeCacheMode, tileGate, tilesAuth, serviceWorker }
new bemap.MapLibreMap(ctx, 'map', { onTileGateChange: function (active) { /* update your button */ } });
```

URL kill-switches (handy for demos/diagnostics): `?noslice` forces `range`,
`?nogate` disables the gate — both without touching code.

**Try every combination** in `examples/example-maplibre-tiles-perf.html` (the
"Tiles perf & robustness playground") — it exposes every option above as a
control, shows `getTilesConfig()` live, and measures cache-served % so you can see
200-slice warm-cache hits vs range.

## Recovering an uncontrolled worker (no reload)

A Service Worker that installs on the very first visit activates **after**
the page has already loaded, so it does not control that first page load
(the classic "empty Cache Storage until you refresh" symptom). The
library now recovers this automatically: on registration, if the worker
is active but not yet controlling the page, `bemap.BrowserCache` posts a
`CLAIM` message straight to the active worker (`clients.claim()`), so
caching starts working **without a manual refresh**. The `INIT` / `CLAIM`
handshake is non-blocking — it can never delay your map's first paint; if
the worker is slow to acknowledge, the library logs a one-line console
warning and carries on.
