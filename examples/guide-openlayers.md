# OpenLayers v10 Guide

OpenLayers is the default and most mature backend. It uses WMS tiles from the BeMap server.

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

var map = new bemap.OlMap(ctx, 'map1', {
    minZoom: 3,
    maxZoom: 18,
    enableRotation: false
}).defaultLayers().move(2.3412, 48.85693, 12);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `zoom` | number | 3 | Initial zoom level |
| `minZoom` | number | 3 | Minimum zoom level |
| `maxZoom` | number | 20 | Maximum zoom level |
| `enableRotation` | boolean | false | Allow map rotation |
| `constrainRotation` | boolean | true | Snap rotation to north |

---

## 2. Satellite Layer

Add a satellite background from HERE via the BeMap WMS server:

```
{"bemap":{"language":"javascript"}}
// Add satellite layer (hidden by default)
map.addLayer(new bemap.BemapLayer({
    name: 'satellite',
    layers: 'here-satellite.day',
    geoserver: 'herehlp',
    maxZoom: 19
}));

// Hide it initially
map.getLayerByName('satellite').setVisible(false);

// Toggle satellite on/off
function toggleSatellite(show) {
    map.getLayerByName('satellite').setVisible(show);
    map.getLayerByName('background').setVisible(!show);
}
```

---

## 3. Multiple Backgrounds

Switch between different map styles (geoservers):

```
{"bemap":{"language":"javascript"}}
var map = new bemap.OlMap(ctx, 'map1').move(2.3412, 48.85693, 12);

// Add multiple background layers
map.backgroundLayers(['osm', 'here', 'herehlp'], { styles: '' });

// Switch to HERE
map.switchBackgroundLayer('here');

// Switch to OSM
map.switchBackgroundLayer('osm');
```

---

## 4. Dark Style

Use the BeNomad dark gray level theme:

```
{"bemap":{"language":"javascript"}}
var map = new bemap.OlMap(ctx, 'map1').defaultLayers({
    styles: 'benomadGrayLevel'
}).move(2.3412, 48.85693, 12);
```

---

## 5. Markers, Polylines, and Polygons

```
{"bemap":{"language":"javascript"}}
var ctx = new bemap.Context({
    "login": 'your-login',
    "password": 'your-password',
    "secure": true,
    "host": 'bemap-beta.benomad.com'
});

var map = new bemap.OlMap(ctx, 'map1').defaultLayers().move(2.3412, 48.85693, 13);

// Marker
var marker = new bemap.Marker(
    new bemap.Coordinate(2.3412, 48.85693), {
        icon: new bemap.Icon({
            src: 'images/map-marker-red.svg',
            anchorX: 0.5, anchorY: 1,
            anchorXUnits: 'fraction', anchorYUnits: 'fraction'
        })
    });
map.addMarker(marker);

// Marker click event
map.onMarker(marker, bemap.Map.EventType.CLICK, function(evt) {
    console.log('Marker clicked at', evt.coordinate.getLon(), evt.coordinate.getLat());
});

// Polyline
var polyline = new bemap.Polyline([
    new bemap.Coordinate(2.33, 48.86),
    new bemap.Coordinate(2.34, 48.855),
    new bemap.Coordinate(2.35, 48.86)
], {
    style: new bemap.LineStyle({ width: 4, color: new bemap.Color(0, 100, 255, 0.8) })
});
map.addPolyline(polyline);

// Polygon
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

// Map click event
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
    <title>BeMap — OpenLayers v10</title>
    <link rel="stylesheet" href="../dist/ol.css" type="text/css">
    <script src="../dist/ol.js"></script>
    <script src="../dist/bemap-js-api.min.js"></script>
</head>
<body>
    <div id="map1" style="width:100%;height:100vh;"></div>
</body>
</html>
```
