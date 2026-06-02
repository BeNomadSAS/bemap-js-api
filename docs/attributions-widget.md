# Attribution widget

`bemap.AttributionWidget` ships built-in on every engine. It replaces the
engine-native attribution control with a unified ⓘ icon that expands into
a popover.

## What it shows

- Library line — `BeMap JS API v2.0.0 © BeNomad`
- Active engine line — `MapLibre GL JS v5` / `Leaflet 1.9` / `OpenLayers 10`
- Active data source attribution:
  - WMS: `© BeNomad WMS`
  - BeNomad Tiles: `© BeNomad · © OpenStreetMap contributors`
- Any per-layer `getAttribution()` value
- Custom lines you pass via constructor options

## Defaults

```js
var map = new bemap.MapLibreMap(ctx, 'map');
// → widget appears bottom-right with the default lines
```

## Customise

```js
var map = new bemap.MapLibreMap(ctx, 'map', {
  attribution: {
    position: 'bottom-left',
    customLines: [
      '© ACME Logistics 2026',
      'Powered by BeNomad'
    ]
  }
});
```

The widget exposes runtime methods on the instance:

```js
map._attributionWidget.setPosition('top-right');
map._attributionWidget.setCustomLines(['© ACME 2026']);
map._attributionWidget.hide();
map._attributionWidget.show();
map._attributionWidget.refresh();
```

## Disable

Pass `attribution: false` to skip the widget altogether (you must then
provide your own attribution to satisfy the OpenStreetMap, MapLibre,
Leaflet, and OpenLayers attribution requirements):

```js
var map = new bemap.MapLibreMap(ctx, 'map', { attribution: false });
```

## Licence obligations

The widget is the library's way of meeting attribution clauses from:

- **OpenStreetMap** — when serving OSM-derived vector tiles (`OSM_*.pmtiles`).
- **MapLibre GL JS** — BSD-3-Clause; non-endorsement clause forbids
  "Powered by MapLibre" marketing claims (see `OPEN_SOURCE_NOTICES.txt`).
- **Leaflet** — BSD-2-Clause.
- **OpenLayers** — BSD-2-Clause.
- **pmtiles** — BSD-3-Clause.

Hiding the widget without supplying equivalent attribution would violate
those licences. If your app already shows the necessary lines in a custom
UI, disable the widget and document the location.
