/**
 * BeMap JS API — Function Showcase
 * All 78 public methods tested on 3 backends simultaneously.
 */

// =========================================================================
// Map Instances
// =========================================================================

var ctx = bemapMainCtx;
var maps = {};
var state = { markers: {}, polylines: {}, polygons: {}, circles: {}, popups: {}, layers: {}, heatmaps: {} };

// MapLibre background — BeNomad Tiles (via ctx.tilesHost). The style
// switcher in the showcase rebuilds the map; the library re-applies the
// bundled BeNomad gray-level style automatically.
function switchMapLibreStyle(value) {
  try {
    if (maps.ml && maps.ml.native) maps.ml.native.remove();
    var container = document.getElementById('map-ml');
    container.innerHTML = '';
    maps.ml = new bemap.MapLibreMap(ctx, 'map-ml').move(2.35, 48.85, 6);
    var defaultNames = ['marker', 'polyline', 'polygon', 'circle', 'route'];
    for (var i = 0; i < defaultNames.length; i++) {
      maps.ml.addLayer(new bemap.VectorLayer({ name: defaultNames[i] }));
    }
    log('MapLibre', 'ok', 'Rebuilt with BeNomad Tiles');
  } catch(e) {
    log('MapLibre', 'err', 'Rebuild failed: ' + e.message);
  }
}

function initMaps() {
  try {
    maps.ol = new bemap.Ol3Map(ctx, 'map-ol').defaultLayers().move(2.35, 48.85, 6);
  } catch(e) { console.error('OlMap init failed:', e); }

  try {
    maps.lf = new bemap.LeafletMap(ctx, 'map-lf').defaultLayers().move(2.35, 48.85, 6);
  } catch(e) { console.error('Leaflet init failed:', e); }

  try {
    // ctx.tilesHost on bemapMainCtx → bundled BeNomad gray-level style.
    // DON'T chain .move() on construction — MapLibre measures the canvas at
    // construction time, and inside the SPA iframe the container may not
    // have its final flex-grow width yet. We resize() + move() AFTER layout
    // settles so the visible extent matches OL/Leaflet.
    maps.ml = new bemap.MapLibreMap(ctx, 'map-ml');

    // MapLibre defaultLayers is a no-op — create overlay layers manually.
    var defaultNames = ['marker', 'polyline', 'polygon', 'circle', 'route'];
    for (var i = 0; i < defaultNames.length; i++) {
      maps.ml.addLayer(new bemap.VectorLayer({ name: defaultNames[i] }));
    }
  } catch(e) { console.error('MapLibre init failed:', e); }

  // First-paint race fix: when functions.html boots inside the SPA iframe, the
  // map containers may briefly have non-final dimensions (iframe just inserted,
  // flex layout still settling). MapLibre measures the canvas on init and
  // latches that broken size — the user sees a half-rendered map with huge
  // labels until they manually pan. Force resize THEN move() to put each
  // engine at the same geographic extent.
  function fitAll() {
    // 1) Resize each canvas to its current container.
    try { if (maps.ml && maps.ml.native && maps.ml.native.resize)         maps.ml.native.resize(); } catch (e) {}
    try { if (maps.lf && maps.lf.native && maps.lf.native.invalidateSize) maps.lf.native.invalidateSize(); } catch (e) {}
    try { if (maps.ol && maps.ol.native && maps.ol.native.updateSize)     maps.ol.native.updateSize(); } catch (e) {}
    // 2) Center+zoom all three identically AFTER the canvas resize.
    try { if (maps.ml) maps.ml.move(2.35, 48.85, 6); } catch (e) {}
    try { if (maps.lf) maps.lf.move(2.35, 48.85, 6); } catch (e) {}
    try { if (maps.ol) maps.ol.move(2.35, 48.85, 6); } catch (e) {}
  }
  // Multi-stage: double-rAF for fast paths, plus 100ms + 500ms safety nets.
  requestAnimationFrame(function () { requestAnimationFrame(fitAll); });
  setTimeout(fitAll, 100);
  setTimeout(fitAll, 500);

  // Long-term safety: re-fit on container size changes (sidebar toggle,
  // window resize, log/code panel toggle in the parent).
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(function () {
      // Resize only — don't reset the user's pan/zoom on every layout shift.
      try { if (maps.ml && maps.ml.native && maps.ml.native.resize)         maps.ml.native.resize(); } catch (e) {}
      try { if (maps.lf && maps.lf.native && maps.lf.native.invalidateSize) maps.lf.native.invalidateSize(); } catch (e) {}
      try { if (maps.ol && maps.ol.native && maps.ol.native.updateSize)     maps.ol.native.updateSize(); } catch (e) {}
    });
    var ids = ['map-ol', 'map-lf', 'map-ml'];
    for (var j = 0; j < ids.length; j++) {
      var n = document.getElementById(ids[j]);
      if (n) ro.observe(n);
    }
  }
}

// =========================================================================
// Logging
// =========================================================================

// SPA-embed bridge: when this page lives inside the BeMap 2026 dashboard iframe,
// `setCode`/`log`/`setControls` mirror to the parent window so the dashboard's
// single code-panel + console + sidebar carry every event. The page's own
// `.code-panel` / `.log-panel` / `.func-list` are hidden by `hideEmbedChrome()`.
var _BN_EMBED = (function () { try { return window.parent !== window; } catch (e) { return false; } })();
function _bnPost(payload) { if (!_BN_EMBED) return; try { window.parent.postMessage(payload, '*'); } catch (e) {} }

function log(provider, status, msg) {
  // Forward to the outer dashboard console so users see everything in one place.
  _bnPost({ type: 'bemap:fn:log', provider: provider, status: status, msg: msg });
  var panel = document.getElementById('logPanel');
  if (!panel) return;   // embedded mode hides the panel
  var cls = status === 'ok' ? 'log-ok' : status === 'err' ? 'log-err' : status === 'warn' ? 'log-warn' : 'log-info';
  var icon = status === 'ok' ? '✅' : status === 'err' ? '❌' : status === 'warn' ? '⚠️' : 'ℹ️';
  var entry = document.createElement('div');
  entry.className = 'log-entry ' + cls;
  entry.textContent = icon + ' ' + provider + ': ' + msg;
  panel.insertBefore(entry, panel.firstChild);
}

function clearLog() {
  document.getElementById('logPanel').innerHTML = '';
}

function runOnAll(label, fn) {
  var backends = [
    { key: 'ol', name: 'OlMap', map: maps.ol },
    { key: 'lf', name: 'Leaflet', map: maps.lf },
    { key: 'ml', name: 'MapLibre', map: maps.ml }
  ];
  for (var i = 0; i < backends.length; i++) {
    var b = backends[i];
    var t0 = performance.now();
    try {
      fn(b.map, b.key);
      var t1 = performance.now();
      log(b.name, 'ok', label + ' (' + Math.round(t1 - t0) + 'ms)');
    } catch(e) {
      log(b.name, 'err', label + ' — ' + e.message);
    }
  }
}

function runMapLibreOnly(label, fn) {
  log('OlMap', 'warn', label + ' — MapLibre only');
  log('Leaflet', 'warn', label + ' — MapLibre only');
  try {
    var t0 = performance.now();
    fn(maps.ml, 'ml');
    log('MapLibre', 'ok', label + ' (' + Math.round(performance.now() - t0) + 'ms)');
  } catch(e) {
    log('MapLibre', 'err', label + ' — ' + e.message);
  }
}

function setCode(code) {
  // Mirror into the outer dashboard's code panel (single source of truth).
  _bnPost({ type: 'bemap:fn:code', code: code, label: 'functions.js' });
  var el = document.getElementById('codePanel');
  if (el) el.textContent = code;
}

// Registry of the active function's buttons. The outer dashboard renders them
// in its own controls slot when embedded; the standalone page renders them
// inside `#controls`.
var _currentControls = null;
function setControls(title, buttons) {
  // Forward the abstract button list (label + index) to the parent so the
  // outer shell can render its own buttons; the real `fn` callbacks stay
  // here in the iframe and run when the parent posts back `bemap:fn:btn`.
  var abstract = [];
  for (var i = 0; i < buttons.length; i++) abstract.push({ label: buttons[i].label, idx: i });
  _currentControls = { title: title, buttons: buttons };
  _bnPost({ type: 'bemap:fn:controls', title: title, buttons: abstract });

  var c = document.getElementById('controls');
  if (!c) return;     // embedded mode hides the panel
  c.innerHTML = '<span class="func-title">' + title + '</span>';
  for (var j = 0; j < buttons.length; j++) {
    var btn = document.createElement('button');
    btn.className = buttons[j].cls || 'btn-action';
    btn.textContent = buttons[j].label;
    btn.onclick = buttons[j].fn;
    c.appendChild(btn);
  }
  var resetBtn = document.createElement('button');
  resetBtn.className = 'btn-reset';
  resetBtn.textContent = 'Clear Log';
  resetBtn.onclick = clearLog;
  c.appendChild(resetBtn);
}

/* ------------------------------------------------------------
 * SPA-embed wiring (only active when window.parent !== window).
 * Hides the function showcase's own chrome (left rail / code /
 * log / controls) and listens for parent commands:
 *   { type: 'bemap:fn:run', name }   → invoke FUNCS[name]
 *   { type: 'bemap:fn:btn', idx }    → click the Nth current button
 *   { type: 'bemap:fn:clear-log' }   → clear log
 * On boot, reads ?fn=… from window.location.search and runs it.
 * ------------------------------------------------------------ */
function hideEmbedChrome() {
  if (!_BN_EMBED) return;
  // Hide chrome that's duplicated by the outer dashboard. Keep the maps row
  // visible — that's the entire reason the page is embedded.
  var hideIds = ['funcList', 'codePanel', 'controls', 'logPanel'];
  for (var i = 0; i < hideIds.length; i++) {
    var n = document.getElementById(hideIds[i]);
    if (n) n.style.display = 'none';
  }
  // Also hide the page's own top-bar + code-toggle (no IDs — class only).
  var topBar = document.querySelector('.top-bar');
  if (topBar) topBar.style.display = 'none';
  var codeToggle = document.querySelector('.code-toggle');
  if (codeToggle) codeToggle.style.display = 'none';
  // The .main flex container needs to absorb the freed vertical space.
  var main = document.querySelector('.main');
  if (main) main.style.height = '100vh';
  var content = document.querySelector('.content');
  if (content) content.style.height = '100vh';
  // Let the maps row stretch to fill the viewport.
  var mapsRow = document.querySelector('.maps-row');
  if (mapsRow) mapsRow.style.height = '100vh';
  // Drop the body background so the dashboard's color shows through.
  document.body.style.background = '#0d1117';
}

function _bnHandleParentMessage(ev) {
  var d = ev.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'bemap:fn:run' && typeof d.name === 'string') {
    var fn = FUNCS[d.name];
    if (typeof fn === 'function') fn();
    else _bnPost({ type: 'bemap:fn:log', provider: 'shell', status: 'err', msg: 'Unknown function: ' + d.name });
  } else if (d.type === 'bemap:fn:btn' && typeof d.idx === 'number') {
    if (_currentControls && _currentControls.buttons && _currentControls.buttons[d.idx]) {
      try { _currentControls.buttons[d.idx].fn(); } catch (e) {
        _bnPost({ type: 'bemap:fn:log', provider: 'shell', status: 'err', msg: e.message });
      }
    }
  } else if (d.type === 'bemap:fn:clear-log') {
    clearLog();
  }
}
if (_BN_EMBED && typeof window.addEventListener === 'function') {
  window.addEventListener('message', _bnHandleParentMessage);
}

function _bnAutoRunFromQuery() {
  if (typeof URLSearchParams !== 'function') return;
  var p = new URLSearchParams(window.location.search);
  var fnName = p.get('fn');
  if (!fnName) return;
  fnName = decodeURIComponent(fnName);
  var fn = FUNCS[fnName];
  if (typeof fn === 'function') fn();
  else _bnPost({ type: 'bemap:fn:log', provider: 'shell', status: 'warn', msg: 'fn=' + fnName + ' not found in registry' });
}

// =========================================================================
// Demo helpers — make layer-management functions VISUALLY DISTINGUISHABLE.
//
// Calling `map.addLayer(new bemap.VectorLayer({name}))` creates a logical
// layer but adds nothing visible. The helpers below populate any layer
// with three demo markers (Paris, Lyon, Marseille) and auto-fit the map
// to the bounding box of those points so the user can actually SEE the
// effect of each call. Reused by addLayer / removeLayer / visibleLayer /
// clearLayer / zIndexLayer / refreshLayer.
// =========================================================================

var DEMO_POINTS = [
  { lon: 2.35,  lat: 48.85, name: 'Paris'     },
  { lon: 4.83,  lat: 45.76, name: 'Lyon'      },
  { lon: 5.37,  lat: 43.29, name: 'Marseille' }
];
var DEMO_BBOX = new bemap.BoundingBox(1.5, 42.5, 6.5, 50);   // ~ France south

function _demoIcon() {
  return new bemap.Icon({
    src: 'images/map-marker-red.svg',
    anchorX: 0.5, anchorY: 1,
    anchorXUnits: 'fraction', anchorYUnits: 'fraction'
  });
}

// Wipe every cached reference in `state` when the active-effects bar's
// "Clear all" fires. effect-bridge.js dispatches `bemap:reset:state` on
// window AFTER it has already removed the layers / overlays / popups.
// Without this listener, subsequent function-clicks would re-use stale
// pointers (e.g. state.markers.ol → a marker that's been detached),
// leading to "remove" buttons that quietly no-op.

