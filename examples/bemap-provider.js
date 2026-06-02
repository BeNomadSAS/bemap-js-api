/**
 * BeMap Provider Switcher
 * Reads the selected provider from localStorage and creates the right map.
 * Used by all examples to dynamically switch between OlMap, LeafletMap, and MapLibreMap.
 *
 * Usage in examples:
 *   var map = bemap.createMap(bemapMainCtx, 'map1', options);
 */

// MapLibre default style: nothing forced. When ctx.tilesHost is set
// (the normal case for examples that load context.js), the library uses
// the bundled BeNomad gray-level style and authenticates pmtiles range
// requests automatically. When ctx.tilesHost is NOT set, the library
// falls back to an empty background — explicit opt-in style only.

/**
 * Apply the dashboard's sidebar selections (geoserver + charging-station
 * provider, both stored in localStorage) onto a Context instance. Used
 * by createMap() AND called at module load so service-only demos that
 * never call createMap still see the user's pick.
 */
bemap._applySidebarSelections = function(context) {
  if (!context) return;
  var savedGeoserver = localStorage.getItem('bemap-geoserver');
  if (savedGeoserver && context.geoserver !== savedGeoserver) {
    context.geoserver = savedGeoserver;
  }
  var savedCsp = localStorage.getItem('bemap-csp');
  if (savedCsp && context.chargingStationProvider !== savedCsp) {
    context.chargingStationProvider = savedCsp;
  }
};

// Apply to the shared Context right away — every demo loads context.js
// (which creates bemapMainCtx) BEFORE this file, so by the time the demo's
// own script runs, bemapMainCtx already carries the user's sidebar choices.
if (typeof bemapMainCtx !== 'undefined') {
  bemap._applySidebarSelections(bemapMainCtx);
}

bemap.createMap = function(context, target, options) {
  var provider = localStorage.getItem('bemap-provider') || 'openlayers';
  var opts = options || {};

  // Re-apply in case the demo built its own Context.
  bemap._applySidebarSelections(context);

  // Wire the attribution widget to the example notices file at the repo root.
  // Customer apps would point this at their own hosted copy.
  if (opts.attribution !== false) {
    if (typeof opts.attribution !== 'object' || opts.attribution === null) {
      opts.attribution = {};
    }
    if (!opts.attribution.noticesUrl) {
      opts.attribution.noticesUrl = '../OPEN_SOURCE_NOTICES.md';
    }
  }

  if (provider === 'maplibre') {
    if (typeof maplibregl === 'undefined') {
      console.warn('MapLibre GL JS not loaded, falling back to OpenLayers');
      return new bemap.OlMap(context, target, opts);
    }
    // No opts.style here — the library uses bemap.defaultStyle (BeNomad
    // gray-level) when ctx.tilesHost is set. Customers wanting a custom
    // visual pass their own opts.style; that takes precedence per spec
    // §3.6 precedence table.
    return new bemap.MapLibreMap(context, target, opts);

  } else if (provider === 'leaflet') {
    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded, falling back to OpenLayers');
      return new bemap.OlMap(context, target, opts);
    }
    return new bemap.LeafletMap(context, target, opts);

  } else {
    return new bemap.OlMap(context, target, opts);
  }
};

/**
 * Get current provider name.
 */
bemap.getProvider = function() {
  return localStorage.getItem('bemap-provider') || 'openlayers';
};
