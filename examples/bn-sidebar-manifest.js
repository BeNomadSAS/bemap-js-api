/* ============================================================
 * bn-sidebar-manifest.js — single source of truth for the
 * left-sidebar tree of the BeMap 2026 dashboard.
 *
 * Five top-level sections; only "Get started" open on first visit.
 *
 * Leaf shape:
 *   { label, href, chips: [{label,kind}], target?, requiresService?, adminOnly? }
 *
 * Chip kinds: ol | lf | ml | brand | accent | ok | warn | info
 * Engine chips are added ONLY when the demo is engine-specific.
 *
 * Rendered by bn.sidebar.render(rootEl, bnSidebarManifest) in bn-2026.js.
 * ============================================================ */

var bnSidebarManifest = [
  {
    label: 'Get started',
    children: [
      { label: 'Dashboard home',              href: '#'                                       },
      { label: 'Quick start',                 href: '#page-quick-start.md',                   chips: [{label:'DOC'}] },
      { label: 'Browser cache (SW)',          href: '#page-../docs/browser-cache.md',         chips: [{label:'DOC'},{label:'NEW',kind:'accent'}] },
      { label: 'Migration WMS → Tiles',       href: '#page-../docs/migration-wms-to-tiles.md',chips: [{label:'DOC'}] },
      { label: 'BeNomad Tiles (live demo)',   href: '#nav-example-bemap-tiles.html',          chips: [{label:'ML',kind:'ml'},{label:'NEW',kind:'accent'}] }
    ]
  },

  {
    label: 'Examples',
    children: [
      { label: 'Basic map',                          href: '#nav-example-00.html' },
      { label: 'Markers & popups',                   href: '#nav-example-01.html' },
      { label: 'Text labels on markers',             href: '#nav-example-03.html' },
      { label: 'Click coordinates',                  href: '#nav-example-07.html' },
      { label: 'Event handling (drag, click)',       href: '#nav-example-02.html' },
      { label: 'Polylines',                          href: '#nav-example-01.html' },
      { label: 'Polygons',                           href: '#nav-example-04.html' },
      { label: 'Draggable shapes',                   href: '#nav-example-05.html' },
      { label: 'Drawing — polygon / line',           href: '#nav-example-draw.html' },
      { label: 'Clustering (Leaflet — with shapes)', href: '#nav-example-leaflet-00.html',           chips: [{label:'LF',kind:'lf'}] },
      { label: 'Clustering (MapLibre)',              href: '#nav-example-maplibre-clustering.html',  chips: [{label:'ML',kind:'ml'}] },
      { label: 'Heatmap',                            href: '#nav-example-maplibre-heatmap.html',     chips: [{label:'ML',kind:'ml'}] },
      { label: 'Route animation',                    href: '#nav-example-maplibre-animation.html',   chips: [{label:'ML',kind:'ml'}] },
      { label: 'Route + slider (bfleet-style)',      href: '#nav-example-maplibre-route-slider.html',chips: [{label:'ML',kind:'ml'},{label:'PERF',kind:'accent'}] },
      { label: 'Route stress test (real bfleet data)',href: '#nav-example-maplibre-route-stress.html',chips: [{label:'ML',kind:'ml'},{label:'STRESS',kind:'accent'}] },
      { label: 'Satellite raster overlay',           href: '#nav-example-maplibre-satellite.html',   chips: [{label:'ML',kind:'ml'}] },
      { label: '3D & Globe',                         href: '#nav-example-maplibre-3d.html',          chips: [{label:'ML',kind:'ml'}] },
      { label: 'Style — dark blue',                  href: '#nav-example-mapping-style-dark_blue.html' },
      { label: 'Style — custom JSON',                href: '#nav-example-maplibre-custom-style.html',chips: [{label:'ML',kind:'ml'},{label:'NEW',kind:'accent'}] },
      { label: 'BeNomad Tiles default',              href: '#nav-example-bemap-tiles.html',          chips: [{label:'ML',kind:'ml'},{label:'NEW',kind:'accent'}] },
      { label: 'Browser cache',                      href: '#nav-example-browser-cache.html',        chips: [{label:'ML',kind:'ml'},{label:'NEW',kind:'accent'}] },
      { label: 'Live usage stats',                   href: '#nav-example-usage-stats.html',          chips: [{label:'ML',kind:'ml'},{label:'NEW',kind:'accent'}] },
      { label: 'Attribution widget',                 href: '#nav-example-attribution-widget.html',   chips: [{label:'NEW',kind:'accent'}] },
      { label: 'Migration WMS → Tiles (live)',       href: '#nav-example-migration-side-by-side.html', chips: [{label:'LF',kind:'lf'},{label:'ML',kind:'ml'},{label:'NEW',kind:'accent'}] },
      { label: 'Function Showcase (3 engines)',      href: '#nav-functions.html' },
      { label: '3-engine benchmark (WMS vs PMTiles)',href: '#nav-example-maplibre-wms-vs-pmtiles-benchmark.html', chips: [{label:'OL',kind:'ol'},{label:'LF',kind:'lf'},{label:'ML',kind:'ml'},{label:'PERF',kind:'accent'}] },
      { label: 'Container resize & refresh()',       href: '#nav-example-container-resize.html', chips: [{label:'OL',kind:'ol'},{label:'LF',kind:'lf'},{label:'ML',kind:'ml'},{label:'NEW',kind:'accent'}] }
    ]
  },

  {
    label: 'Services',
    children: [
      { label: 'Geocoding', children: [
        { label: 'Geocoder',                  href: '#nav-services-v2/geocoder.html',          chips: [{label:'v2',kind:'brand'}], requiresService: 'Geocoding' },
        { label: 'Reverse Geocoder',          href: '#nav-services-v2/reverse-geocoder.html',  chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'ReverseGeocoding' },
        { label: 'Autocomplete',              href: '#nav-services-v2/autocomplete.html',      chips: [{label:'v2',kind:'brand'}], requiresService: 'AutocompleteGeocoding' },
        { label: 'GeoAutocomplete',           href: '#nav-services-v2/geo-autocomplete.html',  chips: [{label:'v2',kind:'brand'}], requiresService: 'AutocompleteGeocoding' },
        { label: 'Geocoding (v1)',            href: '#nav-geocoding/geocoding.html',           chips: [{label:'v1',kind:'info'}], requiresService: 'Geocoding' },
        { label: 'Autocomplete (v1)',         href: '#nav-autocomplete/autocomplete.html',     chips: [{label:'v1',kind:'info'}], requiresService: 'AutocompleteGeocoding' },
        { label: 'GeoAutocomplete (v1)',      href: '#nav-geoAutocomplete/autocomplete.html',  chips: [{label:'v1',kind:'info'}], requiresService: 'AutocompleteGeocoding' }
      ]},
      { label: 'Routing', children: [
        { label: 'Routing',                   href: '#nav-services-v2/routing.html',           chips: [{label:'v2',kind:'brand'}], requiresService: 'Routing' },
        { label: 'Isochrone',                 href: '#nav-services-v2/routing-isochrone.html', chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'Isochrone' },
        { label: 'TraceRoute',                href: '#nav-services-v2/traceroute.html',        chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'TraceRoute' }
      ]},
      { label: 'POI', children: [
        { label: 'Near POI',                  href: '#nav-services-v2/near-poi.html',          chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'POI' }
      ]},
      { label: 'EV', children: [
        { label: 'Charging Stations',         href: '#nav-services-v2/charging-stations.html', chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'ChargingStations' },
        { label: 'EV Smart Routing',          href: '#nav-services-v2/ev-smart-routing.html',  chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'EvSmartRouting' },
        { label: 'EV Vehicles',               href: '#nav-services-v2/ev-vehicles.html',       chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'EvVehicles' },
        { label: 'Charging Time',             href: '#nav-services-v2/charging-time.html',     chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'ChargingTime' },
        { label: 'EV Reachable Area',         href: '#nav-services-v2/ev-reachable-area.html', chips: [{label:'v2',kind:'brand'},{label:'NEW',kind:'accent'}], requiresService: 'EvReachableArea' }
      ]}
    ]
  },

  {
    label: 'Functions',
    children: (function () {
      // 52 methods grouped by 15 categories — sourced from `functions.js`
      // CATEGORIES const. Clicking a leaf navigates to functions.html and
      // triggers FUNCS[<name>]() in the embedded iframe. URL-encoded because
      // some names contain parentheses (e.g. on(CLICK)).
      //
      // An entry can be a plain string (inherits the category-level chips)
      // OR an object { name, chips } that overrides the chips per-method —
      // used for methods that are engine-restricted differently than their
      // category default (e.g. addRasterLayer is ML-only inside Layer).
      var ML_CHIP = [{label:'ML',kind:'ml'}];
      var OL_LF_CHIPS = [{label:'OL',kind:'ol'},{label:'LF',kind:'lf'}];

      var CATS = {
        'Layer': [
          'addLayer','removeLayer','getLayerByName','visibleLayer','clearLayer',
          { name:'zIndexLayer',    chips: OL_LF_CHIPS },   // works on OL + Leaflet; ML markers-vs-canvas limited
          'refreshLayer','defaultLayers',
          { name:'addRasterLayer', chips: ML_CHIP    }    // MapLibre-only (_maplibreOnly stub on base)
        ],
        'Camera': [
          'move','flyTo','zoom','getZoom','getCenter','getBoundingBox',
          'getRotation',
          'moveToBoundingBox',
          { name:'moveToLayerData',  chips: [{label:'OL',kind:'ol'},{label:'ML',kind:'ml'}] }, // Leaflet has no override
          'rotation',                                                                          // works on all 3 (Leaflet via CSS transform — visual only)
          'refresh'
        ],
        'Camera 3D (ML)':   ['jumpTo','easeTo','setPitch','getPitch','setBearing','getBearing','setProjection'],
        // Geometry, interactions, clustering — was 8 flat subgroups (Markers,
        // Polylines, Polygons, Circles, Popups, Events, Drag, Clustering)
        // each holding 1–3 leaves. Flattened into one "Geometry &
        // interactions" subsection so users scan one list instead of toggling
        // 8 single-method subsections.
        'Geometry & interactions': [
          'addMarker','addPolyline','addPolygon','addCircle','addPopup',
          'on(CLICK)','onMarker',
          'draggableMarker','draggablePolyline','isDragPan',
          'addClusterPoints'
        ],
        'Style (ML)':       ['setStyle','setTerrain','setSky','setLight'],
        'Sources (ML)':     ['addGeoJsonSource','addImage','queryRenderedFeatures','add3DBuildings'],
        'Advanced (ML)':    ['addHeatmap'],
        'Animations (ML)':  ['animateAlongRoute','animateLine','animateCameraOrbit','animatePulse','spinGlobe']
      };
      var groups = [];
      for (var cat in CATS) {
        var isML = cat.indexOf('ML') !== -1;
        var leaves = [];
        for (var i = 0; i < CATS[cat].length; i++) {
          var entry = CATS[cat][i];
          var isObj = (typeof entry === 'object' && entry !== null);
          var name  = isObj ? entry.name  : entry;
          var leaf = {
            label: name,
            href:  '#nav-functions.html?fn=' + encodeURIComponent(name)
          };
          if (isObj && entry.chips) leaf.chips = entry.chips;
          else if (isML)            leaf.chips = ML_CHIP;
          leaves.push(leaf);
        }
        groups.push({ label: cat, children: leaves });
      }
      return groups;
    })()
  },

  {
    label: 'Documentation',
    children: [
      { label: 'Overview',                    href: '#page-index.md',                  chips: [{label:'DOC'}] },
      { label: 'Quick start',                 href: '#page-quick-start.md',            chips: [{label:'DOC'}] },
      { label: 'Display a map',               href: '#page-mapping-display-map.md',    chips: [{label:'DOC'}] },
      { label: 'Show markers',                href: '#page-mapping-show-marker.md',    chips: [{label:'DOC'}] },
      { label: 'OpenLayers guide',            href: '#page-guide-openlayers.md',       chips: [{label:'DOC'}] },
      { label: 'Leaflet guide',               href: '#page-guide-leaflet.md',          chips: [{label:'DOC'}] },
      { label: 'MapLibre guide',              href: '#page-guide-maplibre.md',         chips: [{label:'DOC'}] },
      { label: 'API reference (JSDoc)',       href: '../dist/doc/index.html', target: '_blank', chips: [{label:'API',kind:'brand'}] }
    ]
  }
];