// Demo-created native MapLibre ids. Several demos bypass the bemap.Layer
// abstraction and call map.native.addSource / addLayer directly (the only
// way to use vector style features). effect-bridge's clear-all iterates
// map.layers and so never sees these; we clean them up explicitly here.
// Order matters: layers depend on sources, so remove layers first.
var DEMO_NATIVE_LAYERS = [
  'stars-layer', 'stars-labels',          // addImage demo
  'cities-dots', 'cities-labels',         // addGeoJsonSource / queryRenderedFeatures shared source
  'demo-circle',                          // legacy addGeoJsonSource id
  'anim-route-line',                      // animateAlongRoute — static route line
  'anim-dot',                             // animateAlongRoute — animated point
  'line-anim-layer'                       // animateLine
];
var DEMO_NATIVE_SOURCES = [
  'stars-src',
  'cities-src',
  'demo-src',
  'anim-route',                           // animateAlongRoute — route LineString source
  'anim-pt',
  'line-anim'
];
var DEMO_NATIVE_IMAGES = ['yellow-star']; // addImage demo

function _cleanupNativeMaplibre(map) {
  if (!map || !map.native) return;
  var n = map.native;
  // Layers first (depend on sources).
  for (var i = 0; i < DEMO_NATIVE_LAYERS.length; i++) {
    try { if (n.getLayer && n.getLayer(DEMO_NATIVE_LAYERS[i])) n.removeLayer(DEMO_NATIVE_LAYERS[i]); } catch (e) {}
  }
  for (var j = 0; j < DEMO_NATIVE_SOURCES.length; j++) {
    try { if (n.getSource && n.getSource(DEMO_NATIVE_SOURCES[j])) n.removeSource(DEMO_NATIVE_SOURCES[j]); } catch (e) {}
  }
  for (var k = 0; k < DEMO_NATIVE_IMAGES.length; k++) {
    try { if (n.hasImage && n.hasImage(DEMO_NATIVE_IMAGES[k])) n.removeImage(DEMO_NATIVE_IMAGES[k]); } catch (e) {}
  }
  // Click-to-identify listener from queryRenderedFeatures demo.
  if (map._qrfClickHandler) {
    try { n.off('click', map._qrfClickHandler); } catch (e) {}
    map._qrfClickHandler = null;
  }
}

// MapLibre-only animation controllers — each demo stores its handle on
// window. Without explicit cleanup, requestAnimationFrame loops keep
// running after Clear all (camera orbit keeps rotating, pulse keeps
// pulsing, etc.). Each controller exposes .stop() (always) and sometimes
// .remove() — call both and null out the handle.
var DEMO_ANIM_CTRL_KEYS = [
  '_animCtrl',      // animateAlongRoute
  '_lineCtrl',      // animateLine
  '_orbitCtrl',     // animateCameraOrbit
  '_pulseCtrl',     // animatePulse (Paris)
  '_pulseCtrl2',    // animatePulse (Nice)
  '_spinCtrl'       // spinGlobe
];
function _stopAllAnimations() {
  for (var i = 0; i < DEMO_ANIM_CTRL_KEYS.length; i++) {
    var key = DEMO_ANIM_CTRL_KEYS[i];
    var c   = window[key];
    if (!c) continue;
    try { if (typeof c.stop   === 'function') c.stop();   } catch (e) {}
    try { if (typeof c.remove === 'function') c.remove(); } catch (e) {}
    window[key] = null;
  }
}

function _resetDemoState() {
  state.markers   = {};
  state.polylines = {};
  state.polygons  = {};
  state.circles   = {};
  state.popups    = {};
  state.layers    = {};
  state.heatmaps  = {};
  if (state.layerMarkers) state.layerMarkers = {};
  // 1. Stop every MapLibre animation (RAF loops, pulse layers, orbit).
  _stopAllAnimations();
  // 2. Wipe native MapLibre sources/layers/images that effect-bridge's
  //    bemap.Layer iteration cannot see.
  _cleanupNativeMaplibre(maps && maps.ml);
}
window.addEventListener('bemap:reset:state', _resetDemoState);

// Add the three demo markers TO the given layer (uses options.layer).
// Stores them in state.layerMarkers[layerKey] so a later clear/remove can
// surgically tear them down without affecting other layers' markers.
function populateLayerWithDemoMarkers(map, layer, layerKey) {
  if (!state.layerMarkers) state.layerMarkers = {};
  state.layerMarkers[layerKey] = [];
  for (var i = 0; i < DEMO_POINTS.length; i++) {
    var p = DEMO_POINTS[i];
    var m = new bemap.Marker(new bemap.Coordinate(p.lon, p.lat), {
      icon: _demoIcon(),
      id:   layerKey + '-' + p.name
    });
    map.addMarker(m, { layer: layer });
    state.layerMarkers[layerKey].push(m);
  }
}

// Fit the demo area on every map so the user can see the markers.
function fitDemoArea(map) {
  try { map.moveToBoundingBox(DEMO_BBOX); } catch (e) {
    // Fallback: centre France at zoom 6 when moveToBoundingBox isn't
    // supported (older engines / specific layer configurations).
    try { map.move(4, 46, 6); } catch (ee) {}
  }
}

// =========================================================================
// Function Registry — ALL 78 methods
// =========================================================================

var FUNCS = {};

// --- Layer Management ---

FUNCS['addLayer'] = function() {
  setCode(
    'var layer = new bemap.VectorLayer({ name: "myLayer" });\n' +
    'map.addLayer(layer);\n\n' +
    '// Layers are just containers — add markers to make them visible.\n' +
    'for (var i = 0; i < points.length; i++) {\n' +
    '  map.addMarker(new bemap.Marker(new bemap.Coordinate(points[i].lon, points[i].lat), {\n' +
    '    icon: redPin\n' +
    '  }), { layer: layer });\n' +
    '}\n' +
    'map.moveToBoundingBox(layer.getBoundingBox()); // fit to the markers');
  setControls('addLayer', [
    { label: 'Add Layer + 3 markers', fn: function() {
      runOnAll('addLayer + populate', function(map, k) {
        state.layers[k] = new bemap.VectorLayer({ name: 'testLayer_' + k });
        map.addLayer(state.layers[k]);
        populateLayerWithDemoMarkers(map, state.layers[k], k);
        fitDemoArea(map);
      });
    }},
    { label: 'Verify (getLayerByName)', fn: function() {
      runOnAll('getLayerByName', function(map, k) {
        var found = map.getLayerByName('testLayer_' + k);
        if (!found) throw new Error('Layer not found!');
        log(k.toUpperCase(), 'ok', 'Layer "testLayer_' + k + '" exists');
      });
    }}
  ]);
};

FUNCS['removeLayer'] = function() {
  setCode(
    '// Adds a layer with 3 markers, then removes the layer — markers disappear.\n' +
    'map.removeLayer(layer);');
  setControls('removeLayer', [
    { label: 'Add Layer + markers', fn: function() {
      runOnAll('add layer (for removal demo)', function(map, k) {
        if (state.layers[k]) { try { map.removeLayer(state.layers[k]); } catch (e) {} }
        state.layers[k] = new bemap.VectorLayer({ name: 'testLayer_' + k });
        map.addLayer(state.layers[k]);
        populateLayerWithDemoMarkers(map, state.layers[k], k);
        fitDemoArea(map);
      });
    }},
    { label: 'Remove Layer (markers vanish)', fn: function() {
      runOnAll('removeLayer', function(map, k) {
        if (state.layers[k]) {
          map.removeLayer(state.layers[k]);
          state.layers[k] = null;
          if (state.layerMarkers) state.layerMarkers[k] = null;
        }
      });
    }}
  ]);
};

FUNCS['getLayerByName'] = function() {
  setCode(
    'var layer = map.getLayerByName("marker");\n' +
    'console.log(layer);  // → VectorLayer or null');
  setControls('getLayerByName', [
    { label: 'Find "marker" (built-in)', fn: function() {
      runOnAll('getLayerByName("marker")', function(map) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) log('  → ', 'ok',   'Found: ' + l.name);
        else   log('  → ', 'warn', 'Not found (null)');
      });
    }},
    { label: 'Find unknown name', fn: function() {
      runOnAll('getLayerByName("xyz")', function(map) {
        var l = map.getLayerByName('xyz-does-not-exist');
        if (l === null) log('  → ', 'ok',   'Returned null (correct)');
        else            log('  → ', 'warn', 'Unexpected: ' + l);
      });
    }}
  ]);
};

FUNCS['visibleLayer'] = function() {
  setCode(
    '// Add markers to the default MARKER layer, then toggle layer visibility.\n' +
    'map.visibleLayer(layer, false);  // hide\n' +
    'map.visibleLayer(layer, true);   // show');
  setControls('visibleLayer', [
    { label: 'Add 3 markers (default layer)', fn: function() {
      runOnAll('addMarkers (for visibility demo)', function(map, k) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) populateLayerWithDemoMarkers(map, l, 'visdemo-' + k);
        fitDemoArea(map);
      });
    }},
    { label: 'Hide Markers', fn: function() {
      runOnAll('visibleLayer(false)', function(map) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) map.visibleLayer(l, false);
      });
    }},
    { label: 'Show Markers', fn: function() {
      runOnAll('visibleLayer(true)', function(map) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) map.visibleLayer(l, true);
      });
    }}
  ]);
};

FUNCS['clearLayer'] = function() {
  setCode(
    '// Adds 3 markers to the MARKER layer, then clears that layer.\n' +
    'var layer = map.getLayerByName("marker");\n' +
    'map.clearLayer(layer);  // markers gone, layer remains');
  setControls('clearLayer', [
    { label: 'Add 3 markers (MARKER layer)', fn: function() {
      runOnAll('addMarkers (for clear demo)', function(map, k) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) populateLayerWithDemoMarkers(map, l, 'cleardemo-' + k);
        fitDemoArea(map);
      });
    }},
    { label: 'Clear MARKER layer', fn: function() {
      runOnAll('clearLayer', function(map) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) map.clearLayer(l);
      });
    }}
  ]);
};

FUNCS['zIndexLayer'] = function() {
  setCode(
    '// 4 markers on one layer + a fat polyline on another. zIndexLayer\n' +
    '// re-stacks the WHOLE layer — markers and paths together — on all 3\n' +
    '// engines. (Leaflet uses a per-layer custom pane; MapLibre uses CSS\n' +
    '// z-index relative to the canvas; OL uses native layer.setZIndex.)\n\n' +
    'var markLayer = new bemap.VectorLayer({ name: "markers" });\n' +
    'var lineLayer = new bemap.VectorLayer({ name: "polyline" });\n' +
    'map.addLayer(markLayer);\n' +
    'map.addLayer(lineLayer);\n\n' +
    '[Paris, Lyon, Marseille, Nice].forEach(function (p) {\n' +
    '  map.addMarker(new bemap.Marker(new bemap.Coordinate(p.lon, p.lat),\n' +
    '    { icon: redPin }), { layer: markLayer });\n' +
    '});\n' +
    'map.addPolyline(new bemap.Polyline(routeCoords, {\n' +
    '  style: new bemap.LineStyle({ width: 14, color: new bemap.Color(255,200,0,0.95) })\n' +
    '}), { layer: lineLayer });\n\n' +
    'map.zIndexLayer(markLayer, 99); // pins above the ribbon\n' +
    'map.zIndexLayer(lineLayer, 99); // ribbon above the pins');

  var cities = [
    { lon: 2.35,  lat: 48.85, name: 'Paris'     },
    { lon: 4.83,  lat: 45.76, name: 'Lyon'      },
    { lon: 5.37,  lat: 43.29, name: 'Marseille' },
    { lon: 7.26,  lat: 43.71, name: 'Nice'      }
  ];
  var routeCoords = cities.map(function (c) { return new bemap.Coordinate(c.lon, c.lat); });

  setControls('zIndexLayer — markers + polyline stack', [
    { label: 'Add 4 markers', fn: function() {
      runOnAll('addLayer + 4 markers', function(map, k) {
        if (state.layers['zidx-mark-' + k]) { try { map.removeLayer(state.layers['zidx-mark-' + k]); } catch (e) {} }
        var markLayer = new bemap.VectorLayer({ name: 'zidx-mark-' + k });
        map.addLayer(markLayer);
        for (var i = 0; i < cities.length; i++) {
          var c = cities[i];
          map.addMarker(new bemap.Marker(new bemap.Coordinate(c.lon, c.lat), {
            icon: _demoIcon(),
            id:   'zidx-' + c.name + '-' + k
          }), { layer: markLayer });
        }
        state.layers['zidx-mark-' + k] = markLayer;
        map.moveToBoundingBox(new bemap.BoundingBox(1.5, 42.5, 8, 50));
      });
    }},
    { label: 'Add fat polyline', fn: function() {
      runOnAll('addLayer + thick polyline', function(map, k) {
        if (state.layers['zidx-line-' + k]) { try { map.removeLayer(state.layers['zidx-line-' + k]); } catch (e) {} }
        var lineLayer = new bemap.VectorLayer({ name: 'zidx-line-' + k });
        map.addLayer(lineLayer);
        var pl = new bemap.Polyline(routeCoords, {
          style: new bemap.LineStyle({ width: 14, color: new bemap.Color(255, 200, 0, 0.95) }),
          id: 'zidx-line-' + k
        });
        map.addPolyline(pl, { layer: lineLayer });
        state.layers['zidx-line-' + k] = lineLayer;
        map.moveToBoundingBox(new bemap.BoundingBox(1.5, 42.5, 8, 50));
      });
    }},
    { label: 'Markers on top', fn: function() {
      runOnAll('zIndexLayer(markLayer, 99)', function(map, k) {
        var m = state.layers['zidx-mark-' + k];
        var l = state.layers['zidx-line-' + k];
        if (m) map.zIndexLayer(m, 99);
        if (l) map.zIndexLayer(l, 1);
      });
    }},
    { label: 'Polyline on top', fn: function() {
      runOnAll('zIndexLayer(lineLayer, 99)', function(map, k) {
        var m = state.layers['zidx-mark-' + k];
        var l = state.layers['zidx-line-' + k];
        if (m) map.zIndexLayer(m, 1);
        if (l) map.zIndexLayer(l, 99);
      });
      // MapLibre note: HTML markers (the default in maplibregl) are DOM
      // siblings of the canvas and always render above it. To stack markers
      // BELOW canvas features, MapLibre's standard recipe is a `symbol`
      // layer with addImage + GeoJSON — not an HTML marker. So on MapLibre
      // this demo shows markers staying above. OL + Leaflet swap correctly.
      log('MapLibre', 'info', 'HTML markers always render above the canvas — use a symbol layer if you need true z-stacking');
    }}
  ]);
};

