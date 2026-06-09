# BeMap JS API — v1.5 Service Reference

Every v1.5 service in `bemap-js-api` is a **pure HTTP mapper** modelled on
the BeMap Flutter SDK. The classes never touch the map, never add markers,
never add icons. The final developer constructs a typed request, calls the
service method, gets back a typed Promise, and renders the response
however they like.

This page documents every service end-to-end: class, methods, every
request field with type / default / units, every response field, every
enum constant. Cross-checked against the BeMap server source
(`bemap_idea/.../service/v1_0_0/`) and the Flutter SDK
(`bemap-flutter-api/lib/service/`).

> **Wrapper pattern.** Each service is a thin wrapper around one HTTP
> endpoint. No state, no UI. The same `bemap.Context` you pass to a map
> constructor drives auth — nothing else.

---

## Common patterns

### Constructing a service

```js
var ctx = new bemap.Context({
    login: 'your-login', password: 'your-password',
    host: 'bemap-beta.benomad.com', secure: true,
    geoserver: 'osm'
});

var routing = new bemap.RoutingV2(ctx);
var trace   = new bemap.TraceRoute(ctx);
var nearPoi = new bemap.NearPoiSearch(ctx);
var rev     = new bemap.ReverseGeocoder(ctx);

// Forward Geocoder / Autocomplete / GeoAutocomplete are augmented onto
// the existing v1 classes (instantiate as before):
var geo  = new bemap.Geocoder(ctx);
var ac   = new bemap.Autocomplete(ctx);
var ga   = new bemap.GeoAutocomplete(ctx);
```

### Cancellation

Every service that does long calls (Routing, TraceRoute) accepts a
`requestId` and exposes `.cancel(id)`. External `AbortSignal` works too
via `options.signal`.

```js
var req = new bemap.RoutingRequest({ /* ... */, requestId: 'my-trip-1' });
var promise = routing.calculate(req);
// later:
routing.cancel('my-trip-1');  // aborts the in-flight HTTP request
```

### Error handling

Every rejection is a `bemap.Error` with a typed `code`:

```js
routing.calculate(req).catch(function(err) {
    switch (err.getCode()) {
        case bemap.Error.UNAUTHORIZED:    /* 401 */ break;
        case bemap.Error.FORBIDDEN:       /* 403 */ break;
        case bemap.Error.RATE_LIMITED:    /* 429 */ break;
        case bemap.Error.ABORTED:         /* request was cancelled */ break;
        case bemap.Error.ROUTING_NO_ROUTE:/* no route between points */ break;
        case bemap.Error.ROUTING_FAILED:  /* malformed request, etc. */ break;
        case bemap.Error.NETWORK:         /* anything else */ break;
    }
});
```

### Event hooks

Every v2 service emits `request` / `response` / `error` events (inherited
from `bemap.ServiceV2`):

```js
routing.on('request',  function(p) { /* p = { method, url, headers, body } */ });
routing.on('response', function(p) { /* p = { method, url, status } */ });
routing.on('error',    function(err) { /* err = bemap.Error */ });
```

---

# 1. `bemap.RoutingV2`

Promise-based router covering point-to-point, matrix, and isochrone
calculations. Endpoint `POST service/routing/1.0`.

## Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `calculate(request, options?)` | `Promise<bemap.RoutingResponse>` | Generic entry point — `request.routingMode` discriminates. |
| `matrix(originList, destinationList, options?)` | `Promise<bemap.RoutingResponse>` | Builds a `MODE_MATRIX` request internally. |
| `isochrone(origin, criterion, options?)` | `Promise<bemap.RoutingResponse>` | Builds a `MODE_ISOCHRONE` request internally. |
| `cancel(requestId)` | `Boolean` | Aborts the in-flight request bound to that `requestId`. |

## `bemap.RoutingRequest` — fields

Server-authoritative wire shape. Required fields marked **R**.

| Field | Type | Default | Unit / Notes |
| --- | --- | --- | --- |
| `destinations` **R** | Array of `RoutingDestination` / `Coordinate` / `CoordinateSat` / `{lon,lat,...}` | `[]` | First = start, last = end, between = vias. Bare coordinates auto-promoted. |
| `routingCriterias` **R** | Array of `bemap.RoutingCriteria.*` | `[FASTEST]` | One optimisation + any number of AVOID flags. |
| `options` **R** | Array of `bemap.RoutingOptions.*` | `[POLYLINE]` | See full enum below. |
| `outputLanguage` **R** | String (ISO 639-1) | `'en'` | Drives ROUTESHEET / REVGEO_POSTAL_ADDRESS language. |
| `routingMode` | One of `bemap.RoutingMode.*` | `MODE_VIAS` | |
| `routingVehicleProfile` | `bemap.RoutingVehicleProfile` | `null` | Vehicle class, weight, fuel, etc. |
| `preferredRoads` | Array of objects | `null` | Speed coefficients per road attribute. |
| `routingRoadBlocks` | Array of objects | `null` | Forbidden segments. |
| `avoidCountryCodes` | Array of ISO-3166 alpha-3 strings | `null` | E.g. `['FRA', 'DEU']`. |
| `xyRadius` | Number | `null` | Maximum snap radius in metres. |
| `departureTime` | Date / number (epoch ms) / ISO string | `null` | Auto-converted to epoch ms on the wire. |
| `isoChroneLimit` | Number | `null` | Required for `MODE_ISOCHRONE`. Seconds when FASTEST, metres when SHORTEST, Wh when ECO_ENERGY. |
| `corridorRadius` | Number (metres) | `null` | Half-width of the corridor polygon. |
| `fenceShapes` | Array of geofence shapes | `null` | Intersection-test against the route. |
| `maxAlternativeRoutes` | Number (0..2) | `null` | |
| `routingChargeFeature` | Object | `null` | EV charging passthrough. |
| `matrixStartCount` | Number | `null` | First N points act as origins in matrix mode. |
| `customData` | Array of `{key, value}` | `null` | Round-trips to response. |
| `geoserver` | String | from Context | Override per-call. |
| `switchIndex` | Number | `null` | Geoserver switch index. |
| `requestId` | String | `null` | Client-side id; enables `.cancel()`. Appended as `?id=` on the URL. |

## `bemap.RoutingResponse` — fields

| Accessor | Returns | Notes |
| --- | --- | --- |
| `getRoutes()` | Array of `bemap.RoutingRoute` | Empty for `MODE_MATRIX` / `MODE_ISOCHRONE`. |
| `getFirstRoute()` | `bemap.RoutingRoute` or `null` | Convenience. |
| `getMatrix()` | Object | Present for `MODE_MATRIX`. Raw server JSON. |
| `getIsochrone()` | Object | Present for `MODE_ISOCHRONE`. Raw server JSON. |
| `getRequestId()` | String | Echoed back when set on the request. |
| `getWarnings()` | Array of String | Server-side soft warnings. |

