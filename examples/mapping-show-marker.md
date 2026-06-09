# Draw marker on map

One of the most common use cases for a mapping application is to show points of interest (POIs) on the map. The BeMap API for JavaScript makes the implementation very easy by allowing you to represent POIs as markers.

_Table 1. Marker types in BeMap API for JavaScript_

Marker type | Class        | Description
----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------
Marker      | bemap.Marker | A "normal" marker that uses a static image as an icon. Large numbers of markers of this type can be added to the map very quickly and efficiently.

A marker consists of a geographical point (latitude/longitude) and a visual representation (an icon). Marker icons are rendered in screen-space, so their size stays constant regardless of zoom level.

The marker code is **engine-agnostic** — `new bemap.Marker(...)` and `map.addMarker(marker)` are the same on every engine. Only the map constructor changes.

---

## The canonical Context

```
{"bemap":{"language":"javascript"}}
var ctx = new bemap.Context({
    "login":    'your-bemap-login',
    "password": 'your-bemap-password',
    "secure":   true,
    "host":     'bemap.benomad.com',
    "authInPost": false,
    "geoserver":  'default',
    // BeNomad Tiles v2.0 — MapLibre uses it, Leaflet / OL ignore it.
    "tilesHost":  'mptiles-api-beta.benomad.net'
});
```

> Never commit production credentials. The runnable demos below use the dashboard-loaded `bemapMainCtx` from `examples/context.js`.

---

## MapLibre (BeNomad Tiles)

The library reads `tilesHost` from the Context and loads the bundled BeNomad gray-level style — no inline style block needed.

```
{"bemap":{"language":"javascript","mapid":"map-ml","run":true}}
var map = new bemap.MapLibreMap(bemapMainCtx, 'map-ml', {
    pitch:   0,
    maxZoom: 22
}).move(2.3412, 48.85693, 15);

var marker = new bemap.Marker(
    new bemap.Coordinate(2.3412, 48.85693), {
        icon: new bemap.Icon({
            src:          'images/map-marker-red.svg',
            anchorX:      0.25,
            anchorY:      1,
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
        })
    });

map.addMarker(marker);
```

---

## Leaflet (BeMap WMS)

```
{"bemap":{"language":"javascript","mapid":"map-lf","run":true}}
var map = new bemap.LeafletMap(bemapMainCtx, 'map-lf', {
    zoomControl:     true,
    scrollWheelZoom: true
}).defaultLayers().move(2.3412, 48.85693, 15);

var marker = new bemap.Marker(
    new bemap.Coordinate(2.3412, 48.85693), {
        icon: new bemap.Icon({
            src: 'images/map-marker-red.svg',
            anchorX: 0.25, anchorY: 1,
            anchorXUnits: 'fraction', anchorYUnits: 'fraction'
        })
    });

map.addMarker(marker);
```

---

## OpenLayers (BeMap WMS)

```
{"bemap":{"language":"javascript","mapid":"map-ol","run":true}}
var map = new bemap.Ol3Map(bemapMainCtx, 'map-ol', {
    minZoom:        3,
    maxZoom:        20,
    enableRotation: true
}).defaultLayers().move(2.3412, 48.85693, 15);

var marker = new bemap.Marker(
    new bemap.Coordinate(2.3412, 48.85693), {
        icon: new bemap.Icon({
            src: 'images/map-marker-red.svg',
            anchorX: 0.25, anchorY: 1,
            anchorXUnits: 'fraction', anchorYUnits: 'fraction'
        })
    });

map.addMarker(marker);
```

---

Same Context object works on every engine — only the constructor class differs.