FUNCS['refreshLayer'] = function() {
  setCode(
    '// Add markers, then call refreshLayer to force a re-render.\n' +
    'map.refreshLayer(layer);');
  setControls('refreshLayer', [
    { label: 'Add 3 markers', fn: function() {
      runOnAll('addMarkers (for refresh demo)', function(map, k) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) populateLayerWithDemoMarkers(map, l, 'refresh-' + k);
        fitDemoArea(map);
      });
    }},
    { label: 'Refresh MARKER layer', fn: function() {
      runOnAll('refreshLayer', function(map, k) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l && typeof map.refreshLayer === 'function') {
          map.refreshLayer(l);
          log(k.toUpperCase(), 'ok', 'MARKER layer refreshed');
        }
      });
    }}
  ]);
};

FUNCS['defaultLayers'] = function() {
  setCode(
    '// Creates the standard layer set: background + marker + polyline + polygon + circle + route.\n' +
    'map.defaultLayers();\n\n' +
    '// Demo: after creating defaults, drop 3 markers onto MARKER + fit the view.\n' +
    'var markerLayer = map.getLayerByName("marker");\n' +
    'points.forEach(function (p) {\n' +
    '  map.addMarker(new bemap.Marker(new bemap.Coordinate(p.lon, p.lat), { icon: redPin }), { layer: markerLayer });\n' +
    '});\n' +
    'map.moveToBoundingBox(new bemap.BoundingBox(1.5, 42.5, 6.5, 50));');
  setControls('defaultLayers', [
    { label: 'Create defaults + 3 markers', fn: function() {
      runOnAll('defaultLayers + populate', function(map, k) {
        map.defaultLayers();
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) populateLayerWithDemoMarkers(map, l, 'defaults-' + k);
        fitDemoArea(map);
      });
    }}
  ]);
};

// --- Camera ---

FUNCS['move'] = function() {
  setCode('map.move(2.35, 48.85, 12); // Paris');
  setControls('move', [
    { label: 'Paris', fn: function() { runOnAll('move(Paris)', function(map) { map.move(2.35, 48.85, 12); }); }},
    { label: 'Nice', fn: function() { runOnAll('move(Nice)', function(map) { map.move(7.26, 43.71, 12); }); }},
    { label: 'World', fn: function() { runOnAll('move(World)', function(map) { map.move(0, 30, 2); }); }}
  ]);
};

FUNCS['flyTo'] = function() {
  setCode('map.flyTo(7.26, 43.71, 14); // Nice');
  setControls('flyTo', [
    { label: 'Fly to Nice', fn: function() { runOnAll('flyTo(Nice)', function(map) { map.flyTo(7.26, 43.71, 12); }); }},
    { label: 'Fly to Paris', fn: function() { runOnAll('flyTo(Paris)', function(map) { map.flyTo(2.35, 48.85, 12); }); }}
  ]);
};

FUNCS['zoom'] = function() {
  setCode('map.zoom(10);');
  setControls('zoom', [
    { label: 'Zoom 5', fn: function() { runOnAll('zoom(5)', function(map) { map.zoom(5); }); }},
    { label: 'Zoom 10', fn: function() { runOnAll('zoom(10)', function(map) { map.zoom(10); }); }},
    { label: 'Zoom 15', fn: function() { runOnAll('zoom(15)', function(map) { map.zoom(15); }); }}
  ]);
};

FUNCS['getZoom'] = function() {
  setCode('var z = map.getZoom();\nconsole.log(z);');
  setControls('getZoom', [
    { label: 'Get Zoom', fn: function() {
      runOnAll('getZoom', function(map) { log('  → ', 'info', 'Zoom: ' + map.getZoom()); });
    }}
  ]);
};

FUNCS['getCenter'] = function() {
  setCode('var c = map.getCenter();\nconsole.log(c.getLon(), c.getLat());');
  setControls('getCenter', [
    { label: 'Get Center', fn: function() {
      runOnAll('getCenter', function(map) {
        var c = map.getCenter();
        log('  → ', 'info', 'Center: ' + c.getLon().toFixed(4) + ', ' + c.getLat().toFixed(4));
      });
    }}
  ]);
};

FUNCS['getBoundingBox'] = function() {
  setCode('var bb = map.getBoundingBox();');
  setControls('getBoundingBox', [
    { label: 'Get BBox', fn: function() {
      runOnAll('getBoundingBox', function(map) {
        var bb = map.getBoundingBox();
        log('  → ', 'info', bb.getMinLon().toFixed(2) + ',' + bb.getMinLat().toFixed(2) + ' → ' + bb.getMaxLon().toFixed(2) + ',' + bb.getMaxLat().toFixed(2));
      });
    }}
  ]);
};

FUNCS['rotation'] = function() {
  setCode('map.rotation(45);');
  setControls('rotation', [
    { label: '0°', fn: function() { runOnAll('rotation(0)', function(map) { map.rotation(0); }); }},
    { label: '45°', fn: function() { runOnAll('rotation(45)', function(map) { map.rotation(45); }); }},
    { label: '90°', fn: function() { runOnAll('rotation(90)', function(map) { map.rotation(90); }); }}
  ]);
};

FUNCS['moveToBoundingBox'] = function() {
  setCode('var bb = new bemap.BoundingBox(-5, 42, 10, 51); // France\nmap.moveToBoundingBox(bb);');
  setControls('moveToBoundingBox', [
    { label: 'France', fn: function() {
      runOnAll('moveToBoundingBox(France)', function(map) { map.moveToBoundingBox(new bemap.BoundingBox(-5, 42, 10, 51)); });
    }},
    { label: 'Europe', fn: function() {
      runOnAll('moveToBoundingBox(Europe)', function(map) { map.moveToBoundingBox(new bemap.BoundingBox(-15, 35, 40, 70)); });
    }}
  ]);
};

FUNCS['refresh'] = function() {
  setCode('map.refresh();');
  setControls('refresh', [
    { label: 'Refresh', fn: function() { runOnAll('refresh', function(map) { map.refresh(); }); }}
  ]);
};

// --- Markers ---

FUNCS['addMarker'] = function() {
  setCode('var marker = new bemap.Marker(\n  new bemap.Coordinate(2.35, 48.85), {\n    icon: new bemap.Icon({ src: "images/map-marker-red.svg", anchorX: 0.5, anchorY: 1, anchorXUnits: "fraction", anchorYUnits: "fraction" }),\n    id: "paris"\n  }\n);\nmap.addMarker(marker);');
  setControls('addMarker / removeMarker', [
    { label: 'Add Marker (Paris)', fn: function() {
      runOnAll('addMarker', function(map, k) {
        state.markers[k] = new bemap.Marker(new bemap.Coordinate(2.35, 48.85), {
          icon: new bemap.Icon({ src: 'images/map-marker-red.svg', anchorX: 0.5, anchorY: 1, anchorXUnits: 'fraction', anchorYUnits: 'fraction' }),
          id: 'paris-' + k
        });
        map.addMarker(state.markers[k]);
        map.move(2.35, 48.85, 10);
      });
    }},
    { label: 'Remove Marker', fn: function() {
      runOnAll('removeMarker', function(map, k) {
        if (state.markers[k]) { map.removeMarker(state.markers[k]); state.markers[k] = null; }
      });
    }},
    { label: 'Add 2nd Marker (Nice)', fn: function() {
      runOnAll('addMarker(Nice)', function(map, k) {
        var m = new bemap.Marker(new bemap.Coordinate(7.26, 43.71), {
          icon: new bemap.Icon({ src: 'images/map-marker-red.svg', anchorX: 0.5, anchorY: 1, anchorXUnits: 'fraction', anchorYUnits: 'fraction' }),
          id: 'nice-' + k
        });
        map.addMarker(m);
        // Fit to both Paris + Nice
        map.moveToBoundingBox(new bemap.BoundingBox(2, 43, 8, 49));
      });
    }}
  ]);
};

// --- Polylines ---

FUNCS['addPolyline'] = function() {
  setCode('var pl = new bemap.Polyline(\n  [new bemap.Coordinate(2.35,48.85), new bemap.Coordinate(7.26,43.71)],\n  { style: new bemap.LineStyle({ width: 4, color: new bemap.Color(255,0,0,1) }), id: "route" }\n);\nmap.addPolyline(pl);');
  setControls('addPolyline / removePolyline', [
    { label: 'Add Polyline (Paris→Lyon→Nice)', fn: function() {
      runOnAll('addPolyline', function(map, k) {
        state.polylines[k] = new bemap.Polyline(
          [new bemap.Coordinate(2.35, 48.85), new bemap.Coordinate(4.83, 45.76), new bemap.Coordinate(7.26, 43.71)],
          { style: new bemap.LineStyle({ width: 4, color: new bemap.Color(255, 0, 0, 1) }), id: 'route-' + k }
        );
        map.addPolyline(state.polylines[k]);
        fitDemoArea(map);
      });
    }},
    { label: 'Remove Polyline', fn: function() {
      runOnAll('removePolyline', function(map, k) {
        if (state.polylines[k]) { map.removePolyline(state.polylines[k]); state.polylines[k] = null; }
      });
    }}
  ]);
};

// --- Polygons ---

FUNCS['addPolygon'] = function() {
  setCode('var pg = new bemap.Polygon(\n  [new bemap.Coordinate(1.5,48.5), new bemap.Coordinate(3.5,48.5),\n   new bemap.Coordinate(3.5,49.2), new bemap.Coordinate(1.5,49.2)],\n  { style: new bemap.PolygonStyle({ fillColor: new bemap.Color(255,0,0,0.3), borderColor: new bemap.Color(255,0,0,1), borderWidth: 2 }) }\n);\nmap.addPolygon(pg);');
  setControls('addPolygon / removePolygon', [
    { label: 'Add Polygon (Île-de-France zone)', fn: function() {
      runOnAll('addPolygon', function(map, k) {
        state.polygons[k] = new bemap.Polygon(
          [new bemap.Coordinate(1.5, 48.5), new bemap.Coordinate(3.5, 48.5), new bemap.Coordinate(3.5, 49.2), new bemap.Coordinate(1.5, 49.2)],
          { style: new bemap.PolygonStyle({ fillColor: new bemap.Color(255, 0, 0, 0.3), borderColor: new bemap.Color(255, 0, 0, 1), borderWidth: 2 }), id: 'zone-' + k }
        );
        map.addPolygon(state.polygons[k]);
        map.moveToBoundingBox(new bemap.BoundingBox(1, 48, 4, 49.5));
      });
    }},
    { label: 'Remove Polygon', fn: function() {
      runOnAll('removePolygon', function(map, k) {
        if (state.polygons[k]) { map.removePolygon(state.polygons[k]); state.polygons[k] = null; }
      });
    }}
  ]);
};

// --- Circles ---

FUNCS['addCircle'] = function() {
  setCode('var c = new bemap.Circle(\n  new bemap.Coordinate(2.35, 48.85), 50000,\n  { style: new bemap.CircleStyle({ fillColor: new bemap.Color(0,100,255,0.2), borderColor: new bemap.Color(0,100,255,1), borderWidth: 2 }) }\n);\nmap.addCircle(c);');
  setControls('addCircle / removeCircle', [
    { label: 'Add Circle (50 km @ Paris)', fn: function() {
      runOnAll('addCircle', function(map, k) {
        state.circles[k] = new bemap.Circle(new bemap.Coordinate(2.35, 48.85), 50000, {
          style: new bemap.CircleStyle({ fillColor: new bemap.Color(0, 100, 255, 0.2), borderColor: new bemap.Color(0, 100, 255, 1), borderWidth: 2 }),
          id: 'circle-' + k
        });
        map.addCircle(state.circles[k]);
        map.move(2.35, 48.85, 8);
      });
    }},
    { label: 'Remove Circle', fn: function() {
      runOnAll('removeCircle', function(map, k) {
        if (state.circles[k]) { map.removeCircle(state.circles[k]); state.circles[k] = null; }
      });
    }}
  ]);
};

// --- Popups ---