`bemap.RoutingRoute` exposes: `getSummary()`, `getPolyline()` (encoded
polyline string, precision 5), `getWaypoints()` (Array of
`RoutingWaypoint`), `getInstructions()` (Array of `RoutingInstruction`),
`getBoundingBox()`, `getExtra()` (any server fields not modelled here —
events, off-roads, toll breakdown, ...).

`bemap.RoutingSummary` exposes: `getDistanceM()` (metres),
`getDurationS()` (seconds), `getDurationInTrafficS()`, `getEnergy()`
(Wh for EV, otherwise null), `getEnergyUnit()`, `getTollCost()`,
`getTollCurrency()`, `getTaxCost()`, `getTaxCurrency()`, `getEta()`.

## `bemap.RoutingMode` (enum, 6 values)

| Value | Meaning |
| --- | --- |
| `MODE_VIAS` | Default. One A→B route with optional intermediate vias. |
| `MODE_1_TO_N` | One origin, many destinations — N routes. |
| `MODE_N_TO_1` | Many origins, one destination — N routes. |
| `MODE_N_TO_N` | n² pairwise routes. |
| `MODE_MATRIX` | n×p duration/distance matrix, no polyline. |
| `MODE_ISOCHRONE` | Reachable-area polygon. |

## `bemap.RoutingCriteria` (enum, 10 values)

Optimisation: `FASTER`, `FASTEST` (default), `SHORTEST`, `ECO_ENERGY`.
Avoidance: `AVOID_FERRIES`, `AVOID_MOTORWAYS`, `AVOID_TOLLS`,
`AVOID_UNPAVED`, `AVOID_CROSSING_BORDER`, `CARPOOL`.

## `bemap.RoutingOptions` (enum, server-canonical)

Categorised below for readability. The `options` array is sent to the server
**verbatim** (no client-side whitelist), so any backend option works as a plain
string even before it has a named constant; an unknown value triggers a 400
with the canonical accepted list.

**Used-destinations / waypoints**
`USED_DESTINATIONS_OFF`, `WAYPOINTS`, `MINIMAL_WAYPOINTS`, `NO_MINIMAL_WAYPOINTS`, `WAYPOINTS_POLYLINE`

**Route sheet**
`ROUTESHEET`, `ROUTESHEET_VERBOSE_LOW`, `ROUTESHEET_VERBOSE_MEDIUM`,
`ROUTESHEET_VERBOSE_HIGH`

**Geometry**
`POLYLINE`, `DETAILED_POLYLINE`, `POLYLINE_INDEX`, `OPENLR`, `SEGMENTIDS`,
`ROAD_SEGMENTS`, `JUNCTION_NODES`, `OFFROADS`, `OFFROADS_RAWDATA`,
`FENCE_SHAPE`

**Costs**
`ENERGY_CONSUMPTION`, `TOLL_COST`, `TAX_COST`, `ECO_TAX`

**Reverse geocoding at waypoints**
`REVGEO_POSTAL_ADDRESS`, `REVGEO_STRICT_DISABLE`

**Trip optimisation (TSP-style waypoint reordering)**
`OPTIMIZED_TRIP`, `OPTIMIZED_TRIP_CLOSE`, `OPTIMIZED_TRIP_ROUND`,
`OPTIMIZED_TRIP_UNDEFSTOP`, `OPTIMIZED_ROUTE_FOR_CHARGING_STATION`

**Isochrone / matrix / map-matching**
`ISOCHRONE_FORWARD`, `ISOCHRONE_BACKWARD`, `MATRIX_COMPLEMENT`,
`MATRIX_FOR_ROUND_OPTIM`, `MAPMATCH_AVOID_BRIDGE`, `MAPMATCH_AVOID_TUNNEL`

**Traffic**
`TRAFFIC`, `TRAFFIC_PATTERNS`, `TRAFFIC_PREDICTIVE`

**Start/stop info & result ordering**
`STARTSTOPINFO_WITHVIA`, `SORTBY_USED_ORDER`

**Event stream (per-edge metadata)**
`EVENT`, `EVT_DUPLICATE_FILTER`, `EVT_ENTRY_VALUE_AS_OBJECT`,
`EVT_ROAD_FEATURE`, `EVT_PROHIBITED_DRIVING`, `EVT_ELEVATION`,
`EVT_ELEVATION2`, `EVT_OBJECTID_BASE64`, `EVT_SEGMENT_INFO`,
`EVT_GEOELEMENT_TYPE`, `EVT_POLYLINE`, `EVT_ENCODED_POLYLINE`,
`EVT_LENGTH`, `EVT_DURATION`, `EVT_ENERGY_CONSUMPTION`,
`EVT_ENERGY_CONSUMPTION_SAMPLE`, `EVT_CHARGING_STATION`,
`EVT_CHARGING_STATION_DYNAMIC`, `EVT_TOLL_COST`, `EVT_TAX_COST`,
`EVT_TRAFFIC`, `EVT_TRAFFIC_PREDICTIVE`, `EVT_TRAFFIC_HISTORICAL`,
`EVT_ROUTESHEET`, `EVT_TRAFFIC_SIGNS`, `EVT_WAYPOINTS`

## Example — minimal A→B

```js
var req = new bemap.RoutingRequest({
    destinations: [
        new bemap.Coordinate(2.35, 48.85),
        new bemap.Coordinate(4.83, 45.76)
    ],
    routingCriterias: [bemap.RoutingCriteria.FASTEST],
    options: [bemap.RoutingOptions.POLYLINE, bemap.RoutingOptions.ROUTESHEET],
    outputLanguage: 'fr'
});
routing.calculate(req).then(function(response) {
    var route = response.getFirstRoute();
    console.log('Distance:', bemap.routingFormat.formatDistance(route.getSummary().getDistanceM()));
    console.log('Duration:', bemap.routingFormat.formatDuration(route.getSummary().getDurationS()));
});
```

---

# 2. `bemap.TraceRoute`

Map-matches a recorded GPS trace onto the road network. Two endpoints
share the same request shape:
- `POST service/routing/1.0/traceroute` (standard)
- `POST service/routing/1.0/traceroute/rnc` (raw-network-capture variant)

## Methods

