/**
 * BeNomad BeMap JavaScript API — Service Worker for tile caching (v2.0)
 *
 * Cache-first strategy for PMTiles range requests. Replaces the v1
 * prototype that hardcoded the staging hostname `tiles-api.chatalone.fr`.
 *
 * New in v2.0:
 *   - **Parameterised host pattern**. The page posts
 *     `{ type: 'INIT', tilesHost: '...' }` after registration. The SW
 *     intercepts requests whose host matches any of the registered values
 *     (up to 4 distinct hosts; the fifth triggers `CACHE_HOST_CONFLICT`).
 *   - **Live stats broadcasting** — every ~250 ms while activity is
 *     ongoing, the SW posts `{ type: 'CACHE_STATS_LIVE', stats: {...} }`
 *     so the page can update a HIT/MISS badge in real time.
 *   - **Enable / disable toggle** — `ENABLE` / `DISABLE` messages flip a
 *     boolean. When disabled the SW falls through to the network without
 *     caching.
 *   - **Token stripping** — `?token=` / `?jwt=` query params are removed
 *     from the cache key so different tokens hit the same entry.
 *
 * Ships as `dist/bemap-sw-tiles.js` (separate from the main bundle).
 * Customer apps copy it to their site root and `bemap.MapLibreMap` auto-
 * registers it when `options.browserCache !== false`.
 *
 * @since 2.0.0
 */
'use strict';

var CACHE_NAME = 'bemap-tiles-v3';
var MAX_CACHE_SIZE = 2000;
var EVICT_BATCH = 200;
var MAX_HOSTS = 4;
var STATS_DEBOUNCE_MS = 250;

var state = {
  hosts: [],          // registered tilesHost values
  enabled: true,
  hits: 0,
  misses: 0,
  lastBroadcast: 0,
  pendingBroadcast: null
};

// Verbose per-request diagnostics — OFF by default. Flip on for debugging via
// `{ type: 'INIT', debug: true }` (or set true here). Silent in normal use.
var DEBUG = false;
function dbg() {
  if (!DEBUG) return;
  try { console.log.apply(console, ['[bemap-sw]'].concat([].slice.call(arguments))); } catch (e) {}
}

self.addEventListener('install', function () { dbg('install → skipWaiting()'); self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  dbg('activate → clearing old caches + clients.claim()');
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(
          names.filter(function (n) { return n.indexOf('bemap-tiles-') === 0 && n !== CACHE_NAME; })
               .map(function (n) { return caches.delete(n); })
        );
      })
      .then(function () { return self.clients.claim(); })
      .then(function () { dbg('activated — now controlling clients'); })
  );
});

function urlMatchesHost(url) {
  if (!state.hosts.length) return false;
  try {
    var parsed = new URL(url);
    for (var i = 0; i < state.hosts.length; i++) {
      if (parsed.host === state.hosts[i]) return true;
    }
  } catch (e) { /* malformed URL */ }
  return false;
}