FUNCS['addPopup'] = function() {
  setCode('var popup = new bemap.Popup({\n  coordinate: new bemap.Coordinate(2.35, 48.85),\n  information: "<h3>Paris</h3><p>Capital of France</p>"\n});\nmap.addPopup(popup);');
  setControls('addPopup / removePopup / clearPopup', [
    { label: 'Add Popup (Paris)', fn: function() {
      runOnAll('addPopup', function(map, k) {
        state.popups[k] = new bemap.Popup({ coordinate: new bemap.Coordinate(2.35, 48.85), information: '<h3>Paris</h3><p>Capital</p>' });
        map.addPopup(state.popups[k]);
        map.move(2.35, 48.85, 10);
      });
    }},
    { label: 'Remove Popup', fn: function() {
      runOnAll('removePopup', function(map, k) {
        if (state.popups[k]) { map.removePopup(state.popups[k]); state.popups[k] = null; }
      });
    }},
    { label: 'Clear All Popups', fn: function() {
      runOnAll('clearPopup', function(map) { map.clearPopup(); });
    }}
  ]);
};

// --- Events ---

FUNCS['on(CLICK)'] = function() {
  setCode('map.on(bemap.Map.EventType.CLICK, function(evt) {\n  console.log("Click:", evt.coordinate.getLon(), evt.coordinate.getLat());\n});');
  setControls('on(CLICK)', [
    { label: 'Register Click Event', fn: function() {
      runOnAll('on(CLICK)', function(map, k) {
        map.on(bemap.Map.EventType.CLICK, function(evt) {
          log(k.toUpperCase(), 'info', 'Click at ' + evt.coordinate.getLon().toFixed(4) + ', ' + evt.coordinate.getLat().toFixed(4));
        });
      });
      log('ALL', 'info', '→ Click on any map to see coordinates in the log');
    }}
  ]);
};

FUNCS['onMarker'] = function() {
  setCode('map.onMarker(marker, bemap.Map.EventType.CLICK, function(evt) {\n  console.log("Marker clicked:", evt.bemapObject.getId());\n});');
  setControls('onMarker — click a marker', [
    { label: 'Add Marker + Listener', fn: function() {
      runOnAll('addMarker + onMarker', function(map, k) {
        var m = new bemap.Marker(new bemap.Coordinate(2.35, 48.85), {
          icon: new bemap.Icon({ src: 'images/map-marker-red.svg', anchorX: 0.5, anchorY: 1, anchorXUnits: 'fraction', anchorYUnits: 'fraction' }),
          id: 'clickable-' + k
        });
        map.addMarker(m);
        map.onMarker(m, bemap.Map.EventType.CLICK, function(evt) {
          log(k.toUpperCase(), 'info', 'Marker clicked: ' + evt.bemapObject.getId());
        });
        map.move(2.35, 48.85, 10);
      });
      log('ALL', 'info', '→ Click the marker on each map');
    }}
  ]);
};

// --- Drag ---

FUNCS['draggableMarker'] = function() {
  setCode('marker.draggable(function(evt) {\n  console.log("Dragged to:", evt.coordinate.getLon(), evt.coordinate.getLat());\n});');
  setControls('draggableMarker — drag the marker', [
    { label: 'Add Draggable Marker', fn: function() {
      runOnAll('draggableMarker', function(map, k) {
        var m = new bemap.Marker(new bemap.Coordinate(2.35, 48.85), {
          icon: new bemap.Icon({ src: 'images/map-marker-red.svg', anchorX: 0.5, anchorY: 1, anchorXUnits: 'fraction', anchorYUnits: 'fraction' }),
          id: 'drag-' + k
        });
        map.addMarker(m);
        map.draggableMarker(m, function(evt) {
          log(k.toUpperCase(), 'info', 'Dragged to: ' + evt.coordinate.getLon().toFixed(4) + ', ' + evt.coordinate.getLat().toFixed(4));
        });
        map.move(2.35, 48.85, 10);
      });
      log('ALL', 'info', '→ Drag the marker on each map');
    }}
  ]);
};

FUNCS['draggablePolyline'] = function() {
  setCode('map.draggablePolyline(polyline, function(evt) {\n  console.log("Polyline dragged");\n});');
  setControls('draggablePolyline — drag the line', [
    { label: 'Add Draggable Polyline', fn: function() {
      runOnAll('draggablePolyline', function(map, k) {
        var pl = new bemap.Polyline(
          [new bemap.Coordinate(1, 47), new bemap.Coordinate(3, 49), new bemap.Coordinate(5, 47)],
          { style: new bemap.LineStyle({ width: 5, color: new bemap.Color(0, 200, 0, 1) }), id: 'dragpl-' + k }
        );
        map.addPolyline(pl);
        map.draggablePolyline(pl, function(evt) {
          log(k.toUpperCase(), 'info', 'Polyline dragged');
        });
        // Fit the triangle (1,47) → (3,49) → (5,47) with a small padding margin.
        map.moveToBoundingBox(new bemap.BoundingBox(0.5, 46.5, 5.5, 49.5));
      });
      log('ALL', 'info', '→ Drag the green polyline on each map');
    }}
  ]);
};

// --- 3D MapLibre Only ---

FUNCS['setPitch'] = function() {
  setCode('// MapLibre only\nmap.setPitch(60);');
  setControls('setPitch / getPitch — MapLibre only', [
    { label: 'Pitch 0', fn: function() { runOnAll('setPitch(0)', function(map) { map.setPitch(0); }); }},
    { label: 'Pitch 30', fn: function() { runOnAll('setPitch(30)', function(map) { map.setPitch(30); }); }},
    { label: 'Pitch 60', fn: function() { runOnAll('setPitch(60)', function(map) { map.setPitch(60); }); }},
    { label: 'Get Pitch', fn: function() { runOnAll('getPitch', function(map) { log('  → ', 'info', 'Pitch: ' + map.getPitch()); }); }}
  ]);
};

FUNCS['setBearing'] = function() {
  setCode('// MapLibre only\nmap.setBearing(90);');
  setControls('setBearing / getBearing — MapLibre only', [
    { label: '0° N', fn: function() { runOnAll('setBearing(0)', function(map) { map.setBearing(0); }); }},
    { label: '90° E', fn: function() { runOnAll('setBearing(90)', function(map) { map.setBearing(90); }); }},
    { label: '180° S', fn: function() { runOnAll('setBearing(180)', function(map) { map.setBearing(180); }); }},
    { label: 'Get Bearing', fn: function() { runOnAll('getBearing', function(map) { log('  → ', 'info', 'Bearing: ' + map.getBearing()); }); }}
  ]);
};

FUNCS['setProjection'] = function() {
  setCode('// MapLibre only\nmap.setProjection("globe");');
  setControls('setProjection — MapLibre only', [
    { label: 'Globe', fn: function() { runOnAll('setProjection(globe)', function(map) { map.setProjection('globe'); }); }},
    { label: 'Mercator', fn: function() { runOnAll('setProjection(mercator)', function(map) { map.setProjection('mercator'); }); }}
  ]);
};

FUNCS['setTerrain'] = function() {
  setCode('// MapLibre only — mp-tiles-demo two-mode UI.\n//\n// Relief (2D)     = hillshade overlay only (flat view).\n// Relief 3D       = hillshade overlay + setTerrain (pitched view).\n// They are mutually exclusive — switching from one to the other\n// keeps the DEM source and only flips the 3D mesh on/off.');

  // Shared helper used by both Relief and Relief 3D buttons. Sets up
  // (or refreshes) the hillshade overlay + opacity reduction; toggles
  // setTerrain depending on `wantTerrain3d`.
  function syncRelief(map, wantTerrain3d) {
    var n = map.native;
    var DEM = 'hillshade-dem';
    var HS  = 'bnt-hillshade';
        // 1. DEM source — mapterhorn.com terrarium tiles (mp-tiles-demo
        //    config verbatim, line 92-98 of demo/js/app/config.js).
        if (!n.getSource(DEM)) {
          n.addSource(DEM, {
            type: 'raster-dem',
            tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
            tileSize: 512,
            maxzoom: 12,
            encoding: 'terrarium',
            attribution: '&copy; <a href="https://mapterhorn.com" target="_blank" rel="noopener">mapterhorn.com</a>'
          });
        }
        // 2. Hillshade layer inserted just above the background — VALUES
        //    VERBATIM from mp-tiles-demo line 192-197. hillshade-
        //    exaggeration is 0.4, NOT 0.6 — 0.6 darkens the relief so
        //    much it dominates and the basemap disappears.
        if (!n.getLayer(HS)) {
          var beforeId;
          try {
            var layers = n.getStyle().layers || [];
            for (var li = 0; li < layers.length; li++) {
              if (layers[li].type !== 'background') { beforeId = layers[li].id; break; }
            }
          } catch (e) {}
          n.addLayer({
            id: HS, type: 'hillshade', source: DEM,
            // At low zoom the DEM source (maxzoom 12) gets scaled up
            // into a noisy gray haze that obliterates the basemap.
            // Minzoom 5 hides the relief when the viewport spans a
            // continent — at that scale the elevation is meaningless
            // anyway and the basemap looks clean again.
            minzoom: 5,
            paint: {
              'hillshade-exaggeration': 0.4,
              'hillshade-shadow-color': '#444444',
              'hillshade-highlight-color': '#ffffff',
              'hillshade-accent-color': '#cccccc'
            }
          }, beforeId);
        }
        // 3. Reduce fill-opacity on basemap landuse / landcover / boundary
        //    so relief reads through. mp-tiles-demo line 145-149 verbatim.
        var RELIEF_OPACITY = { 'landcover': 0.4, 'landuse': 0.5, 'boundary_fill': 0.5 };
        if (!map._reliefOpacitySaved) {
          map._reliefOpacitySaved = {};
          for (var lid in RELIEF_OPACITY) {
            if (n.getLayer(lid)) {
              try { map._reliefOpacitySaved[lid] = n.getPaintProperty(lid, 'fill-opacity'); } catch (e) {}
              try { n.setPaintProperty(lid, 'fill-opacity', RELIEF_OPACITY[lid]); } catch (e) {}
            }
          }
        }
    // 3b. Hide the style's own fill-extrusion layers ONLY in 3D mode.
    //     2D mode keeps buildings — they look fine on a flat view.
    //     In 3D, buildings get elevation added to their height — a
    //     building on a 4 km mountain renders as 4-km-tall pillars
    //     (the "wireframe" / fucked look the user saw). Save original
    //     visibility so the matching off-switch restores them.
    if (wantTerrain3d) {
      if (!map._extrusionVisibilitySaved) {
        map._extrusionVisibilitySaved = {};
        var sl = n.getStyle().layers || [];
        for (var li2 = 0; li2 < sl.length; li2++) {
          if (sl[li2].type === 'fill-extrusion' && n.getLayer(sl[li2].id)) {
            try {
              map._extrusionVisibilitySaved[sl[li2].id] = n.getLayoutProperty(sl[li2].id, 'visibility') || 'visible';
              n.setLayoutProperty(sl[li2].id, 'visibility', 'none');
            } catch (e) {}
          }
        }
      }
      map.setTerrain({ source: DEM, exaggeration: 1.5 });
      map.setPitch(60);
    } else {
      // Switching from 3D to 2D: restore the extrusion layers and
      // unset terrain. Keep the hillshade overlay.
      if (map._extrusionVisibilitySaved) {
        for (var elid in map._extrusionVisibilitySaved) {
          try { n.setLayoutProperty(elid, 'visibility', map._extrusionVisibilitySaved[elid]); } catch (e) {}
        }
        map._extrusionVisibilitySaved = null;
      }
      map.removeTerrain();
      map.setPitch(0);
    }
  }

  // Full teardown used by the "Remove" button. Drops the DEM source,
  // hillshade overlay, opacity overrides, extrusion-visibility
  // overrides, terrain mesh, pitch. Map is back to its initial state.
  function tearDownRelief(map) {
    var n = map.native;
    map.removeTerrain();
    map.setPitch(0);
    try { if (n.getLayer('bnt-hillshade')) n.removeLayer('bnt-hillshade'); } catch (e) {}
    if (map._reliefOpacitySaved) {
      for (var lid in map._reliefOpacitySaved) {
        try { n.setPaintProperty(lid, 'fill-opacity', map._reliefOpacitySaved[lid]); } catch (e) {}
      }
      map._reliefOpacitySaved = null;
    }
    if (map._extrusionVisibilitySaved) {
      for (var elid in map._extrusionVisibilitySaved) {
        try { n.setLayoutProperty(elid, 'visibility', map._extrusionVisibilitySaved[elid]); } catch (e) {}
      }
      map._extrusionVisibilitySaved = null;
    }
    try { if (n.getSource('hillshade-dem')) n.removeSource('hillshade-dem'); } catch (e) {}
    map._reliefMode = 'none';
    if (typeof map._unregisterEffect === 'function') map._unregisterEffect('relief');
  }

  setControls('Relief / Relief 3D — MapLibre only (mp-tiles-demo split)', [
    { label: 'Relief (2D)', fn: function() {
      runMapLibreOnly('toggleRelief(2D)', function(map) {
        if (map._reliefMode === '2d') { tearDownRelief(map); log('MapLibre', 'info', 'Relief OFF.'); return; }
        syncRelief(map, false);
        map._reliefMode = '2d';
        // Register as a teardown-able effect — without this, Clear All
        // and example navigation won't restore the basemap opacity
        // (landuse/landcover 0.4/0.5 → washed-out gray at low zoom).
        if (typeof map._registerEffect === 'function') {
          map._registerEffect('relief', function () { tearDownRelief(map); });
        }
        log('MapLibre', 'info', 'Relief (2D hillshade) ON. Pan to mountains to see the shading.');
      });
    }},
    { label: 'Relief 3D', fn: function() {
      runMapLibreOnly('toggleRelief(3D)', function(map) {
        if (map._reliefMode === '3d') { tearDownRelief(map); log('MapLibre', 'info', 'Relief 3D OFF.'); return; }
        syncRelief(map, true);
        map._reliefMode = '3d';
        if (typeof map._registerEffect === 'function') {
          map._registerEffect('relief', function () { tearDownRelief(map); });
        }
        log('MapLibre', 'info', 'Relief 3D ON (hillshade + terrain mesh + pitch 60°). Pan to the Alps.');
      });
    }},
    { label: 'More Exaggeration (3×)', fn: function() {
      runMapLibreOnly('setTerrain(3x)', function(map) {
        if (map._reliefMode !== '3d') { log('MapLibre', 'warn', 'Enable Relief 3D first.'); return; }
        map.setTerrain({ source: 'hillshade-dem', exaggeration: 3.0 });
        log('MapLibre', 'info', 'Exaggeration 3× — mountains look unreal but you definitely see them.');
      });
    }},
    { label: 'Remove all relief', fn: function() {
      runMapLibreOnly('removeRelief', function(map) { tearDownRelief(map); });
    }}
  ]);
};