| Method | Returns |
| --- | --- |
| `compute(request, options?)` | `Promise<bemap.RoutingResponse>` |
| `computeRnc(request, options?)` | `Promise<bemap.RoutingResponse>` |
| `cancel(requestId)` | `Boolean` |

## `bemap.TraceRouteRequest` — fields

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `destinations` **R** | Array of `TraceRouteDestination` / `CoordinateSat` / `Coordinate` / `{lon,lat,time,...}` | `[]` | Chronological GPS samples. Auto-promoted. |
| `routingVehicleProfile` **R** | `bemap.RoutingVehicleProfile` | `{ transportMode: 'CAR' }` (auto-injected) | Required server-side. |
| `routingCriterias` | Array of `bemap.RoutingCriteria.*` | `null` | Avoid/optimise (e.g. `AVOID_TOLLS`) — supported server-side for traceroute. |
| `options` | Array of `bemap.TraceRouteOptions.*` | `null` | |
| `departureTime` | Date / epoch ms / ISO string | `null` | |
| `adjustEta` | Boolean | `null` | Use GPS timestamps to recompute ETA. |
| `allowOffRoad` | Boolean | `null` (server default `true`) | |
| `corridorRadius` | Number (metres) | `null` | |
| `fenceShapes` | Array | `null` | |
| `language` | String (ISO 639-1) | `null` | |
| `customData` | Array | `null` | |
| `preferredRoads` | Array | `null` | No effect on TraceRoute server-side. |
| `routingRoadBlocks` | Array | `null` | |
| `geoserver` | String | from Context | |
| `requestId` | String | `null` | |

## `bemap.TraceRouteDestination`

Carries a `CoordinateSat` plus the snap hints from `RoutingDestination`.

| Field | Type | Notes |
| --- | --- | --- |
| `coordinateSat` | `bemap.CoordinateSat` | Required. |
| `keptByMinimalWp` | Boolean | Keep waypoint in response when `NO_MINIMAL_WAYPOINTS` is not set. |
| `customData` | Array of `{key, value}` | |

## `bemap.TraceRouteOptions` (server-canonical)

Same categorisation as `RoutingOptions` plus `EVT_OBJECTID_BASE64`. Does
NOT include map-matching-routing-only flags. No `QUALITY_SCORE` server-
side — the helper `bemap.traceRouteQuality.score(route)` derives one
client-side from waypoint deviation.

---

# 3. `bemap.NearPoiSearch`

POIs reachable from a coordinate within a distance budget. Endpoint
`POST service/nearpoi/1.0`.

## Methods

| Method | Returns |
| --- | --- |
| `nearPoi(request, options?)` | `Promise<bemap.NearPoiResponse>` |
| `nearPoi(coordinate, filters?, options?)` | `Promise<bemap.NearPoiResponse>` (shorthand — wraps a `NearPoiRequest`) |

## `bemap.NearPoiRequest` — fields

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `coordinate` **R** | `bemap.CoordinateSat` / `Coordinate` / `{lon,lat,...}` | — | Centre of the search. |
| `distance` **R** | Number (metres) | `500` | Search radius. |
| `transportType` **R** | One of `bemap.TransportMode.*` | `'CAR'` | |
| `orderBy` | One of `bemap.NearPoiOrder.*` | `null` | Server default leaves order undefined. |
| `enablePolyline` | Boolean | `null` | Include route polyline per POI. |
| `enableEncodedPolyline` | Boolean | `null` | Google-encoded polyline. |
| `geoserver` | String | from Context | |
| `switchIndex` | Number | `null` | |

## `bemap.NearPoiOrder` (enum, 4 values)

`DISTANCE_ASC`, `DISTANCE_DESC`, `DURATION_ASC`, `DURATION_DESC`.

## `bemap.TransportMode` (enum, 9 values)

`PEDESTRIAN`, `BICYCLE`, `MOTORCYCLE`, `CAR`, `TAXI`, `PUBLIC_BUS`,
`EMERGENCY`, `DELIVERY_TRUCK` (deprecated server-side, prefer `TRUCK`),
`TRUCK`.

## Example

```js
nearPoi.nearPoi(new bemap.Coordinate(2.35, 48.85), {
    distance: 1200,
    transportType: bemap.TransportMode.PEDESTRIAN,
    orderBy: bemap.NearPoiOrder.DISTANCE_ASC
}).then(function(response) {
    response.getPoints().forEach(function(p) {
        console.log(p.getName(), p.getDistance(), 'm');
    });
});
```

---

# 4. `bemap.ReverseGeocoder`

Coordinate → structured postal address. Endpoint
`POST service/geocoding/1.0/reverse`.

## Methods

| Method | Returns |
| --- | --- |
| `revGeo(request, options?)` | `Promise<bemap.GeocodingResponse>` |

## `bemap.ReverseGeocodingRequest` — fields

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `coordinate` **R** | `Coordinate` / `CoordinateSat` / `{lon,lat,...}` | — | Emitted on the wire as `coordinateSat`. |
| `radius` **R** | Number (metres) | `50` | Maximum snap radius. |
| `transportMode` | One of `bemap.TransportMode.*` | `null` | Biases snap-to-road. |
| `maxResult` | Number | `1` | Emitted on the wire as `maximunResult` (server typo, preserved). |
| `language` | String (ISO 639-1) | `null` | |
| `options` | Array of `bemap.RevGeocodingOptions.*` | `null` | |
| `geoserver` | String | from Context | |
| `switchIndex` | Number | `null` | |

## `bemap.RevGeocodingOptions` (enum, server-canonical)

| Value | Meaning |
| --- | --- |
| `START_AT_RADIUS` | Start search at the given radius rather than the centre coordinate. |
| `THROUGH_POINT_ADDRESS` | Try a point-address match first, fall back to street snap. |
| `SKIP_EMPTY_STREETNAME` | Include addresses that don't specify a street name. |
| `OPPOSITE_POSTAL_ADDRESS` | On two-way roads, also return the opposite-side address. |
| `OPPOSITE_POSTAL_ADDRESS_ALWAYS` | Always return both sides. |
| `URBAN_AREA` | Include urban-area classification. |
| `ROAD_FEATURE` | Include per-segment road feature object. |
| `SEGMENTID` | Include the matched segment id. |
| `POLYLINE` | Include the matched-segment polyline. |
| `TRAFFIC` | Real-time traffic data for the matched segment. |
| `TRAFFIC_PREDICTIVE` | Predictive traffic data. |
| `TRAFFIC_HISTORICAL` | Historical traffic data. |

---

# 5. `bemap.Geocoder` (forward)

