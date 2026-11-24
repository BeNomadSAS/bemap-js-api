/**
 * TraceRoute v2 demo — bemap.TraceRoute.compute.
 *
 * Replays a small in-line GPS trace (15 fake samples along the Seine in
 * central Paris) and renders the raw trace + the map-matched route
 * side-by-side.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.34, 48.85, 13);
    var trace = new bemap.TraceRoute(bemapMainCtx);

    // ~15 fake GPS samples (lon, lat) walking eastwards along the Seine.
    // Spacing ≈ 80 m, heading ≈ 95°.
    // Speed values are integer km/h to match the Flutter SDK CoordinateSat
    // type (speed: int). Time is set to epoch ms at serialisation time.
    var SAMPLE_PARIS = [
        { lon: 2.3360, lat: 48.8580, heading:  90, speed: 30 },
        { lon: 2.3370, lat: 48.8581, heading:  92, speed: 31 },
        { lon: 2.3380, lat: 48.8581, heading:  95, speed: 33 },
        { lon: 2.3390, lat: 48.8580, heading:  98, speed: 32 },
        { lon: 2.3400, lat: 48.8579, heading: 100, speed: 32 },
        { lon: 2.3410, lat: 48.8578, heading: 100, speed: 31 },
        { lon: 2.3420, lat: 48.8577, heading: 102, speed: 32 },
        { lon: 2.3430, lat: 48.8575, heading: 105, speed: 33 },
        { lon: 2.3440, lat: 48.8574, heading: 105, speed: 32 },
        { lon: 2.3450, lat: 48.8572, heading: 108, speed: 32 },
        { lon: 2.3460, lat: 48.8570, heading: 110, speed: 31 },
        { lon: 2.3470, lat: 48.8568, heading: 110, speed: 30 },
        { lon: 2.3480, lat: 48.8565, heading: 112, speed: 29 },
        { lon: 2.3490, lat: 48.8562, heading: 115, speed: 27 },
        { lon: 2.3500, lat: 48.8558, heading: 118, speed: 25 }
    ].map(function(p, i) {
        return new bemap.CoordinateSat({
            lon: p.lon, lat: p.lat,
            heading: p.heading, speed: p.speed,
            time: Date.now() + i * 10000,
            satellites: 9
        });
    });

    var rawPolyline = null;
    var matchedPolyline = null;
    var rawMarkers = [];
    var statusEl = document.getElementById('tr-status');
    var summaryEl = document.getElementById('tr-summary');

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }

    // ---- Copy-paste code panel ----
    var snippet = bemap.demoSnippet.attach(document.querySelector('.panel-v2'), {
        title: 'Code example — copy & paste'
    });
    snippet.setContext(bemap.demoSnippet.contextLine(bemapMainCtx));
    snippet.setRequest([
        "// Build your own list of GPS samples (lon, lat, heading, speed,",
        "// time, satellites). 15 fake samples are shipped in this demo:",
        "var samples = sampleGpsTrace.map(function(p, i) {",
        "    return new bemap.CoordinateSat({",
        "        lon: p.lon, lat: p.lat,",
        "        heading: p.heading, speed: p.speed,",
        "        time: Date.now() + i * 10000,",
        "        satellites: 9",
        "    });",
        "});",
        "",
        "var req = new bemap.TraceRouteRequest({",
        "    destinations: samples,",
        "    routingVehicleProfile: new bemap.RoutingVehicleProfile({",
        "        transportMode: bemap.TransportMode.CAR",
        "    }),",
        "    options: [",
        "        bemap.TraceRouteOptions.POLYLINE,",
        "        bemap.TraceRouteOptions.WAYPOINTS",
        "    ],",
        "    language: 'en',",
        "    requestId: 'tr-' + Date.now()",
        "});"
    ].join('\n'));
    snippet.setCall([
        "var trace = new bemap.TraceRoute(ctx);",
        "trace.compute(req).then(function(response) {",
        "    var route = response.getFirstRoute();",
        "    drawPolyline(route.getPolyline());",
        "    var qs = bemap.traceRouteQuality.score(response);",
        "    console.log('matched distance:', route.getLength(), 'm');",
        "    console.log('quality:', qs);",
        "}).catch(function(err) { console.error(err.getMessage()); });"
    ].join('\n'));

    function clearAll() {
        if (rawPolyline) { try { map.removePolyline(rawPolyline); } catch (e) {} rawPolyline = null; }
        if (matchedPolyline) { try { map.removePolyline(matchedPolyline); } catch (e) {} matchedPolyline = null; }
        rawMarkers.forEach(function(m) { try { map.removeMarker(m); } catch (e) {} });
        rawMarkers = [];
        summaryEl.textContent = '';
        setStatus('Click Compute to run the map-match.');
    }

    function drawRaw() {
        rawPolyline = new bemap.Polyline(SAMPLE_PARIS.map(function(s) {
            return new bemap.Coordinate(s.lon, s.lat);
        }), {
            style: new bemap.LineStyle({
                width: 3,
                color: new bemap.Color(231, 76, 60, 0.7),
                type: bemap.LineStyle.TYPE.DASH
            }),
            id: 'tr-raw'
        });
        map.addPolyline(rawPolyline);

        SAMPLE_PARIS.forEach(function(s, i) {
            var m = new bemap.Marker(new bemap.Coordinate(s.lon, s.lat), { id: 'tr-raw-' + i });
            map.addMarker(m);
            rawMarkers.push(m);
        });
    }

    function drawMatched(route) {
        // Polyline arrives from the server as an Array of {lon, lat};
        // getPolyline() returns it as an Array<bemap.Coordinate>.
        var coords = route.getPolyline();
        if (!coords || coords.length < 2) coords = SAMPLE_PARIS.map(function(s) {
            return new bemap.Coordinate(s.lon, s.lat);
        });

        matchedPolyline = new bemap.Polyline(coords, {
            style: new bemap.LineStyle({
                width: 5,
                color: new bemap.Color(142, 68, 173, 1),
                type: bemap.LineStyle.TYPE.PLANE
            }),
            id: 'tr-matched'
        });
        map.addPolyline(matchedPolyline);
    }

    document.getElementById('tr-go').addEventListener('click', function() {
        clearAll();
        drawRaw();
        setStatus('Calling /routing/1.0/traceroute ...');

        var req = new bemap.TraceRouteRequest({
            destinations: SAMPLE_PARIS,                       // Flutter SDK field
            routingVehicleProfile: new bemap.RoutingVehicleProfile({
                transportMode: bemap.TransportMode.CAR
            }),
            options: [
                bemap.TraceRouteOptions.POLYLINE,
                bemap.TraceRouteOptions.WAYPOINTS
            ],
            language: 'en',
            requestId: 'tr-' + Date.now()
        });

        trace.compute(req).then(function(response) {
            snippet.setResponse(response);
            var route = response.getFirstRoute();
            if (!route) { setStatus('No matched route returned', 'error'); return; }
            drawMatched(route);

            var qs = bemap.traceRouteQuality.score(response);
            var distanceM = route.getLength();
            var durationS = route.getDuration();
            var parts = [];
            if (distanceM) parts.push('<strong>Matched distance:</strong> ' + bemap.routingFormat.formatDistance(distanceM));
            if (durationS) parts.push('<strong>Duration:</strong> ' + bemap.routingFormat.formatDuration(durationS));
            if (qs !== null) parts.push('<strong>Quality:</strong> ' + (qs * 100).toFixed(0) + '%');
            summaryEl.innerHTML = parts.join(' · ');
            setStatus('Trace matched.', 'ok');
        }).catch(function(err) {
            console.error(err);
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    });

    document.getElementById('tr-clear').addEventListener('click', clearAll);

})();