FUNCS['setSky'] = function() {
  setCode('// MapLibre only — atmosphere visible on globe projection\n// Click "Show on Globe" first so the sky actually renders.\nmap.setProjection("globe");\nmap.setPitch(60);\nmap.setSky({ "atmosphere-blend": 1 });   // enable\nmap.setSky(null);                        // disable — null/undefined removes the sky');
  setControls('setSky — MapLibre only', [
    { label: 'Show on Globe', fn: function() { runMapLibreOnly('setProjection(globe)+pitch', function(map) { map.setProjection('globe'); map.setPitch(60); }); }},
    { label: 'Enable Sky', fn: function() { runMapLibreOnly('setSky({atmosphere-blend:1})', function(map) { map.setSky({ 'atmosphere-blend': 1 }); }); }},
    { label: 'Disable Sky', fn: function() { runMapLibreOnly('setSky(null) — remove sky', function(map) { map.setSky(null); }); }},
    { label: 'Back to Mercator', fn: function() { runMapLibreOnly('setProjection(mercator)', function(map) { map.setProjection('mercator'); map.setPitch(0); }); }}
  ]);
};

FUNCS['setLight'] = function() {
  // setLight only affects 3D extruded geometry (buildings, hillshade). On a
  // flat map there's nothing to shade so changes are invisible. The demo
  // first flies to Paris at zoom 16 + pitch 60° where the bundled style's
  // building extrusions render — then each preset noticeably changes the
  // sun direction / colour / intensity.
  // anchor:'map' makes `position` a real geographic vector
  // [radial, azimuth°, polar°] — useful for time-of-day lighting.
  setCode(
    '// MapLibre only — visible on 3D buildings (or terrain).\n' +
    '// Tilt + zoom-in so the buildings render before changing the light.\n' +
    'map.move(2.35, 48.86, 16);\n' +
    'map.setPitch(60);\n' +
    '\n' +
    '// "Sunset": warm light from the west, low on the horizon.\n' +
    'map.setLight({\n' +
    '  anchor:    "map",\n' +
    '  position:  [1.5, 270, 80],   // [radial, azimuth°, polar°]\n' +
    '  color:     "#ff9966",\n' +
    '  intensity: 0.7\n' +
    '});\n' +
    '\n' +
    'map.setLight();                 // reset to MapLibre defaults');

  function flyToParisPitched(map) {
    map.move(2.35, 48.86, 16);
    map.setPitch(60);
  }

  setControls('setLight — visible on 3D buildings (ML only)', [
    { label: '① Fly to Paris (pitched)', fn: function() {
      runMapLibreOnly('move(Paris)+pitch(60)', function(map) { flyToParisPitched(map); });
    }},
    { label: '☀ Noon (overhead white)', fn: function() {
      runMapLibreOnly('setLight(noon)', function(map) {
        map.setLight({ anchor: 'map', position: [1.5, 180, 10], color: '#ffffff', intensity: 0.9 });
      });
    }},
    { label: '🌅 Morning (east, warm)', fn: function() {
      runMapLibreOnly('setLight(morning)', function(map) {
        map.setLight({ anchor: 'map', position: [1.5, 90, 75], color: '#ffd9a8', intensity: 0.6 });
      });
    }},
    { label: '🌇 Sunset (west, orange)', fn: function() {
      runMapLibreOnly('setLight(sunset)', function(map) {
        map.setLight({ anchor: 'map', position: [1.5, 270, 80], color: '#ff9966', intensity: 0.7 });
      });
    }},
    { label: '🌙 Night (dim blue)', fn: function() {
      runMapLibreOnly('setLight(night)', function(map) {
        map.setLight({ anchor: 'map', position: [1.5, 180, 30], color: '#5575ff', intensity: 0.25 });
      });
    }},
    { label: 'Reset Light (defaults)', fn: function() {
      runMapLibreOnly('setLight() — defaults', function(map) { map.setLight(); });
    }}
  ]);
};

// --- Advanced MapLibre Only ---

FUNCS['addHeatmap'] = function() {
  setCode('// MapLibre only\nvar hl = new bemap.HeatmapLayer({\n  points: [{lon:2,lat:48,weight:5}, ...],\n  radius: 25\n});\nmap.addHeatmap(hl);');
  setControls('addHeatmap / removeHeatmap — MapLibre only', [
    { label: 'Add Heatmap', fn: function() {
      var pts = [];
      for (var i = 0; i < 300; i++) pts.push({ lon: -2 + Math.random() * 12, lat: 42 + Math.random() * 10, weight: Math.random() * 10 });
      runOnAll('addHeatmap', function(map, k) {
        state.heatmaps[k] = new bemap.HeatmapLayer({ name: 'heat-' + k, points: pts, radius: 25, intensity: 2 });
        map.addHeatmap(state.heatmaps[k]);
        // Fit France + nearby — the random points were sown across this bbox.
        map.moveToBoundingBox(new bemap.BoundingBox(-3, 41, 11, 53));
      });
    }},
    { label: 'Remove Heatmap', fn: function() {
      runOnAll('removeHeatmap', function(map, k) { if (state.heatmaps[k]) map.removeHeatmap(state.heatmaps[k]); });
    }}
  ]);
};

FUNCS['animateAlongRoute'] = function() {
  // Paris → Auxerre → Lyon → Aix → Nice. Same coords used by the route
  // line layer AND the animation, so the dot visibly follows the line.
  var ROUTE = [[2.35,48.85],[3,47.5],[4.83,45.76],[5.37,43.29],[7.26,43.71]];

  setCode(
    '// MapLibre only — animate a point along a path.\n' +
    '// The demo draws TWO things:\n' +
    '//   1) a static blue LineString showing the route\n' +
    '//   2) a red circle that animates along the same coordinates\n' +
    '\n' +
    '// Static route line:\n' +
    'map.native.addSource("anim-route", { type:"geojson", data:{\n' +
    '  type:"Feature", geometry:{ type:"LineString", coordinates:' + JSON.stringify(ROUTE) + ' }\n' +
    '}});\n' +
    'map.native.addLayer({ id:"anim-route-line", type:"line", source:"anim-route",\n' +
    '  paint:{ "line-color":"#3498db", "line-width":4 },\n' +
    '  layout:{ "line-cap":"round", "line-join":"round" }\n' +
    '});\n' +
    '\n' +
    '// Animated point:\n' +
    'map.native.addSource("anim-pt", { type:"geojson", data:{\n' +
    '  type:"Feature", geometry:{ type:"Point", coordinates:[2.35,48.85] }\n' +
    '}});\n' +
    'map.native.addLayer({ id:"anim-dot", type:"circle", source:"anim-pt",\n' +
    '  paint:{ "circle-radius":10, "circle-color":"#e74c3c", "circle-stroke-width":3, "circle-stroke-color":"#fff" }\n' +
    '});\n' +
    '\n' +
    'var ctrl = map.animateAlongRoute({\n' +
    '  sourceId: "anim-pt",\n' +
    '  coordinates: ' + JSON.stringify(ROUTE) + ',\n' +
    '  speed: 0.01, loop: true\n' +
    '});\n' +
    'ctrl.stop();   // pause\n' +
    'ctrl.resume(); // resume');

  setControls('animateAlongRoute — MapLibre only', [
    { label: 'Start Animation', fn: function() {
      runMapLibreOnly('animateAlongRoute', function(map) {
        var n = map.native;

        // 1) Static route LineString — the line the dot follows.
        if (!n.getSource('anim-route')) {
          n.addSource('anim-route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: ROUTE } }
          });
        }
        if (!n.getLayer('anim-route-line')) {
          n.addLayer({
            id: 'anim-route-line', type: 'line', source: 'anim-route',
            paint: { 'line-color': '#3498db', 'line-width': 4 },
            layout: { 'line-cap': 'round', 'line-join': 'round' }
          });
        }

        // 2) Animated point — the dot that rides along the line.
        if (!n.getSource('anim-pt')) {
          n.addSource('anim-pt', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'Point', coordinates: ROUTE[0] } }
          });
        }
        if (!n.getLayer('anim-dot')) {
          n.addLayer({
            id: 'anim-dot', type: 'circle', source: 'anim-pt',
            paint: { 'circle-radius': 10, 'circle-color': '#e74c3c', 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' }
          });
        }

        // Fit the route bbox (Paris → Nice).
        map.moveToBoundingBox(new bemap.BoundingBox(1.5, 42.8, 8, 49.5));

        // Start the animation. Log every ~5% so the panel doesn't drown.
        var lastLog = -1;
        window._animCtrl = map.animateAlongRoute({
          sourceId: 'anim-pt',
          coordinates: ROUTE,
          speed: 0.01, loop: true,
          onUpdate: function(p) {
            var pct = Math.round(p.progress * 100);
            if (pct !== lastLog && pct % 5 === 0) {
              lastLog = pct;
              log('ML', 'info', 'Pos: ' + p.lon.toFixed(2) + ',' + p.lat.toFixed(2) + ' (' + pct + '%)');
            }
          }
        });
        log('MapLibre', 'ok', 'Blue route + red dot animating from Paris → Nice (loop on)');
      });
    }},
    { label: 'Stop', fn: function() { if (window._animCtrl) window._animCtrl.stop(); log('ML', 'ok', 'Animation stopped'); }},
    { label: 'Resume', fn: function() { if (window._animCtrl) window._animCtrl.resume(); log('ML', 'ok', 'Animation resumed'); }}
  ]);
};

FUNCS['addClusterPoints'] = function() {
  setCode('// Works on ALL 3 backends!\nvar clusterLayer = new bemap.ClusterLayer({\n  name: "stations", distance: 50,\n  style: new bemap.clusterStyle({\n    icon: new bemap.Icon({ src: "images/map-marker-red.svg", anchorX: 0.5, anchorY: 1, anchorXUnits: "fraction", anchorYUnits: "fraction" }),\n    color: new bemap.Color(0, 150, 255, 1),\n    borderColor: new bemap.Color(255, 255, 255, 1),\n    textColor: new bemap.Color(255, 255, 255, 1)\n  })\n});\nmap.addLayer(clusterLayer);\n\n// OL/Leaflet: add markers to cluster layer\nfor (var i = 0; i < 100; i++) {\n  map.addMarker(marker, { layer: clusterLayer });\n}\n\n// MapLibre: use addClusterPoints\nmap.addClusterPoints(clusterLayer, coordinates);');
  setControls('Clustering — all 3 backends!', [
    { label: 'Add 200 Clustered Markers', fn: function() {
      // Generate random coords
      var coords = [];
      for (var i = 0; i < 200; i++) {
        coords.push(new bemap.Coordinate(-2 + Math.random() * 12, 42 + Math.random() * 10));
      }

      var clusterStyle = new bemap.clusterStyle({
        icon: new bemap.Icon({ src: 'images/map-marker-red.svg', anchorX: 0.5, anchorY: 1, anchorXUnits: 'fraction', anchorYUnits: 'fraction' }),
        color: new bemap.Color(0, 150, 255, 1),
        borderColor: new bemap.Color(255, 255, 255, 1),
        textColor: new bemap.Color(255, 255, 255, 1),
        size: 20, borderSize: 2, textSize: 2
      });

      // OlMap — create ClusterLayer, add markers to it
      try {
        var clOl = new bemap.ClusterLayer({ name: 'cluster-ol', distance: 50, style: clusterStyle });
        maps.ol.addLayer(clOl);
        for (var j = 0; j < coords.length; j++) {
          var m = new bemap.Marker(coords[j], {
            icon: new bemap.Icon({ src: 'images/map-marker-red.svg', anchorX: 0.5, anchorY: 1, anchorXUnits: 'fraction', anchorYUnits: 'fraction' }),
            id: 'cl-ol-' + j
          });
          maps.ol.addMarker(m, { layer: clOl });
        }
        log('OlMap', 'ok', 'addCluster: ' + coords.length + ' markers clustered');
      } catch(e) { log('OlMap', 'err', 'addCluster: ' + e.message); }

      // Leaflet — same approach
      try {
        var clLf = new bemap.ClusterLayer({ name: 'cluster-lf', distance: 50, style: clusterStyle });
        maps.lf.addLayer(clLf);
        for (var k = 0; k < coords.length; k++) {
          var m2 = new bemap.Marker(coords[k], {
            icon: new bemap.Icon({ src: 'images/map-marker-red.svg', anchorX: 0.5, anchorY: 1, anchorXUnits: 'fraction', anchorYUnits: 'fraction' }),
            id: 'cl-lf-' + k
          });
          maps.lf.addMarker(m2, { layer: clLf });
        }
        log('Leaflet', 'ok', 'addCluster: ' + coords.length + ' markers clustered');
      } catch(e) { log('Leaflet', 'err', 'addCluster: ' + e.message); }

      // MapLibre — use native addClusterPoints
      try {
        var clMl = new bemap.ClusterLayer({ name: 'cluster-ml', distance: 50, style: clusterStyle });
        maps.ml.addLayer(clMl);
        maps.ml.addClusterPoints(clMl, coords);
        log('MapLibre', 'ok', 'addClusterPoints: ' + coords.length + ' points clustered (native)');
      } catch(e) { log('MapLibre', 'err', 'addClusterPoints: ' + e.message); }
      // Fit France + nearby — points were sown over lon[-2..10], lat[42..52].
      try { if (maps.ol) maps.ol.moveToBoundingBox(new bemap.BoundingBox(-3, 41, 11, 53)); } catch (e) {}
      try { if (maps.lf) maps.lf.moveToBoundingBox(new bemap.BoundingBox(-3, 41, 11, 53)); } catch (e) {}
      try { if (maps.ml) maps.ml.moveToBoundingBox(new bemap.BoundingBox(-3, 41, 11, 53)); } catch (e) {}
    }}
  ]);
};