Address → coordinate. No dedicated forward-geocoder endpoint exists on
the BeMap server — the JS API delegates to the autocomplete endpoint
with `addressDetails: true` (same approach as the Flutter SDK).
Endpoint `POST service/geocoding/autocomplete/1.0`.

## Methods

| Method | Returns |
| --- | --- |
| `geocode(request, options?)` | `Promise<bemap.GeocodingResponse>` (when `request instanceof bemap.GeocodingRequest`) |
| `geocode({searchInfo, success, failed})` | (legacy callback path, unchanged) |
| `revGeocode(request, options?)` | `Promise<bemap.GeocodingResponse>` |
| `reverseGeocode(coord, radius?, options?)` | `Promise<bemap.GeocodingResponse>` (shorthand) |

## `bemap.GeocodingRequest` — fields

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `place` | String | `null` | Free-text query (preferred). |
| `address` | `bemap.Address` | `null` | Structured query (alternative). When `place` is null, fields are joined into one string. |
| `language` | String (ISO 639-1) | `'en'` | |
| `maxResult` | Number | `10` | |
| `proximity` | `bemap.Coordinate` | `null` | Bias around this point. |
| `boundingBox` | `bemap.BoundingBox` | `null` | Restrict to bbox. |
| `searchType` | One of `bemap.GeocodingSearchType.*` | `null` | |
| `assetType` | One of `bemap.AssetSearchType.*` | `null` | |
| `addressDetails` | Boolean | `true` | Forced true for forward geocoding. |

---

# 6. `bemap.Autocomplete` / `bemap.GeoAutocomplete`

Typeahead suggestions. Endpoint
`POST service/geocoding/autocomplete/1.0`.

`GeoAutocomplete` is identical to `Autocomplete` but forces
`addressDetails: true` so every result carries a structured
`PostalAddress` and (when resolvable) a `Coordinate`.

## Methods

| Method | Returns |
| --- | --- |
| `autocomplete(request, options?)` | `Promise<bemap.AutocompleteGeocodingResponse>` |
| `attachToInput(inputEl, options)` | `{destroy: Function}` — thin delegate to `bemap.helpers.attachAutocompleteToInput`. Optional DOM glue. |

## `bemap.AutocompleteGeocodingRequest` — fields

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `place` **R** | String | `''` | The text typed by the user. |
| `language` **R** | String (ISO 639-1) | `'en'` | |
| `coordinate` | `bemap.Coordinate` | `null` | Bias around this point. Wire: `coordinate: {lon, lat}`. |
| `boundingBox` | `bemap.BoundingBox` | `null` | |
| `radius` | Number (metres) | `null` | |
| `countryCode` | String (ISO) | `null` | |
| `addressDetails` | Boolean | `null` | When true, response items carry full `PostalAddress`. |
| `enableLocationId` | Boolean | `null` | HERE HLP. |
| `enableEntrances` | Boolean | `null` | Add geo-coordinates of access points. |
| `enableHighlights` | Boolean | `null` | Slice information for highlighting. |
| `enableCategories` | Boolean | `null` | |
| `enableFoodTypes` | Boolean | `null` | |
| `enableChains` | Boolean | `null` | |
| `enableReferences` | Boolean | `null` | |
| `geoserver` | String | from Context | |
| `switchIndex` | Number | `null` | |

## Optional UI helper — `bemap.helpers.attachAutocompleteToInput(service, inputEl, options)`

Glue between a plain `<input>` and `Autocomplete` /
`GeoAutocomplete` — debounce, in-flight abort, Up / Down / Enter / Esc
keyboard nav, click-outside-to-close. Returns `{destroy()}` for
teardown. CSS hooks: `.bemap-autocomplete-list`,
`.bemap-autocomplete-item`, `.bemap-autocomplete-active`.

The service classes are pure HTTP mappers; this helper is opt-in.

## Optional routing helper — `bemap.helpers.snapToRoad(reverseGeocoder, coordinate, options)`

Free-form coordinates (e.g. a raw map click) routinely fall in water, on
a park, or in a pedestrian-only area. The BeMap routing endpoint rejects
such waypoints with `"Via not match: CoordinateGps [...]"`. **Snap every
click to the nearest road before passing it to
`RoutingV2.calculate()`.** This helper does that in one line.

```js
var rev = new bemap.ReverseGeocoder(ctx);
map.on(bemap.Map.EventType.CLICK, function(evt) {
    bemap.helpers.snapToRoad(rev, evt.getCoordinate(), { radius: 1000 })
        .then(function(snapped) {
            if (!snapped) {
                showError('Click closer to a road (none within 1 km).');
                return;
            }
            addWaypoint(snapped);
        });
});
```

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `reverseGeocoder` | `bemap.ReverseGeocoder` | required | Pre-built service instance. |
| `coordinate` | `bemap.Coordinate` / `bemap.CoordinateSat` | required | The free-form coordinate to snap. |
| `options.radius` | Number (metres) | `500` | Increase for sparse road networks. |
| `options.transportMode` | One of `bemap.TransportMode.*` | `'CAR'` | Match this to the routing call. |
| `options.language` | String | `null` | Forwarded to the reverse-geocoding request. |
| `options.signal` | AbortSignal | `null` | |

Returns `Promise<bemap.Coordinate|null>` — `null` when no road is found
within `radius`. Rejects with `bemap.Error` on network / auth failures.

Internally builds a `bemap.ReverseGeocodingRequest` with `maxResult: 1`
and returns the coordinate of the first matched item via
`bemap.geocoderHelpers.toCoordinate()`. The Routing v2 demo and the
Isochrone v2 demo both wire it into their map-click handlers.

---

# 7. `bemap.ChargingStations`

Wraps `POST service/chargingstation/search/1.0` — returns charging-station
pools around a coordinate, along a corridor, or inside a bounding box.

Auth requires `ROLE_CHARGINGSTATION` or `ROLE_EVSMARTROUTING`. The provider
name(s) passed in `providers` MUST be in the user's allowed list — fetch
the list via `bemap.helpers.listChargingStationProviders(ctx)`.

## Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `search(request)` | `Promise<bemap.ChargingStationSearchResponse>` | The main endpoint. |
| `getConnectorTypes()` | `Promise<Array<Object>>` | Wraps `GET .../connector/list/1.0`. |

## `bemap.ChargingStationSearchRequest` — fields

