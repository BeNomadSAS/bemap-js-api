/* ============================================================
 * Dark Blue Map Style — same theme on 3 engines.
 *
 * • OpenLayers + Leaflet: server-side render via WMS `styles:'darkblue'`.
 *   Use the single-call shortcut: `defaultLayers({ styles: 'darkblue' })`.
 *   Calling `addLayer(BemapLayer)` AFTER `defaultLayers()` would stack a
 *   second opaque WMS tile layer on top — the shortcut above avoids that.
 *
 * • MapLibre: let the library load the default BeNomad vector style (tiny
 *   fallback then the live charte from the Worker — PMTiles source URL + JWT
 *   injection handled for you), then
 *   walk the style's layers and override `paint` values with dark-blue
 *   colours. This sidesteps the `_hasCustomStyle` branch which silently
 *   drops `addLayer(BemapLayer)` calls.
 *
 *   `addMarker` still works on MapLibre with this approach because we
 *   don't fully replace the style and overlay layers are tracked in the
 *   library's _overlayCatalog.
 *
 * Two markers (BeNomad France, BeNomad USA) are added on every engine
 * with identical bemap.Marker code — proving the markers API is engine-
 * agnostic.
 * ============================================================ */

onLoaded = function() {

  var ctx = bemapMainCtx;
  var benomadFR = { lon: 7.13397, lat: 43.6358 };
  var benomadUS = { lon: -122.4327353, lat: 37.7751336 };
  var startLon = -50, startLat = 43.6358, startZoom = 3;

  /* ----- SPA-embed bridge: forward each engine's setup snippet to the
   * dashboard's outer code panel so the customer sees the exact code. ----- */
  var _EMBED = (function () { try { return window.parent !== window; } catch (e) { return false; } })();
  function _post(p) { if (_EMBED) { try { window.parent.postMessage(p, '*'); } catch (e) {} } }
  function postCode(code) {
    _post({ type: 'bemap:fn:code', code: code, label: 'example-mapping-style-dark_blue.js' });
  }
  function postLog(provider, status, msg) {
    _post({ type: 'bemap:fn:log', provider: provider, status: status, msg: msg });
    if (window.console && window.console.log) window.console.log('[' + provider + '] ' + msg);
  }

  /* ----- Shared marker icon + factory (identical code for all 3 engines) ----- */
  var icon = new bemap.Icon({
    src:          'spotlight-poi.png',
    anchorX:      0.5,
    anchorY:      1,
    anchorXUnits: 'fraction',
    anchorYUnits: 'fraction'
  });
  function makeMarkers() {
    return [
      new bemap.Marker(new bemap.Coordinate(benomadFR.lon, benomadFR.lat), {
        icon: icon, id: 'markerFR', name: 'BeNomad France'
      }),
      new bemap.Marker(new bemap.Coordinate(benomadUS.lon, benomadUS.lat), {
        icon: icon, id: 'markerUS', name: 'BeNomad USA'
      })
    ];
  }

  /* ============================================================
   * OpenLayers — WMS server-side darkblue render
   * ============================================================ */
  var olMap;
  try {
    olMap = new bemap.Ol3Map(ctx, 'map-ol')
      .defaultLayers({ styles: 'darkblue' })   // single-call: BACKGROUND + overlays
      .move(startLon, startLat, startZoom);
    var mkOl = makeMarkers();
    olMap.addMarker(mkOl[0]);
    olMap.addMarker(mkOl[1]);
    postLog('OL', 'ok', 'rendered with WMS styles=darkblue, 2 markers added');
  } catch (e) { postLog('OL', 'err', e.message); }

  /* ============================================================
   * Leaflet — WMS server-side darkblue render (same code as OL)
   * ============================================================ */
  var lfMap;
  try {
    lfMap = new bemap.LeafletMap(ctx, 'map-lf')
      .defaultLayers({ styles: 'darkblue' })
      .move(startLon, startLat, startZoom);
    var mkLf = makeMarkers();
    lfMap.addMarker(mkLf[0]);
    lfMap.addMarker(mkLf[1]);
    postLog('Leaflet', 'ok', 'rendered with WMS styles=darkblue, 2 markers added');
  } catch (e) { postLog('Leaflet', 'err', e.message); }

  /* ============================================================
   * MapLibre — BeNomad Tiles vector charte + dark-blue paint overrides
   * ============================================================ */
  var mlMap;
  try {
    // Use the library default style (`ctx.tilesHost` is read inside,
    // PMTiles URL + JWT injection handled automatically).
    mlMap = new bemap.MapLibreMap(ctx, 'map-ml').move(startLon, startLat, startZoom);

    // Add the standard overlay vector layers manually — MapLibre's
    // defaultLayers() short-circuits when ctx.tilesHost is set, but the
    // overlay layers (marker / polyline / polygon / circle / route) need
    // to exist for addMarker() to attach.
    var overlayNames = ['marker', 'polyline', 'polygon', 'circle', 'route'];
    for (var i = 0; i < overlayNames.length; i++) {
      mlMap.addLayer(new bemap.VectorLayer({ name: overlayNames[i] }));
    }

    // Wait for the style to fully load, then re-paint with dark blue.
    function applyDarkBluePaint() {
      var native = mlMap.native;
      if (!native || !native.isStyleLoaded()) {
        setTimeout(applyDarkBluePaint, 100);
        return;
      }
      var style = native.getStyle();
      if (!style || !Array.isArray(style.layers)) return;

      // Override paint for any layer whose source-layer matches a known
      // category. Skips symbol/text layers — they keep their label colours.
      var overrides = {
        // background / land
        'background':       { 'background-color': '#0a1d3a' },
        // water
        'water':            { 'fill-color':       '#0e2a4a' },
        // landcover (forests, parks etc.)
        'landcover':        { 'fill-color':       '#16335a', 'fill-opacity': 0.9 },
        // roads — multiple road sub-layers
        'transportation':   { 'line-color':       '#3a72c2', 'line-opacity': 0.9 },
        'roads':            { 'line-color':       '#3a72c2', 'line-opacity': 0.9 },
        // boundaries
        'boundary':         { 'line-color':       '#7baee0' },
        'admin':            { 'line-color':       '#7baee0' }
      };

      for (var li = 0; li < style.layers.length; li++) {
        var l = style.layers[li];
        var sl = l['source-layer'] || '';
        var paint = overrides[sl];
        if (!paint && overrides[l.id]) paint = overrides[l.id];
        if (!paint) continue;
        for (var prop in paint) {
          try { native.setPaintProperty(l.id, prop, paint[prop]); } catch (e) {}
        }
      }
      // Also force-tint the background tile to dark blue regardless of layer name.
      try { native.setPaintProperty(style.layers[0].id, 'background-color', '#0a1d3a'); } catch (e) {}
      postLog('MapLibre', 'ok', 'dark-blue paint overrides applied to ' + style.layers.length + ' style layers');
    }
    setTimeout(applyDarkBluePaint, 50);

    // Add markers (works with non-replaced styles thanks to _overlayCatalog).
    var mkMl = makeMarkers();
    mlMap.addMarker(mkMl[0]);
    mlMap.addMarker(mkMl[1]);
  } catch (e) { postLog('MapLibre', 'err', e.message); }

  /* ----- ResizeObserver: keep all 3 canvases in sync with their containers ----- */
  function resizeAll() {
    try { if (mlMap && mlMap.native && mlMap.native.resize)         mlMap.native.resize(); } catch (e) {}
    try { if (lfMap && lfMap.native && lfMap.native.invalidateSize) lfMap.native.invalidateSize(); } catch (e) {}
    try { if (olMap && olMap.native && olMap.native.updateSize)     olMap.native.updateSize(); } catch (e) {}
  }
  requestAnimationFrame(function () { requestAnimationFrame(resizeAll); });
  setTimeout(resizeAll, 250);
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(resizeAll);
    ['map-ol', 'map-lf', 'map-ml'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) ro.observe(n);
    });
  }

  /* ----- Initial code panel snippet (canonical 3-engine recipe) ----- */
  postCode(
    "// Same Context, three engines, one dark-blue theme.\n\n" +
    "// OpenLayers + Leaflet — WMS server-side rendering\n" +
    "var olMap = new bemap.Ol3Map(ctx, 'map-ol').defaultLayers({ styles: 'darkblue' }).move(-50, 43.6, 3);\n" +
    "var lfMap = new bemap.LeafletMap(ctx, 'map-lf').defaultLayers({ styles: 'darkblue' }).move(-50, 43.6, 3);\n\n" +
    "// MapLibre — BeNomad Tiles vector charte + dark-blue paint overrides\n" +
    "var mlMap = new bemap.MapLibreMap(ctx, 'map-ml').move(-50, 43.6, 3);\n" +
    "mlMap.native.once('load', function () {\n" +
    "  var style = mlMap.native.getStyle();\n" +
    "  style.layers.forEach(function (l) {\n" +
    "    if (l['source-layer'] === 'water')  mlMap.native.setPaintProperty(l.id, 'fill-color', '#0e2a4a');\n" +
    "    if (l['source-layer'] === 'transportation') mlMap.native.setPaintProperty(l.id, 'line-color', '#3a72c2');\n" +
    "    // ... etc.\n" +
    "  });\n" +
    "});\n\n" +
    "// Same Marker code works on all three:\n" +
    "var marker = new bemap.Marker(new bemap.Coordinate(7.134, 43.636), { icon, id: 'fr', name: 'BeNomad France' });\n" +
    "olMap.addMarker(marker); lfMap.addMarker(marker); mlMap.addMarker(marker);"
  );
};