FUNCS['isDragPan'] = function() {
  setCode('console.log(map.isDragPan());\nmap.setDragPan(false);');
  setControls('isDragPan / setDragPan', [
    { label: 'Check isDragPan', fn: function() { runOnAll('isDragPan', function(map) { log('  → ', 'info', 'isDragPan: ' + map.isDragPan()); }); }},
    { label: 'Disable Drag', fn: function() { runOnAll('setDragPan(false)', function(map) { map.setDragPan(false); }); }},
    { label: 'Enable Drag', fn: function() { runOnAll('setDragPan(true)', function(map) { map.setDragPan(true); }); }}
  ]);
};

// --- Animations (MapLibre Only) ---

FUNCS['animateLine'] = function() {
  setCode('// MapLibre only — animate drawing a line\nvar ctrl = map.animateLine({\n  sourceId: "route-anim",\n  coordinates: [[2.35,48.85], ...],\n  speed: 2\n});');
  setControls('animateLine — draw line progressively (ML only)', [
    { label: 'Start Line Animation', fn: function() {
      runMapLibreOnly('animateLine', function(map) {
        var route = [];
        for (var i = 0; i <= 50; i++) {
          route.push([2.35 + i * 0.1, 48.85 - i * 0.08 + Math.sin(i * 0.3) * 0.5]);
        }
        if (!map.native.getSource('line-anim')) {
          map.native.addSource('line-anim', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [route[0]] } } });
          map.native.addLayer({ id: 'line-anim-layer', type: 'line', source: 'line-anim', paint: { 'line-color': '#e74c3c', 'line-width': 4 }, layout: { 'line-cap': 'round' } });
        }
        window._lineCtrl = map.animateLine({ sourceId: 'line-anim', coordinates: route, speed: 1, onComplete: function() { log('ML', 'ok', 'Line animation complete'); } });
      });
    }},
    { label: 'Stop', fn: function() { if (window._lineCtrl) window._lineCtrl.stop(); }},
    { label: 'Reset + Restart', fn: function() { if (window._lineCtrl) { window._lineCtrl.reset(); window._lineCtrl.resume(); } }}
  ]);
};

FUNCS['animateCameraOrbit'] = function() {
  setCode('// MapLibre only — orbit camera around a point\nvar ctrl = map.animateCameraOrbit({\n  center: [2.35, 48.85],\n  zoom: 14, pitch: 60, speed: 0.3\n});');
  setControls('animateCameraOrbit — rotate camera (ML only)', [
    { label: 'Start Orbit', fn: function() {
      runMapLibreOnly('animateCameraOrbit', function(map) {
        window._orbitCtrl = map.animateCameraOrbit({ center: [2.35, 48.85], zoom: 14, pitch: 60, speed: 0.5 });
      });
    }},
    { label: 'Stop', fn: function() { if (window._orbitCtrl) window._orbitCtrl.stop(); log('ML', 'ok', 'Orbit stopped'); }},
    { label: 'Resume', fn: function() { if (window._orbitCtrl) window._orbitCtrl.resume(); log('ML', 'ok', 'Orbit resumed'); }}
  ]);
};

FUNCS['animatePulse'] = function() {
  setCode('// MapLibre only — pulsing circle effect\nvar ctrl = map.animatePulse({\n  center: [2.35, 48.85],\n  color: "#e74c3c", maxRadius: 30\n});');
  setControls('animatePulse — pulsing marker (ML only)', [
    { label: 'Add Pulse (Paris)', fn: function() {
      runMapLibreOnly('animatePulse', function(map) {
        window._pulseCtrl = map.animatePulse({ center: [2.35, 48.85], color: '#e74c3c', maxRadius: 30, speed: 0.08 });
      });
    }},
    { label: 'Add Pulse (Nice)', fn: function() {
      runMapLibreOnly('animatePulse', function(map) {
        window._pulseCtrl2 = map.animatePulse({ center: [7.26, 43.71], color: '#3498db', maxRadius: 25, speed: 0.06 });
      });
    }},
    { label: 'Stop All', fn: function() {
      if (window._pulseCtrl) window._pulseCtrl.stop();
      if (window._pulseCtrl2) window._pulseCtrl2.stop();
      log('ML', 'ok', 'Pulses stopped');
    }},
    { label: 'Remove All', fn: function() {
      if (window._pulseCtrl) window._pulseCtrl.remove();
      if (window._pulseCtrl2) window._pulseCtrl2.remove();
      log('ML', 'ok', 'Pulses removed');
    }}
  ]);
};

FUNCS['spinGlobe'] = function() {
  setCode('// MapLibre only — spin the globe\nmap.setProjection("globe");\nvar ctrl = map.spinGlobe({ speed: 0.3 });');
  setControls('spinGlobe — spinning globe (ML only)', [
    { label: 'Start Spin', fn: function() {
      runMapLibreOnly('spinGlobe', function(map) {
        map.setProjection('globe');
        map.move(0, 20, 1.5);
        window._spinCtrl = map.spinGlobe({ speed: 0.5 });
      });
    }},
    { label: 'Stop', fn: function() { if (window._spinCtrl) window._spinCtrl.stop(); log('ML', 'ok', 'Spin stopped'); }},
    { label: 'Resume', fn: function() { if (window._spinCtrl) window._spinCtrl.resume(); log('ML', 'ok', 'Spin resumed'); }}
  ]);
};

// --- Missing methods: jumpTo, easeTo, getRotation, getPitch, getBearing ---

FUNCS['jumpTo'] = function() {
  setCode('// MapLibre only\nmap.jumpTo({ center: [2.35, 48.85], zoom: 14, pitch: 60, bearing: 45 });');
  setControls('jumpTo — instant camera change (ML only)', [
    { label: 'Jump Paris 3D', fn: function() { runOnAll('jumpTo(Paris,pitch60)', function(map) { map.jumpTo({ center: [2.35, 48.85], zoom: 14, pitch: 60, bearing: 45 }); }); }},
    { label: 'Jump Nice Flat', fn: function() { runOnAll('jumpTo(Nice,flat)', function(map) { map.jumpTo({ center: [7.26, 43.71], zoom: 12, pitch: 0, bearing: 0 }); }); }}
  ]);
};

FUNCS['easeTo'] = function() {
  setCode('// MapLibre only\nmap.easeTo({ center: [7.26, 43.71], zoom: 12, pitch: 45, bearing: 90, duration: 3000 });');
  setControls('easeTo — smooth animated camera (ML only)', [
    { label: 'Ease to Nice', fn: function() { runOnAll('easeTo(Nice)', function(map) { map.easeTo({ center: [7.26, 43.71], zoom: 12, pitch: 45, bearing: 90, duration: 3000 }); }); }},
    { label: 'Ease to Paris', fn: function() { runOnAll('easeTo(Paris)', function(map) { map.easeTo({ center: [2.35, 48.85], zoom: 10, pitch: 0, bearing: 0, duration: 2000 }); }); }}
  ]);
};

FUNCS['getRotation'] = function() {
  setCode('var angle = map.getRotation();');
  setControls('getRotation', [
    { label: 'Get Rotation', fn: function() { runOnAll('getRotation', function(map) { log('  → ', 'info', 'Rotation: ' + map.getRotation()); }); }}
  ]);
};

FUNCS['getPitch'] = function() {
  setCode('var p = map.getPitch(); // MapLibre returns actual, OL/Leaflet return 0');
  setControls('getPitch', [
    { label: 'Get Pitch', fn: function() { runOnAll('getPitch', function(map) { log('  → ', 'info', 'Pitch: ' + map.getPitch()); }); }}
  ]);
};

FUNCS['getBearing'] = function() {
  setCode('var b = map.getBearing(); // MapLibre returns actual, OL/Leaflet return 0');
  setControls('getBearing', [
    { label: 'Get Bearing', fn: function() { runOnAll('getBearing', function(map) { log('  → ', 'info', 'Bearing: ' + map.getBearing()); }); }}
  ]);
};

FUNCS['setStyle'] = function() {
  // Style presets — same skeleton as example-maplibre-custom-style.html.
  // Each preset is a full MapLibre Style spec layered on top of the
  // BeNomad PMTiles vector source. The overlay catalogue inside
  // MapLibreMap.setStyle replays any markers/polylines/popups that were
  // on the map before the swap, so user data survives a style change.
  var TILE_URL = 'pmtiles://https://mptiles-api-beta.benomad.net/OSM_250901_WORLD.pmtiles';
  function skeleton(layers) {
    return {
      version: 8,
      sources: {
        benomad: { type: 'vector', url: TILE_URL,
                   attribution: '© BeNomad · © OpenStreetMap contributors' }
      },
      layers: layers
    };
  }
  var DARK = skeleton([
    { id: 'background', type: 'background', paint: { 'background-color': '#0d1117' } },
    { id: 'water',      type: 'fill', source: 'benomad', 'source-layer': 'water',
      paint: { 'fill-color': '#0f3460' } },
    { id: 'landcover',  type: 'fill', source: 'benomad', 'source-layer': 'landcover',
      paint: { 'fill-color': '#1a2744', 'fill-opacity': 0.7 } },
    { id: 'roads',      type: 'line', source: 'benomad', 'source-layer': 'transportation',
      paint: { 'line-color': '#3498db', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.3, 14, 2] } },
    { id: 'boundaries', type: 'line', source: 'benomad', 'source-layer': 'boundary',
      paint: { 'line-color': '#e94560', 'line-width': 0.6, 'line-dasharray': [2, 2] } }
  ]);
  var PAPER = skeleton([
    { id: 'background', type: 'background', paint: { 'background-color': '#f5f1e8' } },
    { id: 'water',      type: 'fill', source: 'benomad', 'source-layer': 'water',
      paint: { 'fill-color': '#cfd9e8' } },
    { id: 'landcover',  type: 'fill', source: 'benomad', 'source-layer': 'landcover',
      paint: { 'fill-color': '#e9e1cd', 'fill-opacity': 0.8 } },
    { id: 'roads',      type: 'line', source: 'benomad', 'source-layer': 'transportation',
      paint: { 'line-color': '#7d6f5c', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 14, 2.5] } },
    { id: 'boundaries', type: 'line', source: 'benomad', 'source-layer': 'boundary',
      paint: { 'line-color': '#a07666', 'line-width': 0.6, 'line-dasharray': [3, 2] } }
  ]);
  var TEAL = skeleton([
    { id: 'background', type: 'background', paint: { 'background-color': '#0a1e22' } },
    { id: 'water',      type: 'fill', source: 'benomad', 'source-layer': 'water',
      paint: { 'fill-color': '#0f3340' } },
    { id: 'landcover',  type: 'fill', source: 'benomad', 'source-layer': 'landcover',
      paint: { 'fill-color': '#13383a', 'fill-opacity': 0.85 } },
    { id: 'roads',      type: 'line', source: 'benomad', 'source-layer': 'transportation',
      paint: { 'line-color': '#16a085', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.3, 14, 2] } },
    { id: 'boundaries', type: 'line', source: 'benomad', 'source-layer': 'boundary',
      paint: { 'line-color': '#7ee787', 'line-width': 0.6 } }
  ]);
  var OSM_RASTER = {
    version: 8,
    sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
  };

  setCode(
    '// MapLibre only — swap the entire style at runtime.\n' +
    '// Markers, polylines, popups added before the call are auto-replayed\n' +
    '// by bemap.MapLibreMap.setStyle (overlay catalogue).\n' +
    'map.setStyle(bemap.defaultStyle);              // Bundled BeNomad gray\n' +
    'map.setStyle({version:8, sources:{...}, layers:[...]});  // your own JSON');

  // Pretty-print a MapLibre Style spec. The bundled BeNomad style has ~80
  // layers — too large for the log panel — so we summarise it inline and
  // log the full JSON to the browser console for inspection in DevTools.
  function logStyleJson(label, style) {
    var sourcesCount = style && style.sources ? Object.keys(style.sources).length : 0;
    var layersCount  = style && style.layers ? style.layers.length : 0;
    log('  →', 'info', 'Style "' + label + '" — version ' + (style.version || '?') +
        ', ' + sourcesCount + ' source(s), ' + layersCount + ' layer(s)');
    // Full JSON: short styles inline in the log; large styles to console only.
    var pretty = '';
    try { pretty = JSON.stringify(style, null, 2); } catch (e) { pretty = String(style); }
    if (pretty.length <= 800) {
      log('  ', 'info', pretty);
    } else {
      log('  →', 'info', 'Full JSON (' + pretty.length + ' chars) printed to browser DevTools console.');
      if (typeof console !== 'undefined' && console.log) {
        console.log('[setStyle] "' + label + '" applied — full Style spec:', style);
        console.log('[setStyle] JSON.stringify (copy-paste ready):\n' + pretty);
      }
    }
    // Mirror the applied style into the dashboard's Code panel so users can
    // grab it as a starting point for their own customisation.
    setCode(
      '// Style "' + label + '" — applied via map.setStyle(...)\n' +
      '// (copy-paste ready, the full spec the lib just sent to MapLibre)\n' +
      'map.setStyle(' + pretty + ');'
    );
  }

  function applyStyle(label, style) {
    runMapLibreOnly('setStyle(' + label + ')', function(map) {
      map.setStyle(style);
      // Re-center on France/Europe so the style differences are visible.
      map.move(2.35, 46.5, 5);
    });
    logStyleJson(label, style);
  }

  setControls('setStyle — runtime style swap (ML only)', [
    { label: 'Bundled (BeNomad gray)',
      fn: function() { applyStyle('bundled',  bemap.defaultStyle); }},
    { label: 'Dark',
      fn: function() { applyStyle('dark',     DARK); }},
    { label: 'Paper',
      fn: function() { applyStyle('paper',    PAPER); }},
    { label: 'Teal night',
      fn: function() { applyStyle('teal',     TEAL); }},
    { label: 'OSM Raster',
      fn: function() { applyStyle('osm-raster', OSM_RASTER); }}
  ]);
};