| Field | Type | Wire field | Default | Notes |
| --- | --- | --- | --- | --- |
| `providers` **R** | Array&lt;String&gt; | `providers` | — | E.g. `['ecoMovement']`. ACL-filtered. |
| `coordinate` | `bemap.Coordinate` / `{lon, lat}` | `coordinate` | — | Centre of a circular search. With `radius`. |
| `corridor` | Array&lt;Coordinate&gt; | `corridor` | — | Polyline corridor. Mutually exclusive with `coordinate` / `boundingBox`. |
| `boundingBox` | `bemap.BoundingBox` | `bbox` | — | Rectangular search window. |
| `radius` | Number (m) | `radius` | `0` | Required with `coordinate` / `corridor`. |
| `mode` | `bemap.ChargingStationMode` | `mode` | `LOCAL_OR_REMOTE` | See enum below. |
| `options` | Array&lt;`bemap.ChargingStationOption`&gt; | `options` | `null` | One of `PATH_*` controls depth. |
| `pathAutoMaxPool` | Number | `pathAutoMaxPool` | `20` | Threshold for `PATH_AUTO`. |
| `maxPoolResult` | Number | `maxPoolResult` | `0` | Max pools returned. |
| `maxProviderResult` | Number | `maxProviderResult` | `0` | Max items the server fetches from each provider. |
| `connectorIdFilters` | Array&lt;Number&gt; | `connectorIdFilters` | `null` | Keep only these connector type IDs. |
| `poolIdFilter` | String | `poolIdFilter` | `null` | Single-pool lookup. |
| `stationIdFilter` | String | `stationIdFilter` | `null` | Single-station lookup. |
| `pointIdFilter` | String | `pointIdFilter` | `null` | Single-point lookup. |
| `filtersVersion` | Number | `filtersVersion` | `1` | Filter engine version. |
| `filters` | Array&lt;String&gt; | `filters` | `null` | See BeMap filter docs. |
| `language` | String | `language` | `null` | ISO 639-1 language for address fields. |
| `geoserver` | String | `geoserver` | `ctx.getGeoserver()` | Override. |

## `bemap.ChargingStationMode` (enum, 7 values)

```
LOCAL  REMOTE  LOCAL_AND_REMOTE  LOCAL_OR_REMOTE  REMOTE_OR_LOCAL
LOCAL_IFNOPOOLS_REMOTE  REMOTE_IFNOPOOLS_LOCAL
```

## `bemap.ChargingStationOption` (enum)

```
AVAILABLE_CONNECTOR_TYPES  DEPRECATED_CONNECTOR
PATH_POOL_MAP  PATH_POINT_MAP  PATH_POOL  PATH_STATION  PATH_POINT
PATH_AUTO
```

## Response — `bemap.ChargingStationSearchResponse`

- `getPools()` → `Array<bemap.ChargingStationPool>`

### `bemap.ChargingStationPool` (excerpt)

`getId()`, `getProviderName()`, `getBrand()`, `getName()`,
`getCoordinate()`, `getFormattedAddress()`, `getMaxNominalPower()`,
`getNumberOfChargingPoint()`, `getAvailabilityStatus()`,
`getChargingStations()` (Array&lt;`bemap.ChargingStation`&gt;), etc.

### `bemap.ChargingStation`

`getId()`, `getAvailabilityStatus()`, `getAuthenticationModes()`,
`getPaymentModes()`, `getChargePasses()`, `isBookable()`,
`getChargingPoints()` (Array&lt;`bemap.ChargingPoint`&gt;).

### `bemap.ChargingPoint`

`getId()`, `getType()`, `getConnectorTypes()`, `getCurrentType()`,
`getVoltage()`, `getAmpere()`, `getPower()`, `getMaxPower()`.

## Example

```js
var cs = new bemap.ChargingStations(ctx);
var req = new bemap.ChargingStationSearchRequest({
    providers: ['ecoMovement'],
    coordinate: new bemap.Coordinate(2.35, 48.85),
    radius: 2000,
    maxPoolResult: 25,
    options: [bemap.ChargingStationOption.PATH_POOL_MAP]
});
cs.search(req).then(function(response) {
    response.getPools().forEach(function(pool) {
        addMarker(pool.getCoordinate(), pool.getName());
    });
});
```

---

# 8. `bemap.EvSmartRouting`

Wraps `POST service/evsmartrouting/1.0` — plans an EV journey from start
to stop with intermediate charging stops, given a vehicle model and a
charging-station provider.

Auth requires `ROLE_EVSMARTROUTING`. The CSP(s) in
`chargingStationProviders` must be in the user's ACL. The `vehicle` key
must be in the user's EV brand catalogue (fetch via `getBrands()` /
`getVehicles()`).

## Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `calculate(request)` | `Promise<bemap.EvSmartRoutingResponse>` | The main endpoint. |
| `getBrands()` | `Promise<Array<Object>>` | List of allowed EV brands. |
| `getVehicles({vehicle?, brandId?})` | `Promise<Array<Object>>` | List of allowed EV vehicle models. |

## `bemap.EvSmartRoutingRequest` — fields

