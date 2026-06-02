/**
 * Isochrone v2 demo — bemap.RoutingV2.isochrone.
 *
 * Click the map; the demo computes the reachable-area polygon for the
 * configured time / distance budget.
 *
 * The BeMap server returns the isochrone polygon as the `polyline` of the
 * first route in `routingRoutes[]` (length / duration are zero in that
 * case). `response.getIsochronePolygon()` extracts that polygon as an
 * Array<bemap.Coordinate> ready to feed into `bemap.Polygon`. If a future
 * server version exposes a GeoJSON-style payload under a top-level
 * `isochrone` key, the same accessor returns it as-is and this demo's
 * fallback branch handles it.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 12);
    var routing = new bemap.RoutingV2(bemapMainCtx);
    var reverseGeocoder = new bemap.ReverseGeocoder(bemapMainCtx);

    var centerMarker = null;
    var polygons = [];
    var statusEl = document.getElementById('iso-status');
    var computing = false;

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }

    // ---- Copy-paste code panel ----
    var lastCoord = { lon: 2.35, lat: 48.85 };
    var snippet = bemap.demoSnippet.attach(document.querySelector('.panel-v2'), {
        title: 'Code example — copy & paste'
    });
    function refreshSnippet() {
        snippet.setContext(bemap.demoSnippet.contextLine(bemapMainCtx));
        var unit = document.getElementById('iso-unit').value;
        var crit = (unit === 'meter') ? 'SHORTEST' : 'FASTEST';
        var mode = document.getElementById('iso-veh').value;
        var profileLine = mode
            ? '/*RAW*/new bemap.RoutingVehicleProfile({ transportMode: bemap.TransportMode.' + mode + ' })'
            : null;
        snippet.setRequest(
            'var origin = new bemap.Coordinate(' + lastCoord.lon + ', ' + lastCoord.lat + ');\n' +
            'var budget = ' + (parseInt(document.getElementById('iso-budget').value, 10) || 900) + '; // ' + (unit === 'meter' ? 'metres' : 'seconds') + '\n' +
            'var criterion = {\n' +
            '    budget: budget,\n' +
            '    criterias: [bemap.RoutingCriteria.' + crit + ']\n' +
            '};'
        );
        snippet.setCall([
            "var routing = new bemap.RoutingV2(ctx);",
            "routing.isochrone(origin, criterion, {",
            (profileLine ? "    routingVehicleProfile: " + profileLine + "," : "    // routingVehicleProfile: <CAR by default>,"),
            "    options: [bemap.RoutingOptions.POLYLINE],",
            "    outputLanguage: 'en'",
            "}).then(function(response) {",
            "    var polygon = response.getIsochronePolygon(); // Array<bemap.Coordinate>",
            "    map.addPolygon(new bemap.Polygon(polygon, { style: ... }));",
            "}).catch(function(err) { console.error(err.getMessage()); });"
        ].join('\n'));
    }
    refreshSnippet();
    ['iso-budget', 'iso-unit', 'iso-veh'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', refreshSnippet);
        if (el) el.addEventListener('input', refreshSnippet);
    });

    function clearOverlays() {
        if (centerMarker) { try { map.removeMarker(centerMarker); } catch (e) {} centerMarker = null; }
        polygons.forEach(function(p) { try { map.removePolygon(p); } catch (e) {} });
        polygons = [];
    }

    function asCoord(pair) {
        if (pair instanceof bemap.Coordinate) return pair;
        if (Array.isArray(pair) && pair.length >= 2) {
            return new bemap.Coordinate(pair[0], pair[1]);
        }
        if (pair && (pair.lon !== undefined || pair.longitude !== undefined)) {
            var lon = (pair.lon !== undefined) ? pair.lon : pair.longitude;
            var lat = (pair.lat !== undefined) ? pair.lat : pair.latitude;
            return new bemap.Coordinate(lon, lat);
        }
        return null;
    }

    function makePolygon(coords) {
        return new bemap.Polygon(coords, {
            style: new bemap.PolygonStyle({
                fillColor: new bemap.Color(142, 68, 173, 0.18),
                strokeColor: new bemap.Color(142, 68, 173, 1),
                width: 2
            })
        });
    }

    function drawIsochrone(payload) {
        if (!payload) { setStatus('Empty isochrone payload', 'error'); return; }

        // Common case (real beta server): payload is an Array<bemap.Coordinate>
        // returned by RoutingResponse.getIsochronePolygon() — already the
        // polygon vertex ring.
        if (Array.isArray(payload) && payload.length >= 3 && payload[0] instanceof bemap.Coordinate) {
            var poly = makePolygon(payload);
            map.addPolygon(poly);
            polygons.push(poly);
            setStatus('Isochrone drawn (' + payload.length + ' vertices).', 'ok');
            return;
        }

        // Fallback: GeoJSON-style shapes a future server version may emit.
        var rings = null;
        if (payload.type === 'Polygon' && Array.isArray(payload.coordinates)) {
            rings = payload.coordinates;
        } else if (payload.type === 'MultiPolygon' && Array.isArray(payload.coordinates)) {
            rings = [];
            payload.coordinates.forEach(function(p) { rings = rings.concat(p); });
        } else if (Array.isArray(payload.rings)) {
            rings = payload.rings;
        } else if (Array.isArray(payload)) {
            rings = [payload];
        }
        if (!rings) {
            setStatus('Isochrone polygon shape not recognised (see console).', 'error');
            console.warn('Unknown isochrone shape:', payload);
            return;
        }
        rings.forEach(function(ring) {
            var coords = (ring || []).map(asCoord).filter(Boolean);
            if (coords.length < 3) return;
            var poly = makePolygon(coords);
            map.addPolygon(poly);
            polygons.push(poly);
        });
        setStatus('Isochrone drawn.', 'ok');
    }

    function compute(coord) {
        lastCoord = { lon: coord.getLon(), lat: coord.getLat() };
        refreshSnippet();
        clearOverlays();
        centerMarker = new bemap.Marker(coord, { id: 'iso-center' });
        map.addMarker(centerMarker);

        var transportMode = document.getElementById('iso-veh').value;
        var profile = transportMode
            ? new bemap.RoutingVehicleProfile({ transportMode: transportMode })
            : null;

        // Budget unit drives the optimisation criterion server-side:
        //   seconds → FASTEST, meters → SHORTEST.
        var unit = document.getElementById('iso-unit').value;
        var criterias = (unit === 'meter')
            ? [bemap.RoutingCriteria.SHORTEST]
            : [bemap.RoutingCriteria.FASTEST];

        setStatus('Calling /service/routing/1.0 (MODE_ISOCHRONE) ...');
        routing.isochrone(coord, {
            budget: parseInt(document.getElementById('iso-budget').value, 10) || 900,
            criterias: criterias
        }, {
            routingVehicleProfile: profile,
            options: [bemap.RoutingOptions.POLYLINE],
            outputLanguage: 'en'
        }).then(function(response) {
            computing = false;
            snippet.setResponse(response);
            drawIsochrone(response.getIsochronePolygon());
        }).catch(function(err) {
            computing = false;
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    }

    map.on(bemap.Map.EventType.CLICK, function(evt) {
        var c = evt.getCoordinate ? evt.getCoordinate() : evt.coordinate;
        if (!c || computing) return;

        // Snap the click to the nearest road before sending it as the
        // isochrone origin — the routing server rejects off-network
        // coordinates with "Via not match: CoordinateGps [...]".
        computing = true;
        setStatus('Snapping to nearest road …');
        bemap.helpers.snapToRoad(reverseGeocoder, c, {
            radius: 1000,
            transportMode: document.getElementById('iso-veh').value || bemap.TransportMode.CAR
        }).then(function(snapped) {
            if (!snapped) {
                computing = false;
                setStatus('No road found within 1 km. Try clicking closer to a road.', 'error');
                return;
            }
            compute(snapped);
        }).catch(function(err) {
            computing = false;
            setStatus('Snap-to-road failed: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    });

})();