FUNCS['addGeoJsonSource'] = function() {
  // A GeoJSON SOURCE is the data behind one or more layers. By itself it
  // is invisible — you need a LAYER (circle / line / fill / symbol) whose
  // `source` field references the source id. The same source can power
  // many layers (e.g. a circle for the dot + a symbol for the label).
  //
  // Why bother vs. addMarker / addPolyline?
  //   - One source can feed 100k+ features efficiently (vector-tiled).
  //   - You can hot-swap the data with `updateGeoJsonSource` (no flicker).
  //   - Style is driven by feature properties (e.g. colour by category).
  setCode(
    '// MapLibre only — a GeoJSON source is the raw data behind a layer.\n' +
    '// Steps:\n' +
    '//   1) addGeoJsonSource(id, geojson)\n' +
    '//   2) addLayer({type:"circle", source:id, ...})\n' +
    '//   3) updateGeoJsonSource(id, newGeojson) to hot-swap data\n' +
    '\n' +
    'map.addGeoJsonSource("cities-src", {\n' +
    '  type: "FeatureCollection",\n' +
    '  features: [\n' +
    '    { type:"Feature", properties:{ city:"Paris",     pop:11.2 }, geometry:{ type:"Point", coordinates:[2.35, 48.85] }},\n' +
    '    { type:"Feature", properties:{ city:"Lyon",      pop:1.7  }, geometry:{ type:"Point", coordinates:[4.83, 45.76] }},\n' +
    '    { type:"Feature", properties:{ city:"Marseille", pop:1.6  }, geometry:{ type:"Point", coordinates:[5.37, 43.30] }},\n' +
    '    { type:"Feature", properties:{ city:"Bordeaux",  pop:0.8  }, geometry:{ type:"Point", coordinates:[-0.58, 44.84]}},\n' +
    '    { type:"Feature", properties:{ city:"Lille",     pop:1.1  }, geometry:{ type:"Point", coordinates:[3.06, 50.63] }}\n' +
    '  ]\n' +
    '});\n' +
    '\n' +
    'map.native.addLayer({\n' +
    '  id: "cities-dots", type: "circle", source: "cities-src",\n' +
    '  paint: {\n' +
    '    "circle-radius": ["interpolate", ["linear"], ["get", "pop"], 0, 6, 12, 24],\n' +
    '    "circle-color":  "#e74c3c", "circle-stroke-color": "#fff", "circle-stroke-width": 2\n' +
    '  }\n' +
    '});'
  );

  // Two demo datasets — the toggle proves the source can be hot-swapped.
  function franceCities() {
    return {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { city: 'Paris',     pop: 11.2 }, geometry: { type: 'Point', coordinates: [ 2.35, 48.85] } },
        { type: 'Feature', properties: { city: 'Lyon',      pop:  1.7 }, geometry: { type: 'Point', coordinates: [ 4.83, 45.76] } },
        { type: 'Feature', properties: { city: 'Marseille', pop:  1.6 }, geometry: { type: 'Point', coordinates: [ 5.37, 43.30] } },
        { type: 'Feature', properties: { city: 'Bordeaux',  pop:  0.8 }, geometry: { type: 'Point', coordinates: [-0.58, 44.84] } },
        { type: 'Feature', properties: { city: 'Lille',     pop:  1.1 }, geometry: { type: 'Point', coordinates: [ 3.06, 50.63] } }
      ]
    };
  }
  function europeCapitals() {
    return {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { city: 'Paris',    pop:11.2 }, geometry: { type: 'Point', coordinates: [ 2.35, 48.85] } },
        { type: 'Feature', properties: { city: 'Madrid',   pop: 6.7 }, geometry: { type: 'Point', coordinates: [-3.70, 40.42] } },
        { type: 'Feature', properties: { city: 'Roma',     pop: 4.3 }, geometry: { type: 'Point', coordinates: [12.50, 41.90] } },
        { type: 'Feature', properties: { city: 'Berlin',   pop: 3.7 }, geometry: { type: 'Point', coordinates: [13.41, 52.52] } },
        { type: 'Feature', properties: { city: 'London',   pop: 9.0 }, geometry: { type: 'Point', coordinates: [-0.13, 51.51] } },
        { type: 'Feature', properties: { city: 'Brussels', pop: 1.2 }, geometry: { type: 'Point', coordinates: [ 4.35, 50.85] } }
      ]
    };
  }
  function ensureLayer(map) {
    var n = map.native;
    if (n.getLayer('cities-dots')) return;
    n.addLayer({
      id: 'cities-dots', type: 'circle', source: 'cities-src',
      paint: {
        'circle-radius':       ['interpolate', ['linear'], ['get', 'pop'], 0, 6, 12, 24],
        'circle-color':        '#e74c3c',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2
      }
    });
    n.addLayer({
      id: 'cities-labels', type: 'symbol', source: 'cities-src',
      layout: {
        'text-field':  ['get', 'city'],
        'text-size':   12,
        'text-offset': [0, 1.5],
        'text-anchor': 'top'
      },
      paint: { 'text-color': '#222', 'text-halo-color': '#fff', 'text-halo-width': 2 }
    });
  }

  setControls('addGeoJsonSource / updateGeoJsonSource (ML only)', [
    { label: 'Add source + circle/label layers (5 cities)', fn: function() {
      runMapLibreOnly('addGeoJsonSource + addLayer', function(map) {
        var n = map.native;
        if (!n.getSource('cities-src')) {
          map.addGeoJsonSource('cities-src', franceCities());
        }
        ensureLayer(map);
        map.moveToBoundingBox(new bemap.BoundingBox(-2, 42, 7, 51));
        log('MapLibre', 'ok', 'Source "cities-src" + 2 layers (circle + label) — 5 French cities');
      });
    }},
    { label: 'Hot-swap source → Europe capitals', fn: function() {
      runMapLibreOnly('updateGeoJsonSource', function(map) {
        if (!map.native.getSource('cities-src')) {
          log('MapLibre', 'warn', 'Add the source first.');
          return;
        }
        map.updateGeoJsonSource('cities-src', europeCapitals());
        map.moveToBoundingBox(new bemap.BoundingBox(-10, 38, 18, 55));
        log('MapLibre', 'ok', 'Source data hot-swapped — same layers now render 6 EU capitals');
      });
    }},
    { label: 'Reset → 5 French cities', fn: function() {
      runMapLibreOnly('updateGeoJsonSource(reset)', function(map) {
        if (!map.native.getSource('cities-src')) return;
        map.updateGeoJsonSource('cities-src', franceCities());
        map.moveToBoundingBox(new bemap.BoundingBox(-2, 42, 7, 51));
      });
    }},
    { label: 'Remove (layers + source)', fn: function() {
      runMapLibreOnly('removeLayer + removeSource', function(map) {
        var n = map.native;
        if (n.getLayer('cities-labels')) n.removeLayer('cities-labels');
        if (n.getLayer('cities-dots'))   n.removeLayer('cities-dots');
        if (n.getSource('cities-src'))   n.removeSource('cities-src');
        log('MapLibre', 'ok', 'All cities-* layers + source removed');
      });
    }}
  ]);
};

FUNCS['addImage'] = function() {
  setCode(
    '// MapLibre only — register a custom image for symbol layers.\n' +
    '// addImage by itself is invisible: it just puts the bitmap into\n' +
    "// MapLibre's image registry. To SEE it you need a symbol layer\n" +
    "// whose `icon-image` references the name.\n" +
    '\n' +
    '// 1) Generate or load a bitmap (here: a 64x64 yellow star on canvas).\n' +
    'var canvas = document.createElement("canvas");\n' +
    'canvas.width = canvas.height = 64;\n' +
    '/* draw a star here */\n' +
    'var img = canvas.getContext("2d").getImageData(0, 0, 64, 64);\n' +
    '\n' +
    '// 2) Register it under a stable name.\n' +
    'map.addImage("yellow-star", img);\n' +
    '\n' +
    '// 3) Add a GeoJSON source + a symbol layer that uses the icon.\n' +
    'map.native.addSource("stars-src", { type: "geojson", data: {\n' +
    '  type: "FeatureCollection", features: [\n' +
    '    { type:"Feature", geometry:{type:"Point", coordinates:[2.35, 48.85]} },\n' +
    '    { type:"Feature", geometry:{type:"Point", coordinates:[4.83, 45.76]} },\n' +
    '    { type:"Feature", geometry:{type:"Point", coordinates:[5.37, 43.30]} }\n' +
    '  ]\n' +
    '}});\n' +
    'map.native.addLayer({\n' +
    '  id: "stars-layer", type: "symbol", source: "stars-src",\n' +
    '  layout: { "icon-image": "yellow-star", "icon-size": 0.7, "icon-allow-overlap": true }\n' +
    '});'
  );

  // Draw a yellow 5-pointed star with an orange outline onto a canvas
  // and return its ImageData — recognizable at any zoom, no asset to host.
  function makeStarImageData() {
    var size = 64;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    g.fillStyle = '#ffcc00';
    g.strokeStyle = '#cc6600';
    g.lineWidth = 3;
    g.beginPath();
    var cx = size / 2, cy = size / 2, outerR = size / 2 - 4, innerR = outerR * 0.45;
    for (var i = 0; i < 10; i++) {
      var r = (i % 2 === 0) ? outerR : innerR;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    g.stroke();
    return g.getImageData(0, 0, size, size);
  }

  setControls('addImage / removeImage (ML only)', [
    { label: 'Add yellow-star icon at 3 cities', fn: function() {
      runMapLibreOnly('addImage + symbol layer', function(map) {
        var n = map.native;
        // 1) Register the image (idempotent — replace if it already exists).
        if (n.hasImage && n.hasImage('yellow-star')) n.removeImage('yellow-star');
        n.addImage('yellow-star', makeStarImageData());

        // 2) Add the GeoJSON source (Paris / Lyon / Marseille).
        if (!n.getSource('stars-src')) {
          n.addSource('stars-src', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                { type: 'Feature', properties: { city: 'Paris'     }, geometry: { type: 'Point', coordinates: [2.35, 48.85] } },
                { type: 'Feature', properties: { city: 'Lyon'      }, geometry: { type: 'Point', coordinates: [4.83, 45.76] } },
                { type: 'Feature', properties: { city: 'Marseille' }, geometry: { type: 'Point', coordinates: [5.37, 43.30] } }
              ]
            }
          });
        }
        // 3) Add the symbol layer that renders the registered image.
        if (!n.getLayer('stars-layer')) {
          n.addLayer({
            id: 'stars-layer', type: 'symbol', source: 'stars-src',
            layout: {
              'icon-image': 'yellow-star',
              'icon-size': 0.7,
              'icon-allow-overlap': true,
              'text-field': ['get', 'city'],
              'text-offset': [0, 2],
              'text-anchor': 'top',
              'text-size': 12
            },
            paint: {
              'text-color': '#222',
              'text-halo-color': '#fff',
              'text-halo-width': 2
            }
          });
        }
        // Fit France bbox so all 3 stars are visible.
        map.moveToBoundingBox(new bemap.BoundingBox(1, 43, 7, 50));
        log('MapLibre', 'ok', 'addImage("yellow-star") + 3 cities visible');
      });
    }},
    { label: 'Remove (image + source + layer)', fn: function() {
      runMapLibreOnly('removeImage + cleanup', function(map) {
        var n = map.native;
        if (n.getLayer('stars-layer'))    n.removeLayer('stars-layer');
        if (n.getSource('stars-src'))     n.removeSource('stars-src');
        if (n.hasImage && n.hasImage('yellow-star')) n.removeImage('yellow-star');
        log('MapLibre', 'ok', 'removeImage("yellow-star") + symbol layer + source removed');
      });
    }}
  ]);
};