| Field | Type | Wire field | Default | Notes |
| --- | --- | --- | --- | --- |
| `start` **R** | `bemap.Coordinate` / `{lon, lat}` | `startLon` + `startLat` | — | Decimal degrees, WGS84. |
| `stop` **R** | `bemap.Coordinate` / `{lon, lat}` | `stopLon` + `stopLat` | — | Decimal degrees, WGS84. |
| `vias` | Array&lt;Coordinate&gt; | `vias` | `null` | Intermediate waypoints. |
| `vehicle` **R** | String | `vehicle` | — | Vehicle key from the EV catalogue. |
| `chargingStationProviders` **R** | Array&lt;String&gt; | `csps` | — | Allowed CSP keys. |
| `chargingStationFilters` | Array&lt;String&gt; | `csfs` | `null` | See BeMap filter docs. |
| `chargingStationDeprecatedConnector` | Boolean | `csdepcnt` | `false` | Allow deprecated connectors. |
| `initBatteryLevel` | Number (%) | `initBatLvl` | `100` | 0-100. |
| `minBatteryLevel` | Number (%) | `minBatLvl` | `0` | 0-50 (capped). |
| `minArrivalBatteryLevel` | Number (%) | `minArrivalBatLvl` | `0` | 0-80 (capped). |
| `maxAfterChargeBatteryLevel` | Number (%) | `maxAfterChargeBatLvl` | vehicle default ≈ 90 | 0-100. |
| `weather` | Boolean | `weather` | `false` | Include weather impact. |
| `weatherProvider` | String | `wp` | `null` | |
| `temperature` | Number (°C) | `temperature` | `20` | |
| `departureTime` | Date / Number / String | `departureTime` | `null` | Epoch ms, ISO 8601 or Date. |
| `stepPointPluggingTime` | Number (s) | `stepPointPluggingTime` | `0` | Extra time per charge stop. |
| `payload` | Number (kg) | `payload` | `75` | Extra weight. |
| `criterias` | Array&lt;String&gt; | `criterias` | `null` | EV criteria — `AVOID_TOLLS`, etc. |
| `optimMode` | String | `optimMode` | `null` | `FASTEST` by default server-side. |
| `connectorTypes` | Array&lt;Number&gt; | `connectorTypes` | `null` | Connector type IDs filter. |
| `restrictedEvse` | Boolean | `restrictedEvse` | `false` | Allow private / employees-only. |
| `polyline` | Boolean | `pl` | `true` | Include polyline. |
| `encodedPolyline` | Boolean | `epl` | `false` | Include Google-encoded polyline. |
| `events` | Boolean | `evt` | `false` | Include route timeline. |
| `eventFrequency` | Number (s) | `evtFreq` | `60` | Sampling for `events`. |
| `alternative` | Number (0-2) | `alr` | `0` | Alternative-route index. |
| `currency` | String | `cur` | `null` | ISO 4217 — e.g. `EUR`. |
| `drivingStyle` | String | `drivingStyle` | `null` | Driving style enum. |
| `allowNaStatus` | Boolean | `allowNaStatus` | `false` | Allow unknown availability. |
| `allowMaxSpeedReco` | Boolean | `allowMaxSpdReco` | `false` | Recommend max speed. |
| `co2Emissions` | Boolean | `co2emissions` | `false` | Include saved CO2. |
| `debugStat` | Boolean | `debugStat` | `false` | Server-debug only. |
| `arrivalTime` | Date / Number / String | `arrivalTime` | `null` | Arrive-by time (epoch ms / ISO / Date) — alternative to `departureTime`. |
| `extraPayload` | Number (kg) | `extraPayload` | `null` | Extra payload on top of `payload`. |
| `stepPointTimeSlots` | Array | `stepPointTimeSlots` | `null` | Per-step charge time-slot windows. |
| `aroundEvse` | Boolean | `aroundEvse` | `false` | Include charging stations around step points in the response. |
| `ignoreStatus` | Boolean | `ignoreStatus` | `false` | Ignore charging-station availability status. |
| `evtExtKey` | String | `evtExtKey` | `null` | Extended route-timeline key (requires `events: true`). |
| `geoserver` | String | `geoserver` | `ctx.getGeoserver()` | Override. |

## Response — `bemap.EvSmartRoutingResponse`

| Accessor | Returns |
| --- | --- |
| `getLogTag()` | Server log UUID. |
| `getDistance()` | Total journey distance, metres. |
| `getDuration()` | Total journey duration (driving + charging), seconds. |
| `getChargingTime()` | Time spent charging, seconds. |
| `getArrivalBatteryLevel()` | Battery % at destination. |
| `getConsumed()` | Total energy used, kWh. |
| `getSavedCo2Emissions()` | kg of CO2 saved vs ICE equivalent (when `co2Emissions: true`). |
| `getStepPoints()` | `Array<bemap.EvStepPoint>` — charging stops in order. |
| `getPolyline()` | `Array<bemap.Coordinate>` — route polyline (when `polyline: true`). |
| `getEncodedPolyline()` | Google-encoded polyline string (when `encodedPolyline: true`). |
| `getBoundingBox()` | `bemap.BoundingBox` covering the journey. |
| `getJourney()` | Raw journey object (advanced). |

### `bemap.EvStepPoint` (excerpt)

`getId()`, `getName()`, `getBrand()`, `getCoordinate()`,
`getArrivalBatteryLevel()`, `getDepartureBatteryLevel()`,
`getChargingTime()`, `getChargingPower()`, `getChargingCost()`,
`getDistance()` (from previous step or start), `getDuration()`,
`getCity()`, `getMaxSpeed()`.

## Example

```js
var router = new bemap.EvSmartRouting(ctx);
var req = new bemap.EvSmartRoutingRequest({
    start: new bemap.Coordinate(2.35, 48.85),
    stop:  new bemap.Coordinate(4.83, 45.75),
    vehicle: 'renault-megane-e-tech-ev60',
    chargingStationProviders: ['ecoMovement'],
    initBatteryLevel: 80,
    minBatteryLevel: 10,
    minArrivalBatteryLevel: 20,
    co2Emissions: true
});
router.calculate(req).then(function(response) {
    drawPolyline(response.getPolyline());
    response.getStepPoints().forEach(addChargingMarker);
});
```

---

# 9. `bemap.EvVehicles`

Wraps the v1.1 vehicle catalogue endpoints — the same ones the BeMap Flutter SDK uses — for browsing brands and vehicles with structured plaintext fields (no regex parsing, no AES decryption).

- `GET service/vehicle/1.1/getbrands` — list of `{id, label}`.
- `GET service/vehicle/1.1/findvehicles?brandId=&vehicle=&variant=&enableDatasheet=` — structured `VehicleInfo` entries.

Auth: `ROLE_VEHICLE` (+ `ROLE_VEHICLE_DATASHEET` when `enableDatasheet: true`).

## Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `brands({signal?})` | `Promise<Array<bemap.EvBrand>>` | Sorted by label, deterministic for UI. |
| `list({brandId?, vehicle?, variant?, enableDatasheet?, signal?})` | `Promise<Array<bemap.EvVehicle>>` | Filters become URL query params. |
| `get(vehicleKey, {enableDatasheet?, signal?})` | `Promise<bemap.EvVehicle>` | Rejects with `VEHICLE_NOT_FOUND` when nothing matches. |
| `levels({level, brandId, name?, variant?, year?, batteryName?, motorType?, chargerPowerDC?, chargerPowerAC?, signal?})` | `Promise<Array<String>>` | Cascading "brand → name → variant → battery → DC power → AC power" UI flow (wraps `getlevelvehicleinfo`). |
| `brandLogo(brandId, {signal?})` | `Promise<{brandId, pictureFileFormat, logo}>` | JSON description of the logo (`logo` is base64-encoded image bytes). |
| `getBrandLogoUrl(brandId)` | `String` | URL of the binary logo endpoint, ready to fetch + turn into a `Blob` URL for `<img src>`. |
| `getPictureUrl(vehicleKey)` | `String` | URL of the vehicle-photo endpoint (`service/vehicle/picture/1.0/getone`). |
| `toRoutingProfile(vehicleKey, {signal?})` | `Promise<bemap.RoutingVehicleProfile>` | Convenience for chaining into `EvSmartRouting`. |

## `bemap.EvBrand`
`getId()` · `getLabel()`.

## `bemap.EvVehicle` (selected accessors)

