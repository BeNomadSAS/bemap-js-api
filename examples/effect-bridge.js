/* ============================================================
 * effect-bridge.js — iframe-side shim
 *
 * Included by every example page. Discovers the page's bemap map
 * (heuristically — the global `map` or `maps.ml`) and:
 *   - subscribes to `onEffectChange` and posts every change to the
 *     parent dashboard via `postMessage({type:'bemap:effect', ...})`
 *   - listens for `bemap:clear-all` and `bemap:clear-effect` from
 *     the parent and calls `map.clearAllEffects()` /
 *     `map._unregisterEffect(name) + teardown()`
 *
 * Safe to include even when no map exists yet — `attempt` polls
 * for ~3 seconds.
 * ============================================================ */

(function () {
  if (typeof window === 'undefined') return;
  // Runs in BOTH standalone and iframe modes. In standalone mode the
  // postMessage delivers to the same window's listener (the in-page
  // active-effects-bar); in iframe mode it also delivers up to the
  // parent dashboard (which has its own bar above the iframe).

  function broadcast(msg) {
    try { window.parent.postMessage(msg, '*'); } catch (e) {}
    if (window.parent !== window) {
      try { window.postMessage(msg, '*'); } catch (e) {}
    }
  }

  // Returns the **primary** map used for effect-change subscription
  // (effects are a MapLibre-only concern in this codebase, so we prefer
  // the MapLibre instance when several maps are present).
  function findMap() {
    if (typeof window.map === 'object' && window.map && typeof window.map.getActiveEffects === 'function') {
      return window.map;
    }
    if (typeof window.maps === 'object' && window.maps && window.maps.ml && typeof window.maps.ml.getActiveEffects === 'function') {
      return window.maps.ml;
    }
    if (typeof window.maplibreMap === 'object' && window.maplibreMap && typeof window.maplibreMap.getActiveEffects === 'function') {
      return window.maplibreMap;
    }
    return null;
  }

  // Returns EVERY map on the page — commands like `fly-paris`,
  // `clear-all`, `toggle-globe` should apply to all of them so the
  // Function Showcase's side-by-side OL/Leaflet/MapLibre maps stay in
  // sync. The primary map (findMap above) is still where we subscribe
  // to effect:change.
  function findAllMaps() {
    var out = [];
    if (typeof window.maps === 'object' && window.maps) {
      var keys = ['ol', 'lf', 'ml', 'leaflet', 'maplibre', 'openlayers'];
      for (var i = 0; i < keys.length; i++) {
        var m = window.maps[keys[i]];
        if (m && typeof m.move === 'function') out.push(m);
      }
    }
    if (typeof window.map === 'object' && window.map && typeof window.map.move === 'function' && out.indexOf(window.map) === -1) {
      out.push(window.map);
    }
    if (typeof window.maplibreMap === 'object' && window.maplibreMap && typeof window.maplibreMap.move === 'function' && out.indexOf(window.maplibreMap) === -1) {
      out.push(window.maplibreMap);
    }
    return out;
  }

  function attach(map) {
    if (map._effectBridgeAttached) return;
    map._effectBridgeAttached = true;
    // Send a reset signal — the bar should clear chips because we
    // just started fresh.
    broadcast({ type: 'bemap:effect:reset' });
    // Subscribe to live changes.
    if (typeof map.onEffectChange === 'function') {
      map.onEffectChange(function (evt) {
        broadcast({ type: 'bemap:effect', name: evt.name, active: evt.active });
      });
    }
    // Replay current state in case effects were registered before the
    // bridge attached (e.g. spinGlobe queued in onLoad).
    if (typeof map.getActiveEffects === 'function') {
      var cur = map.getActiveEffects();
      for (var i = 0; i < cur.length; i++) {
        broadcast({ type: 'bemap:effect', name: cur[i], active: true });
      }
    }
    function applyToAll(fn, label) {
      var maps = findAllMaps();
      for (var i = 0; i < maps.length; i++) {
        try { fn(maps[i]); } catch (e) { if (label) console.warn(label + ' failed on one map', e); }
      }
    }

    // Listen for parent / standalone commands. Every command applies
    // to EVERY map on the page (functions.html shows OL+Leaflet+ML
    // side-by-side, so Paris/Clear/Globe must hit all three).
    window.addEventListener('message', function (event) {
      var data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'bemap:clear-all') {
        // "Refresh all" — full state wipe so the user can re-test from a
        // known-clean baseline. Sweeps: registered effects, popups, every
        // default overlay layer (marker/polyline/polygon/circle/route),
        // EVERY non-background layer the demo added on top, all heatmaps,
        // projection / pitch / bearing reset, and a fly-back to Paris.
        // Also notifies the page's own JS (functions.js etc.) via the
        // custom 'bemap:reset:state' event so per-page caches drop their
        // dangling references.
        applyToAll(function (m) {
          if (typeof m.clearAllEffects === 'function') m.clearAllEffects();
          if (typeof m.clearPopup === 'function') m.clearPopup();

          // 1. Clear contents of every default overlay layer.
          var defaultLayers = ['marker', 'polyline', 'polygon', 'circle', 'route'];
          for (var li = 0; li < defaultLayers.length; li++) {
            var layer = typeof m.getLayerByName === 'function' ? m.getLayerByName(defaultLayers[li]) : null;
            if (layer && typeof m.clearLayer === 'function') m.clearLayer(layer);
          }

          // 2. Remove every CUSTOM layer (anything not in the default
          //    overlay set + not the background) — clears testLayer_xxx
          //    and similar throwaways the function showcase adds.
          if (m.layers && m.layers.length && typeof m.removeLayer === 'function') {
            var keep = { marker:1, polyline:1, polygon:1, circle:1, route:1, background:1 };
            var custom = [];
            for (var i = 0; i < m.layers.length; i++) {
              var L = m.layers[i];
              var name = L && L.name;
              if (name && !keep[name]) custom.push(L);
            }
            for (var ci = 0; ci < custom.length; ci++) {
              try { m.removeLayer(custom[ci]); } catch (e) {}
            }
          }

          // 3. Reset projection / pitch / bearing / view.
          if (typeof m.setProjection === 'function') m.setProjection('mercator');
          if (typeof m.setPitch === 'function')      m.setPitch(0);
          if (typeof m.setBearing === 'function')    m.setBearing(0);
          if (typeof m.move === 'function')          m.move(2.35, 48.85, 6);
        }, 'clear-all');

        // 4. Notify any page-local state caches (functions.js stores
        //    state.markers/polylines/polygons/...; without this they'd
        //    keep stale references). Dispatched on `window` so both
        //    standalone and iframe-embedded pages can listen.
        try {
          window.dispatchEvent(new CustomEvent('bemap:reset:state'));
        } catch (e) {
          // IE fallback (legacy retro support); harmless on modern browsers.
          var ev = document.createEvent('Event');
          ev.initEvent('bemap:reset:state', true, true);
          window.dispatchEvent(ev);
        }
      } else if (data.type === 'bemap:clear-effect' && data.name) {
        // The named effect lives on the primary map (only MapLibre
        // registers effects today).
        if (map._effects && map._effects[data.name]) {
          try { map._effects[data.name].call(map); } catch (e) { console.warn('clear-effect failed', e); }
        }
      } else if (data.type === 'bemap:fly-paris') {
        applyToAll(function (m) { m.move(2.35, 48.85, 11); }, 'fly-paris');
      } else if (data.type === 'bemap:clear-cache') {
        // Full local-state wipe: Service Worker tile cache (all maps),
        // stored JWT (session + local), browser-cache toggle. Token is
        // dropped from BOTH storages because we don't know which one
        // the customer picked (sessionStorage default, localStorage
        // opt-in via ctx.tokenStorage='local').
        applyToAll(function (m) {
          if (typeof m.clearBrowserCache === 'function') {
            try { m.clearBrowserCache(); } catch (e) {}
          }
        }, 'clear-cache:tiles');
        try {
          var tokenKey = (typeof bemap !== 'undefined' && bemap.TilesAuth && bemap.TilesAuth.STORAGE_KEY) || 'bemap_tiles_token';
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(tokenKey);
          if (typeof localStorage !== 'undefined') localStorage.removeItem(tokenKey);
        } catch (e) {}
        try {
          var bcKey = (typeof bemap !== 'undefined' && bemap.BrowserCache && bemap.BrowserCache.TOGGLE_KEY) || 'bemap_browser_cache';
          if (typeof localStorage !== 'undefined') localStorage.removeItem(bcKey);
        } catch (e) {}
        console.info('bemap: cleared SW tile cache + stored token + browser-cache toggle. Reload to verify.');
      } else if (data.type === 'bemap:toggle-globe') {
        // Globe is MapLibre-only — warn-and-no-op on the others is
        // handled inside their setProjection stubs. We pick the
        // toggle target from the primary map's effects registry, then
        // apply the same direction to every map (Leaflet/OL will warn,
        // MapLibre will actually change projection).
        var active = (typeof map.getActiveEffects === 'function') ? map.getActiveEffects() : [];
        var goGlobe = active.indexOf('globe') === -1;
        applyToAll(function (m) {
          try {
            if (goGlobe) {
              m.setProjection('globe');
              if (typeof m.setPitch === 'function') m.setPitch(45);
            } else {
              m.setProjection('mercator');
              if (typeof m.setPitch === 'function') m.setPitch(0);
            }
          } catch (e) {}
        }, 'toggle-globe');
      }
    });
  }

  // Poll for ~3 s for the map global to appear; example pages
  // typically build the map inside DOMContentLoaded / onLoad.
  var tries = 0;
  function poll() {
    var map = findMap();
    if (map) { attach(map); return; }
    if (tries++ < 60) setTimeout(poll, 50);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', poll);
  } else {
    poll();
  }
})();