FUNCS['queryRenderedFeatures'] = function() {
  // queryRenderedFeatures returns every feature currently RENDERED at a
  // given pixel position (or in a bbox). Used for click-to-identify,
  // hover tooltips, "what's at this point?" UX.
  //
  // The demo first pre-populates the map with the same 5-cities GeoJSON
  // source so there's something to find — without features queries return
  // an empty array and the demo looks broken.
  setCode(
    '// MapLibre only — find rendered features under a pixel position.\n' +
    '\n' +
    '// Query at a screen-pixel point:\n' +
    'var features = map.queryRenderedFeatures([px, py]);\n' +
    '\n' +
    '// Or filter by layer id (much faster on busy styles):\n' +
    'var hits = map.queryRenderedFeatures([px, py], { layers: ["cities-dots"] });\n' +
    'hits.forEach(function (f) {\n' +
    '  console.log(f.properties.city, f.geometry.coordinates);\n' +
    '});\n' +
    '\n' +
    '// Common pattern: hook to a click event for tooltips.\n' +
    'map.on("click", function (e) {\n' +
    '  var hit = map.queryRenderedFeatures(e.point)[0];\n' +
    '  if (hit) showTooltip(hit);\n' +
    '});'
  );

  function ensureDemoSource(map) {
    var n = map.native;
    if (n.getSource('cities-src')) return; // shared with addGeoJsonSource
    map.addGeoJsonSource('cities-src', {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { city: 'Paris',     pop: 11.2 }, geometry: { type: 'Point', coordinates: [ 2.35, 48.85] } },
        { type: 'Feature', properties: { city: 'Lyon',      pop:  1.7 }, geometry: { type: 'Point', coordinates: [ 4.83, 45.76] } },
        { type: 'Feature', properties: { city: 'Marseille', pop:  1.6 }, geometry: { type: 'Point', coordinates: [ 5.37, 43.30] } },
        { type: 'Feature', properties: { city: 'Bordeaux',  pop:  0.8 }, geometry: { type: 'Point', coordinates: [-0.58, 44.84] } },
        { type: 'Feature', properties: { city: 'Lille',     pop:  1.1 }, geometry: { type: 'Point', coordinates: [ 3.06, 50.63] } }
      ]
    });
    if (!n.getLayer('cities-dots')) {
      n.addLayer({
        id: 'cities-dots', type: 'circle', source: 'cities-src',
        paint: {
          'circle-radius':       ['interpolate', ['linear'], ['get', 'pop'], 0, 8, 12, 28],
          'circle-color':        '#3498db',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2
        }
      });
    }
  }

  function reportHits(label, hits) {
    if (!hits || !hits.length) {
      log('  →', 'warn', label + ': 0 features at that point');
      return;
    }
    log('  →', 'ok', label + ': ' + hits.length + ' feature(s)');
    for (var i = 0; i < Math.min(hits.length, 5); i++) {
      var f = hits[i];
      var props = JSON.stringify(f.properties || {});
      var geomType = f.geometry && f.geometry.type;
      var layerId  = f.layer && f.layer.id;
      log('    •', 'info', '[' + (layerId || '?') + '] ' + geomType + ' ' + props);
    }
    if (hits.length > 5) log('    …', 'info', '(' + (hits.length - 5) + ' more)');
  }

  setControls('queryRenderedFeatures — click to identify (ML only)', [
    { label: '① Setup: 5 city dots', fn: function() {
      runMapLibreOnly('addGeoJsonSource(cities-src)', function(map) {
        ensureDemoSource(map);
        map.moveToBoundingBox(new bemap.BoundingBox(-2, 42, 7, 51));
        log('MapLibre', 'ok', 'Setup ready — try the "Query…" buttons below');
      });
    }},
    { label: 'Query map center', fn: function() {
      runMapLibreOnly('queryRenderedFeatures(center)', function(map) {
        var c   = map.native.getContainer();
        var pt  = [c.clientWidth / 2, c.clientHeight / 2];
        var hits = map.queryRenderedFeatures(pt);
        reportHits('center [' + pt[0].toFixed(0) + ',' + pt[1].toFixed(0) + ']', hits);
      });
    }},
    { label: 'Query only "cities-dots" layer', fn: function() {
      runMapLibreOnly('queryRenderedFeatures(layers:cities-dots)', function(map) {
        var c   = map.native.getContainer();
        var pt  = [c.clientWidth / 2, c.clientHeight / 2];
        var hits = map.queryRenderedFeatures(pt, { layers: ['cities-dots'] });
        reportHits('cities-dots @ center', hits);
      });
    }},
    { label: '② Click anywhere to identify', fn: function() {
      runMapLibreOnly('on(click) + queryRenderedFeatures', function(map) {
        if (map._qrfClickHandler) {
          map.native.off('click', map._qrfClickHandler);
          map._qrfClickHandler = null;
          log('MapLibre', 'info', 'Click-to-identify DISABLED');
          return;
        }
        map._qrfClickHandler = function (e) {
          var hits = map.native.queryRenderedFeatures(e.point);
          reportHits('click [' + e.point.x.toFixed(0) + ',' + e.point.y.toFixed(0) + '] (' + e.lngLat.lng.toFixed(3) + ', ' + e.lngLat.lat.toFixed(3) + ')', hits);
        };
        map.native.on('click', map._qrfClickHandler);
        log('MapLibre', 'ok', 'Click ENABLED — click any dot (or anywhere) to see what features are there. Press this button again to disable.');
      });
    }}
  ]);
};

FUNCS['add3DBuildings'] = function() {
  setCode('// MapLibre only — requires Vector Tiles style!\n// Switch to "Vector Tiles" in top bar first.\nmap.setPitch(60);\nmap.move(2.35, 48.85, 16);\nmap.add3DBuildings({\n  sourceId: "openmaptiles",\n  sourceLayer: "building",\n  heightProperty: "render_height",\n  baseHeightProperty: "render_min_height",\n  color: "#ddd",\n  opacity: 0.8,\n  minZoom: 14\n});');
  setControls('add3DBuildings — requires Vector Tiles! (ML only)', [
    { label: 'Add 3D Buildings', fn: function() {
      var sel = document.getElementById('mlStyleSelect');
      if (sel && sel.value !== 'vector') {
        log('MapLibre', 'warn', 'Switch to "Vector Tiles" first! 3D buildings need vector tile data with building heights.');
      }
      runMapLibreOnly('add3DBuildings', function(map) {
        map.setPitch(60);
        map.move(2.35, 48.85, 16);
        // Restore the style's own building extrusion layers if Remove
        // hid them earlier — that's what makes Remove → Add round-trip.
        var n = map.native;
        if (map._buildingsVisibilitySaved) {
          for (var lid in map._buildingsVisibilitySaved) {
            try { n.setLayoutProperty(lid, 'visibility', map._buildingsVisibilitySaved[lid]); } catch (e) {}
          }
          map._buildingsVisibilitySaved = null;
        }
        map.add3DBuildings({
          sourceId: 'openmaptiles',
          sourceLayer: 'building',
          heightProperty: 'render_height',
          baseHeightProperty: 'render_min_height',
          color: '#ddd',
          opacity: 0.8,
          minZoom: 14
        });
      });
    }},
    { label: 'Remove Buildings', fn: function() {
      runMapLibreOnly('remove3DBuildings', function(map) {
        // Remove the layer add3DBuildings created.
        map.remove3DBuildings();
        // ALSO hide the bundled style's own `building` + `lowzoom_building`
        // fill-extrusion layers — without that the user sees no visual
        // change because the basemap renders its own buildings. Save the
        // visibility so Add Buildings can restore it cleanly.
        var n = map.native;
        if (!map._buildingsVisibilitySaved) {
          map._buildingsVisibilitySaved = {};
          var sl = n.getStyle().layers || [];
          for (var i = 0; i < sl.length; i++) {
            if (sl[i].type === 'fill-extrusion' && n.getLayer(sl[i].id)) {
              try {
                map._buildingsVisibilitySaved[sl[i].id] = n.getLayoutProperty(sl[i].id, 'visibility') || 'visible';
                n.setLayoutProperty(sl[i].id, 'visibility', 'none');
              } catch (e) {}
            }
          }
        }
        map.setPitch(0);
      });
    }},
    { label: 'Switch to Vector Tiles', fn: function() {
      var sel = document.getElementById('mlStyleSelect');
      if (sel) { sel.value = 'vector'; switchMapLibreStyle('vector'); }
    }}
  ]);
};

FUNCS['addRasterLayer'] = function() {
  setCode('// MapLibre only\nvar rl = new bemap.RasterLayer({\n  name: "satellite",\n  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"\n});\nmap.addRasterLayer(rl);');
  setControls('addRasterLayer (ML only)', [
    { label: 'Add OSM Raster', fn: function() {
      runOnAll('addRasterLayer', function(map, k) {
        var rl = new bemap.RasterLayer({ name: 'raster-' + k, url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' });
        map.addRasterLayer(rl);
      });
    }}
  ]);
};

// FUNCS['zIndexLayer'] + FUNCS['refreshLayer'] now defined earlier in the
// file (Layer-Management showcase, with proper demo buttons). The legacy
// one-line stubs that lived here are removed — they were silently
// overwriting the enhanced versions because JS assignment is last-write-wins.

FUNCS['moveToLayerData'] = function() {
  setCode(
    '// Zoom & pan the map to fit all features on a given layer.\n' +
    '// (OL + MapLibre only — Leaflet has no native implementation,\n' +
    '// so it falls back to a base-class no-op.)\n\n' +
    'var layer = map.getLayerByName("marker");\n' +
    'map.moveToLayerData(layer);');
  setControls('moveToLayerData — zoom to fit layer features', [
    { label: '1. Reset (zoom out to world)', fn: function() {
      runOnAll('reset zoom', function(map) { map.move(0, 30, 2); });
    }},
    { label: '2. Add 3 markers far apart', fn: function() {
      runOnAll('add 3 markers (Paris / Marseille / Nice)', function(map, k) {
        // Tear down any previous markers on the MARKER layer so the
        // fit-to-data button actually observes a fresh set.
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) { try { map.clearLayer(l); } catch (e) {} }
        if (l) populateLayerWithDemoMarkers(map, l, 'mtld-' + k);
      });
    }},
    { label: '3. Fit to MARKER layer', fn: function() {
      runOnAll('moveToLayerData(markerLayer)', function(map, k) {
        var l = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
        if (l) {
          map.moveToLayerData(l);
          log(k.toUpperCase(), 'ok', 'Map fit to ' + (l.features ? l.features.length : 'all') + ' features on MARKER layer');
        }
      });
    }}
  ]);
};

// =========================================================================
// Build Menu
// =========================================================================

var CATEGORIES = {
  'Layer': ['addLayer', 'removeLayer', 'getLayerByName', 'visibleLayer', 'clearLayer', 'zIndexLayer', 'refreshLayer', 'defaultLayers', 'addRasterLayer'],
  'Camera': ['move', 'flyTo', 'zoom', 'getZoom', 'getCenter', 'getBoundingBox', 'getRotation', 'moveToBoundingBox', 'moveToLayerData', 'rotation', 'refresh'],
  'Camera 3D (ML)': ['jumpTo', 'easeTo', 'setPitch', 'getPitch', 'setBearing', 'getBearing', 'setProjection'],
  'Markers': ['addMarker'],
  'Polylines': ['addPolyline'],
  'Polygons': ['addPolygon'],
  'Circles': ['addCircle'],
  'Popups': ['addPopup'],
  'Events': ['on(CLICK)', 'onMarker'],
  'Drag': ['draggableMarker', 'draggablePolyline', 'isDragPan'],
  'Clustering': ['addClusterPoints'],
  'Style (ML)': ['setStyle', 'setTerrain', 'setSky', 'setLight'],
  'Sources (ML)': ['addGeoJsonSource', 'addImage', 'queryRenderedFeatures', 'add3DBuildings'],
  'Advanced (ML)': ['addHeatmap'],
  'Animations (ML)': ['animateAlongRoute', 'animateLine', 'animateCameraOrbit', 'animatePulse', 'spinGlobe']
};

function buildMenu() {
  var list = document.getElementById('funcList');
  for (var cat in CATEGORIES) {
    var h = document.createElement('h3');
    h.textContent = cat;
    list.appendChild(h);
    var funcs = CATEGORIES[cat];
    for (var i = 0; i < funcs.length; i++) {
      var a = document.createElement('a');
      a.textContent = funcs[i];
      a.dataset.func = funcs[i];
      if (cat.indexOf('ML') > -1) {
        var tag = document.createElement('span');
        tag.className = 'ml-tag';
        tag.textContent = 'ML';
        a.appendChild(tag);
      }
      a.onclick = function() {
        document.querySelectorAll('.func-list a').forEach(function(el) { el.classList.remove('active'); });
        this.classList.add('active');
        var fn = FUNCS[this.dataset.func];
        if (fn) fn();
      };
      list.appendChild(a);
    }
  }
}

// =========================================================================
// Init
// =========================================================================

buildMenu();
initMaps();
hideEmbedChrome();
// Run the `?fn=…` deep link AFTER initMaps' fitAll cascade (0ms / 100ms /
// 500ms — see initMaps). Firing earlier means the demo's own move/flyTo
// gets overwritten by the last fitAll → user sees the function's code
// take effect briefly, then the map snaps back to France-zoom-6 and the
// demo looks broken. 700ms leaves ~200ms slack after the last fitAll.
setTimeout(_bnAutoRunFromQuery, 700);
