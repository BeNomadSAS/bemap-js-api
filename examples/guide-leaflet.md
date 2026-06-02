# Leaflet v1.9 Guide

Leaflet is a lightweight, mobile-friendly map backend. It uses the same WMS tiles from the BeMap server.

---

## 1. Basic WMS Map

```
{"bemap":{"language":"javascript"}}
var ctx = new bemap.Context({
    "login": 'your-login',
    "password": 'your-password',
    "secure": true,
    "host": 'bemap-beta.benomad.com'
});

var map = new bemap.LeafletMap(ctx, 'map1', {
    zoomControl: true,
    minZoom: 2,
    maxZoom: 18,
    scrollWheelZoom: true,
    dragging: true,
    doubleClickZoom: true
}).defaultLayers().move(2.3412, 48.85693, 12);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `zoomControl` | boolean \| string | false | Show +/- zoom buttons (opt-in). `true` or a position string (`'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`) to enable |
| `minZoom` | number | — | Minimum zoom level |
| `maxZoom` | number | — | Maximum zoom level |
| `dragging` | boolean | true | Allow map panning |
| `scrollWheelZoom` | boolean | true | Zoom with mouse wheel |
| `doubleClickZoom` | boolean | true | Zoom on double-click |
| `touchZoom` | boolean | true | Pinch-to-zoom on mobile |
| `boxZoom` | boolean | true | Shift+drag to zoom area |
| `attributionControl` | boolean | true | Show attribution |

All [Leaflet map options](https://leafletjs.com/reference.html#map-option) are supported.

---

## 2. Satellite Layer

Same BemapLayer as OpenLayers — the WMS server handles the tiles:

```
{"bemap":{"language":"javascript"}}
map.addLayer(new bemap.BemapLayer({
    name: 'satellite',
    layers: 'here-satellite.day',
    geoserver: 'herehlp',
    maxZoom: 19
}));

// Toggle
map.getLayerByName('satellite').setVisible(false);
```

---

## 3. Dark Style

```
{"bemap":{"language":"javascript"}}
var map = new bemap.LeafletMap(ctx, 'map1').defaultLayers({
    styles: 'benomadGrayLevel'
}).move(2.3412, 48.85693, 12);
```

---

## 4. Markers, Polylines, and Polygons

The code is **identical** to OpenLayers — only the constructor changes:

```
{"bemap":{"language":"javascript"}}
var ctx = new bemap.Context({
    "login": 'your-login',
    "password": 'your-password',
    "secure": true,
    "host": 'bemap-beta.benomad.com'
});

var map = new bemap.LeafletMap(ctx, 'map1').defaultLayers().move(2.3412, 48.85693, 13);

// Marker (same code as OL)
var marker = new bemap.Marker(
    new bemap.Coordinate(2.3412, 48.85693), {
        icon: new bemap.Icon({
            src: 'images/map-marker-red.svg',
            anchorX: 0.5, anchorY: 1,
            anchorXUnits: 'fraction', anchorYUnits: 'fraction'
        })
    });
map.addMarker(marker);

// Marker click
map.onMarker(marker, bemap.Map.EventType.CLICK, function(evt) {
    console.log('Marker clicked at', evt.coordinate.getLon(), evt.coordinate.getLat());
});

// Polyline (same code as OL)
var polyline = new bemap.Polyline([
    new bemap.Coordinate(2.33, 48.86),
    new bemap.Coordinate(2.34, 48.855),
    new bemap.Coordinate(2.35, 48.86)
], {
    style: new bemap.LineStyle({ width: 4, color: new bemap.Color(0, 100, 255, 0.8) })
});
map.addPolyline(polyline);

// Polygon (same code as OL)
var polygon = new bemap.Polygon([
    new bemap.Coordinate(2.34, 48.855),
    new bemap.Coordinate(2.35, 48.855),
    new bemap.Coordinate(2.345, 48.86)
], {
    style: new bemap.PolygonStyle({
        fillColor: new bemap.Color(255, 0, 0, 0.2),
        borderColor: new bemap.Color(255, 0, 0, 0.8),
        borderWidth: 2
    })
});
map.addPolygon(polygon);

// Map click
map.on(bemap.Map.EventType.CLICK, function(evt) {
    console.log('Map clicked at', evt.coordinate.getLon(), evt.coordinate.getLat());
});
```

---

## Complete HTML

```
{"bemap":{"language":"xml"}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>BeMap — Leaflet v1.9</title>
    <link rel="stylesheet" href="../dist/leaflet.css" type="text/css">
    <script src="../dist/leaflet.js"></script>
    <script src="../dist/bemap-js-api.min.js"></script>
</head>
<body>
    <div id="map1" style="width:100%;height:100vh;"></div>
</body>
</html>
```