`getKey()` · `getBrandName()` · `getName()` · `getYear()` · `getVariant()` · `getMotorType()` · `getBatteryCapacity()` (kWh, parsed from `batteryName`) · `getMaxChargingPowerDc()` · `getMaxChargingPowerAcThreePhases()` · `getMaxChargingPowerAcSinglePhase()` · `getConnectorTypes()` · `getTransportType()` · `getDimensions()` (height/width/length cm) · `getWltp()` · `getConsumptionInWhPerKm()` · `getDisplayLabel()` (one-liner ready for `<option>` text) · `getDatasheet()` (opaque base64; AES decryption is out of scope).

## Example

```js
var ev = new bemap.EvVehicles(ctx);
ev.brands().then(function(brands) {
    brands.forEach(function(b) { console.log(b.getId(), b.getLabel()); });
});
ev.list({brandId: '<id>'}).then(function(vehicles) {
    vehicles.forEach(function(v) {
        console.log(v.getDisplayLabel(), v.getBatteryCapacity() + 'kWh');
    });
});
```

---

# 10. `bemap.ChargingTime`

Wraps `POST service/chargingTime/1.0`. Estimates the duration to charge an EV between two SOC levels at a given charger.

Auth: `ROLE_CHARGINGTIME`.

## Methods

| Method | Returns |
| --- | --- |
| `estimate(request, {signal?})` | `Promise<bemap.ChargingTimeResponse>` |

## Request — `bemap.ChargingTimeRequest`

| Field | Wire | Required | Notes |
| --- | --- | :-: | --- |
| `vehicle` | `vehicle` | ✓ | UUID from `EvVehicles.list()`. |
| `chargingPointPower` | `chargingPointPower` | ✓ | kW, positive. |
| `chargingCurrentType` | `chargingCurrentType` | ✓ | `bemap.ChargingCurrentType.{NA \| AC \| AC_SINGLE_PHASE \| AC_THREE_PHASES \| DC}` (note `AC_THREE_PHASES` plural). |
| `remainingBatteryLevel` | `remainingBatteryLevel` | — | % (default 0). |
| `chargingBatteryLevel` | `chargingBatteryLevel` | — | % target (default 100). Must be > `remainingBatteryLevel`. |
| `temperature` | `temperature` | — | int °C (default 20). |
| `connectorType` | `connectorType` | — | Constrains effective power. |
| `geoserver` | `geoserver` | — | |

## Response — `bemap.ChargingTimeResponse`

- `getChargingTime()` → seconds (or `-1` on server-side error).
- `getOptimumBatteryChargeLevel()` → % (the "knee" of the curve — power tapers above this).
- `isError()` → `true` when the server returned `-1`. The service maps this to `bemap.Error.CHARGING_TIME_FAILED` automatically.

## Example

```js
var ct = new bemap.ChargingTime(ctx);
var req = new bemap.ChargingTimeRequest({
    vehicle: '<uuid>',
    chargingPointPower: 50,
    chargingCurrentType: bemap.ChargingCurrentType.DC,
    remainingBatteryLevel: 20,
    chargingBatteryLevel: 80
});
ct.estimate(req).then(function(resp) {
    console.log(resp.getChargingTime(), 's');
});
```

---

# 11. `bemap.EvReachableArea`

Wraps `POST service/evreachablearea/1.0`. Returns the polygon of every point an EV can reach from a start coordinate given its battery, vehicle, and ambient conditions.

Auth: `ROLE_EVREACHABLEAREA`.

## Methods

| Method | Returns |
| --- | --- |
| `compute(request, {signal?})` | `Promise<bemap.EvReachableAreaResponse>` |
| `combineMultipleBatteryLevels(request, [50, 70, 90], {signal?})` | `Promise<Array<{batteryLevel, response}>>` |

## Request — `bemap.EvReachableAreaRequest`

| Field | Wire | Required | Notes |
| --- | --- | :-: | --- |
| `start` | `startLon` + `startLat` | ✓ | `bemap.Coordinate` or `{lon, lat}`. `== null` check accepts lon=0 / lat=0. |
| `vehicle` | `vehicle` | ✓ | UUID. |
| `temperature` | `temperature` | ✓ | int °C — server marks REQUIRED. |
| `initBatteryLevel` | `initBatLvl` | — | % (default 100). |
| `payload` | `payload` | — | kg (default 75). |
| `criterias` | `criterias` | — | `Array<bemap.EvCriterion>` — `AVOID_TOLLS`, `AVOID_MOTORWAYS`, etc. |
| `weather` / `weatherProvider` | `weather` / `wp` | — | |
| `stop` | `stopLon` + `stopLat` | — | Optional — area encompassing both points. |
| `polyline` | `geo` | — | Boolean (default true). |
| `encodedPolyline` | `egeo` | — | Boolean (default false). |

## Response — `bemap.EvReachableAreaResponse`

- `getPolygon()` → `Array<bemap.Coordinate>` ready for `new bemap.Polygon(coords)`.
- `getBoundingBox()` → `bemap.BoundingBox`.
- `getEncodedPolygon()` → String (Google-encoded polyline, when `encodedPolyline: true`).

Empty geometry from the server is mapped to `bemap.Error.REACHABLE_AREA_FAILED`.

## Example

```js
var era = new bemap.EvReachableArea(ctx);
era.compute(new bemap.EvReachableAreaRequest({
    start: new bemap.Coordinate(2.35, 48.85),
    vehicle: '<uuid>',
    temperature: 18,
    initBatteryLevel: 80
})).then(function(response) {
    map.addPolygon(new bemap.Polygon(response.getPolygon(), {
        style: new bemap.PolygonStyle({ fillColor: new bemap.Color(142, 68, 173, 0.2) })
    }));
});
```

---

# 12. `bemap.CoordinateSat` (shared)

GPS coordinate with satellite metadata. Used by `TraceRoute`,
`ReverseGeocoder`, `NearPoiSearch` and `Routing` (snap hints).

| Field | Type | Wire field | Unit |
| --- | --- | --- | --- |
| `lon` **R** | Number | `lon` | Decimal degrees (WGS84). |
| `lat` **R** | Number | `lat` | Decimal degrees (WGS84). |
| `alt` | Number | `alt` | Metres above mean sea level. |
| `heading` | Number | `heading` | Degrees clockwise from north (0–360). |
| `speed` | Number | `speed` | km/h. |
| `time` | Date / Number / String | `time` | Epoch milliseconds (auto-coerced from Date / ISO string). |
| `satellites` | Number | `sat` (server field name) | Number of GPS satellites at the fix. |