// Returns '' when the request SHOULD be cached, otherwise a short reason why
// it is skipped (logged so you can see exactly where caching is opting out).
function interceptReason(request) {
  if (!state.enabled) return 'disabled';
  if (!state.hosts.length) return 'no-hosts-yet (INIT not received — is the page controlled?)';
  if (!urlMatchesHost(request.url)) return 'other-host (not a registered tilesHost)';
  // Never cache the Worker control endpoints (login / status / maps / styles /
  // default / logout) — they are not tiles and some are auth-bearing POSTs.
  if (/\/api\//.test(request.url)) return 'api-endpoint';
  // PMTiles archives are read as Range GETs against the tiles host. The map
  // name may be BARE ('osm', 'default') or a '.pmtiles' file — so match on the
  // Range header, NOT the '.pmtiles' extension. (The old `/\.pmtiles/` check
  // silently skipped bare names.) Also honour the optional /{z}/{x}/{y}.pbf endpoint.
  var isArchiveRange = request.headers.has('Range');
  var isTile = /\/\d+\/\d+\/\d+\.pbf($|\?)/.test(request.url);
  if (!isArchiveRange && !isTile) return 'not-a-tile (no Range header, not /{z}/{x}/{y}.pbf)';
  if (request.cache === 'reload') return 'reload';
  return '';
}

function cacheKeyFor(request) {
  var url = new URL(request.url);
  // Strip auth-bearing params so the same tile cached once serves every token
  url.searchParams.delete('token');
  url.searchParams.delete('jwt');
  url.searchParams.delete('X-Session-Token');
  var range = request.headers.get('Range') || '';
  if (range) url.searchParams.set('_range', range);
  return new Request(url.toString(), { method: 'GET' });
}

function evictIfNeeded(cache) {
  return cache.keys().then(function (keys) {
    if (keys.length <= MAX_CACHE_SIZE) return;
    var toDelete = keys.length - MAX_CACHE_SIZE + EVICT_BATCH;
    var chain = Promise.resolve();
    for (var i = 0; i < toDelete; i++) {
      (function (k) {
        chain = chain.then(function () { return cache.delete(k); });
      })(keys[i]);
    }
    return chain;
  });
}

function broadcastStats() {
  var now = Date.now();
  if (now - state.lastBroadcast < STATS_DEBOUNCE_MS) {
    if (!state.pendingBroadcast) {
      state.pendingBroadcast = setTimeout(function () {
        state.pendingBroadcast = null;
        broadcastStats();
      }, STATS_DEBOUNCE_MS - (now - state.lastBroadcast));
    }
    return;
  }
  state.lastBroadcast = now;
  self.clients.matchAll().then(function (clients) {
    var payload = {
      type: 'CACHE_STATS_LIVE',
      stats: { hits: state.hits, misses: state.misses, entries: -1, bytesEstimated: -1, enabled: state.enabled }
    };
    clients.forEach(function (client) { try { client.postMessage(payload); } catch (e) {} });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var reason = interceptReason(request);
  // Log only tile-relevant requests so the console isn't drowned by page assets.
  var looksTile = request.headers.has('Range') || /\.pbf($|\?)/.test(request.url) ||
                  (state.hosts.length && urlMatchesHost(request.url));
  if (reason) {
    if (looksTile) dbg('SKIP [' + reason + ']', request.url.slice(0, 140));
    return;
  }
  dbg('INTERCEPT', request.headers.get('Range') || '(full)', request.url.slice(0, 140));
  event.respondWith((function () {
    return caches.open(CACHE_NAME).then(function (cache) {
      var key = cacheKeyFor(request);
      return cache.match(key).then(function (cached) {
        if (cached) {
          state.hits++;
          dbg('HIT  hits=' + state.hits, request.url.slice(0, 100));
          broadcastStats();
          return cached.arrayBuffer().then(function (body) {
            var headers = new Headers(cached.headers);
            headers.set('Content-Length', String(body.byteLength));
            headers.set('X-SW-Cache', 'HIT');
            var status = request.headers.has('Range') ? 206 : 200;
            return new Response(body, { status: status, headers: headers });
          });
        }
        state.misses++;
        dbg('MISS → network  misses=' + state.misses, request.url.slice(0, 100));
        broadcastStats();
        return fetch(request).then(function (response) {
          if (response.status === 200 || response.status === 206) {
            var clone = response.clone();
            clone.arrayBuffer().then(function (body) {
              var cacheHeaders = new Headers(response.headers);
              cacheHeaders.set('X-SW-Cache', 'STORED');
              cacheHeaders.set('Content-Length', String(body.byteLength));
              var toStore = new Response(body.slice(0), { status: 200, headers: cacheHeaders });
              return cache.put(key, toStore).then(function () {
                dbg('STORED ' + body.byteLength + 'B', request.url.slice(0, 100));
                return evictIfNeeded(cache);
              });
            }).catch(function (e) { dbg('store failed', e && e.message); });
          } else {
            dbg('network status ' + response.status + ' — not cached', request.url.slice(0, 100));
          }
          return response;
        });
      });
    });
  })());
});

function postToClient(source, message) {
  if (source && typeof source.postMessage === 'function') {
    try { source.postMessage(message); } catch (e) { /* ignore */ }
  }
}

self.addEventListener('message', function (event) {
  var data = event.data || {};
  var type = data.type;
  if (!type) return;

  if (type === 'INIT') {
    var host = data.tilesHost;
    if (host && state.hosts.indexOf(host) === -1) {
      if (state.hosts.length >= MAX_HOSTS) {
        postToClient(event.source, { type: 'CACHE_HOST_CONFLICT', host: host });
        return;
      }
      state.hosts.push(host);
    }
    if (data.enabled === false) state.enabled = false;
    else if (data.enabled === true) state.enabled = true;
    if (typeof data.debug === 'boolean') DEBUG = data.debug;
    dbg('INIT received: tilesHost=' + host + ' → hosts now [' + state.hosts.join(', ') + '] enabled=' + state.enabled);
    postToClient(event.source, { type: 'READY', hosts: state.hosts.slice(), enabled: state.enabled });
    return;
  }

  if (type === 'ENABLE') { state.enabled = true; postToClient(event.source, { type: 'STATE', enabled: true }); return; }
  if (type === 'DISABLE') { state.enabled = false; postToClient(event.source, { type: 'STATE', enabled: false }); return; }

  if (type === 'CACHE_STATS') {
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.keys().then(function (keys) {
        var bytes = 0;
        var work = Promise.resolve();
        keys.forEach(function (k) {
          work = work.then(function () {
            return cache.match(k).then(function (resp) {
              if (resp) {
                var cl = resp.headers.get('Content-Length');
                if (cl) bytes += parseInt(cl, 10);
              }
            });
          });
        });
        return work.then(function () {
          var msg = {
            type: 'CACHE_STATS_RESULT',
            stats: {
              hits: state.hits, misses: state.misses, entries: keys.length,
              bytesEstimated: bytes, enabled: state.enabled
            }
          };
          var port = event.ports && event.ports[0];
          if (port) { try { port.postMessage(msg); } catch (e) {} return; }
          postToClient(event.source, msg);
        });
      });
    });
    return;
  }

  if (type === 'CACHE_CLEAR') {
    caches.delete(CACHE_NAME).then(function () {
      state.hits = 0;
      state.misses = 0;
      postToClient(event.source, { type: 'CACHE_CLEARED' });
    });
    return;
  }
});
