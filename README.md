# BeMap JavaScript API

Putting geolocation at the core of your business.

BeMap JS API is a JavaScript SDK for [BeNomad](http://www.benomad.com/)'s mapping and geolocation platform. It provides a unified API that abstracts **OpenLayers** and **Leaflet** mapping backends, along with services for routing, geocoding, autocomplete, isochrone, and EV routing.

## Quick start

```javascript
// 1. Create a context
var ctx = new bemap.Context({
    "login": "<your account>",
    "password": "<your password>",
    "secure": true,
    "host": "bemap-beta.benomad.com"
});

// 2. Create a map (OpenLayers or Leaflet)
var map = new bemap.OlMap(ctx, "map-div").defaultLayers().move(2.35, 48.85, 12);

// 3. Add a marker
var marker = new bemap.Marker(new bemap.Coordinate(2.35, 48.85), {
    icon: new bemap.Icon({
        src: "marker.svg",
        anchorX: 0.5,
        anchorY: 1,
        anchorXUnits: "fraction",
        anchorYUnits: "fraction"
    })
});
map.addMarker(marker);
```

## Features

- **Map display** with OpenLayers (`bemap.OlMap`) or Leaflet (`bemap.LeafletMap`)
- **Markers** with custom icons, text labels, clustering, and drag support
- **Polylines, Polygons, Circles** with custom styling
- **Popups** with HTML content
- **Routing** with multi-stop, alternative routes, and route sheets
- **EV routing** with charging station integration
- **Isochrone** analysis (reachability zones)
- **Geocoding** and **reverse geocoding**
- **Address autocomplete**
- **WMS layers** with GetFeatureInfo support
- **Event system** for map and geometry interactions

## Installation

See [INSTALL.md](INSTALL.md) for setup instructions.

## Project structure

```
src/                   Source files (54 JS modules)
src-test/              Unit tests (Jasmine/Karma, 1004 specs)
dist/                  Built distribution files
examples/              Interactive examples and documentation
lib/                   Third-party libraries (installed via bower)
major_update/          Planning documents
```

## Running tests

```bash
npm install
bower install
grunt                  # Build dist files
grunt test             # Run all 1004 unit tests
```

## Examples

Start a local server and open the examples dashboard:

```bash
npx http-server -p 8080
# Open http://localhost:8080/examples/
```

## Version

2.0.0

## License

See [LICENSE.md](LICENSE.md)