`fromJson(...)` tolerates both `lon`/`lat` and `longitude`/`latitude`,
and both `sat` and `satellites`, so it parses cleanly regardless of which
shape the server emits.

---

# 13. `bemap.Error` (shared)

Every v2 rejection is a `bemap.Error` instance. Public code constants:

```
UNAUTHORIZED      FORBIDDEN          RATE_LIMITED      NETWORK
ABORTED           OFFLINE            INVALID_ARGUMENT
ROUTING_FAILED    ROUTING_NO_ROUTE   ROUTING_TIMEOUT
EV_FAILED         EV_NO_JOURNEY      CHARGING_NOT_FOUND   VEHICLE_NOT_FOUND
STYLE_LOAD_FAILED TILE_LOAD_FAILED   CACHE_HOST_CONFLICT  MAPLIBRE_ONLY
```

`INVALID_ARGUMENT` is raised by service-level guards when the caller passes
the wrong argument type or omits a mandatory field (e.g.
`ChargingStations.search()` with no `providers` and no fallback on the
Context, or `EvSmartRouting.calculate()` with no `start`/`stop`).

Read with `err.getCode()`. The `Error` carries `getStatus()` (HTTP status
when applicable), `getUrl()` (request URL), `getContext()` (parsed server
body), `getMessage()`.

---

# Where to look in the code

| File | Role |
| --- | --- |
| [src/bemap-services-v2/_base/bemap-service-v2.js](../../src/bemap-services-v2/_base/bemap-service-v2.js) | Base class (HTTP, AbortSignal, events). Every service extends this. |
| [src/bemap-services-v2/routing/](../../src/bemap-services-v2/routing/) | RoutingV2 + request/response/enum models. |
| [src/bemap-services-v2/traceroute/](../../src/bemap-services-v2/traceroute/) | TraceRoute + quality helper. |
| [src/bemap-services-v2/search/](../../src/bemap-services-v2/search/) | Geocoder, ReverseGeocoder, Autocomplete, GeoAutocomplete, NearPoiSearch. |
| [src/bemap-services-v2/charging-stations/](../../src/bemap-services-v2/charging-stations/) | ChargingStations + request/response/pool/station/point/enum models. |
| [src/bemap-services-v2/ev-routing/](../../src/bemap-services-v2/ev-routing/) | EvSmartRouting + request/response/step-point models. |
| [src/bemap-services-v2/acl/](../../src/bemap-services-v2/acl/) | AclService + GeoServerInfoService and their response models. |
| [src/bemap-model/bemap-coordinateSat.js](../../src/bemap-model/bemap-coordinateSat.js) | Shared GPS coordinate model. |
| [src/bemap-model/bemap-error.js](../../src/bemap-model/bemap-error.js) | Typed error class + code constants. |
| [examples/services-v2/](../../examples/services-v2/) | 10 runnable demos (one per service). |

---

# Map tiles — the `default` map & discovery

When `Context.tilesHost` is set, `bemap.MapLibreMap` renders the BeNomad Tiles
(PMTiles) base. Which map it uses is decided by `Context.tilesFile`:

| `tilesFile` | Tile URL | Worker serves |
| --- | --- | --- |
| unset → `'default'` (the default) | `<host>/default` | the configured default map (server picks) |
| `'osm'` / `'here'` | `<host>/osm` · `<host>/here` | that **alias** (case-insensitive) |
| `'OSM_250901_WORLD.pmtiles'` | `<host>/OSM_250901_WORLD.pmtiles` | that exact tileset |

Map names are **bare** — the `.pmtiles` suffix is optional; the Worker appends
it and resolves aliases via its `_config/maps.json`. Pinning a specific file is
discouraged for the common case: keep `tilesFile` at `'default'` (or an alias
like `'osm'`) so a new map version rolls out without a client change.

**Precedence.** The map name is resolved as
`opts.tilesFile → ctx.tilesFile → ctx.geoserver → 'default'`
(`Context.resolveTilesFile()`). Because `ctx.tilesFile` defaults to the
`'default'` sentinel, a Context with `geoserver: 'osm'` and **no** explicit
`tilesFile` loads the **`osm`** tiles — the geoserver doubles as the tiles
alias. An explicit `tilesFile` (per-call or on the Context) always wins.

```js
var ctx = new bemap.Context({ tilesHost: 'mptiles-api-beta.benomad.net', login: 'u', password: 'p' });
// ctx.tilesFile === 'default'  → server chooses the map
ctx.tilesFile = 'here';        // or pin the HERE alias
var map = new bemap.MapLibreMap(ctx, 'map');
```

## Discovery — what's available on this env

The Worker exposes read-only config endpoints. The Context builds the URLs and
`bemap.MapLibreMap` fetches them with the session token attached automatically:

| Context URL | Map method | Endpoint | Resolves with |
| --- | --- | --- | --- |
| `getTilesMapsUrl()` | `fetchAvailableMaps()` | `GET /api/maps` | `{ default, aliases, tilesets }` |
| `getTilesStylesUrl()` | `fetchAvailableStyles()` | `GET /api/styles` | `{ styles: [...] }` |
| `getTilesDefaultUrl()` | `fetchDefaultMap()` | `GET /api/default` | `{ default: '<file>'\|null }` |

```js
var map = new bemap.MapLibreMap(ctx, 'map');
map.fetchAvailableMaps().then(function (cfg) {
    // cfg.aliases -> { osm, here, default }, cfg.tilesets -> full filenames
    Object.keys(cfg.aliases).forEach(addToMapPicker);
});
```

The fetch helpers wait for login to complete and reject with a clear error if
`tilesHost` isn't configured. See the **Tiles & Map Discovery** example
(`examples/services-v2/tiles-discovery.html`).

## Fonts (glyphs)

The default MapLibre style loads `Noto Sans Regular`/`Bold` from `dist/fonts/`,
auto-detected from the bundle location — no setup beyond serving `dist/fonts/`
next to `bemap-js-api.js`. Override with
`new bemap.Context({ glyphsUrl: '…/{fontstack}/{range}.pbf' })`. Full details in
`docs/style-customisation.md` → **Fonts (glyphs)**.

# What this API never does (by design)

- **Never adds markers / icons / polylines to the map.** The dev does that with `bemap.Marker`, `bemap.Polyline`, etc.
- **Never queries the DOM** (except the opt-in `attachAutocompleteToInput` helper).
- **Never carries state.** Re-using the same service instance for many calls is fine and recommended; there is no internal cache or model store.
- **Never depends on jQuery / Bootstrap / any UI library.** Pure vanilla.
