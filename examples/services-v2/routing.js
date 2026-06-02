/**
 * Routing v2 demo — bemap.RoutingV2.
 *
 * Click the map to drop waypoints (1st = start, 2nd = end, 3rd+ = vias).
 * The Calculate button calls RoutingV2.calculate(); Cancel aborts the
 * in-flight request via cancel(requestId).
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 7);
    var routing = new bemap.RoutingV2(bemapMainCtx);
    var reverseGeocoder = new bemap.ReverseGeocoder(bemapMainCtx);

    var waypoints = [];        // Array of bemap.Coordinate (snapped)
    var waypointMarkers = [];
    var polyline = null;
    var pendingRequestId = null;
    var snapping = false;      // guard against rapid double-clicks

    var statusEl = document.getElementById('rt-status');
    var summaryEl = document.getElementById('rt-summary');

    // ---- Copy-paste code panel ----
    var snippet = bemap.demoSnippet.attach(document.querySelector('.panel-v2'), {
        title: 'Code example — copy & paste'
    });
    function refreshSnippet() {
        snippet.setContext(bemap.demoSnippet.contextLine(bemapMainCtx));
        var critLine = ['/*RAW*/bemap.RoutingCriteria.' + (document.getElementById('rt-crit').value || 'FASTEST')];
        if (document.getElementById('rt-avoid-toll').checked) critLine.push('/*RAW*/bemap.RoutingCriteria.AVOID_TOLLS');
        if (document.getElementById('rt-avoid-hw').checked) critLine.push('/*RAW*/bemap.RoutingCriteria.AVOID_MOTORWAYS');

        var wpExpr = waypoints.length
            ? waypoints.map(function(c) {
                return '/*RAW*/new bemap.Coordinate(' + c.getLon().toFixed(5) + ', ' + c.getLat().toFixed(5) + ')';
            })
            : ['/*RAW*/new bemap.Coordinate(2.35, 48.85)', '/*RAW*/new bemap.Coordinate(2.40, 48.88)'];

        var opts = {
            destinations: wpExpr,
            routingCriterias: critLine,
            options: [
                '/*RAW*/bemap.RoutingOptions.POLYLINE',
                '/*RAW*/bemap.RoutingOptions.WAYPOINTS',
                '/*RAW*/bemap.RoutingOptions.ROUTESHEET'
            ],
            outputLanguage: 'en'
        };
        var mode = document.getElementById('rt-veh').value;
        if (mode) opts.routingVehicleProfile = '/*RAW*/new bemap.RoutingVehicleProfile({ transportMode: bemap.TransportMode.' + mode + ' })';
        snippet.setRequest(bemap.demoSnippet.requestSnippet('RoutingRequest', opts));
        snippet.setCall([
            "var routing = new bemap.RoutingV2(ctx);",
            "routing.calculate(req).then(function(response) {",
            "    var route = response.getFirstRoute();",
            "    console.log('distance', route.getLength(), 'm');",
            "    console.log('duration', route.getDuration(), 's');",
            "    drawPolyline(route.getPolyline());",
            "}).catch(function(err) {",
            "    if (err.getCode() === bemap.Error.ROUTING_NO_ROUTE) console.warn('no route');",
            "    else console.error(err.getMessage());",
            "});"
        ].join('\n'));
    }

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }

    function clearAll() {
        waypoints = [];
        waypointMarkers.forEach(function(m) { try { map.removeMarker(m); } catch (e) {} });
        waypointMarkers = [];
        if (polyline) { try { map.removePolyline(polyline); } catch (e) {} polyline = null; }
        summaryEl.textContent = '';
        setStatus('Click the map to drop the start point.');
    }

    function addWaypoint(coord) {
        waypoints.push(coord);
        var marker = new bemap.Marker(coord, { id: 'rt-wp-' + waypoints.length });
        map.addMarker(marker);
        waypointMarkers.push(marker);
        if (waypoints.length === 1) setStatus('Drop the destination …');
        else if (waypoints.length === 2) setStatus('Ready. Click "Calculate", or drop another point to add a via.', 'ok');
        else setStatus('Got ' + waypoints.length + ' points (' + (waypoints.length - 2) + ' vias). Click Calculate.', 'ok');
        refreshSnippet();
    }

    function drawRoute(route) {
        if (polyline) { try { map.removePolyline(polyline); } catch (e) {} polyline = null; }
        // The BeMap server emits the polyline as an array of {lon, lat}
        // objects; getPolyline() returns it as an Array<bemap.Coordinate>.
        var coords = route.getPolyline();
        if (!coords || coords.length < 2) {
            coords = waypoints.slice();
        }

        polyline = new bemap.Polyline(coords, {
            style: new bemap.LineStyle({
                width: 5,
                color: new bemap.Color(142, 68, 173, 1),
                type: bemap.LineStyle.TYPE.PLANE
            }),
            id: 'rt-route'
        });
        map.addPolyline(polyline);

        var bbox = route.getBoundingBox();
        if (bbox && typeof map.moveToBoundingBox === 'function') {
            try { map.moveToBoundingBox(bbox); } catch (e) { /* engines that lack it */ }
        }
    }

    function renderSummary(route) {
        var distanceM = route.getLength();
        var durationS = route.getDuration();
        summaryEl.innerHTML =
            '<strong>Distance:</strong> ' + bemap.routingFormat.formatDistance(distanceM) +
            ' · <strong>Duration:</strong> ' + bemap.routingFormat.formatDuration(durationS) +
            ' · <strong>ETA:</strong> ' + bemap.routingFormat.eta(durationS).toLocaleTimeString();
    }

    document.getElementById('rt-go').addEventListener('click', function() {
        if (waypoints.length < 2) { setStatus('Drop at least 2 points first.', 'error'); return; }

        // Flutter SDK wire shape: single destinations[] (first=start, last=end, between=vias).
        var criterias = [document.getElementById('rt-crit').value];
        if (document.getElementById('rt-avoid-toll').checked) criterias.push(bemap.RoutingCriteria.AVOID_TOLLS);
        if (document.getElementById('rt-avoid-hw').checked) criterias.push(bemap.RoutingCriteria.AVOID_MOTORWAYS);

        var transportMode = document.getElementById('rt-veh').value;
        var profile = transportMode
            ? new bemap.RoutingVehicleProfile({ transportMode: transportMode })
            : null;

        pendingRequestId = 'rt-' + Date.now();

        var req = new bemap.RoutingRequest({
            destinations: waypoints,
            routingCriterias: criterias,
            options: [bemap.RoutingOptions.POLYLINE, bemap.RoutingOptions.WAYPOINTS, bemap.RoutingOptions.ROUTESHEET],
            routingVehicleProfile: profile,
            outputLanguage: 'en',
            requestId: pendingRequestId
        });

        setStatus('Calling /routing/1.0 ...');
        routing.calculate(req).then(function(response) {
            pendingRequestId = null;
            snippet.setResponse(response);
            var route = response.getFirstRoute();
            if (!route) { setStatus('No route', 'error'); return; }
            drawRoute(route);
            renderSummary(route);
            setStatus('Route calculated.', 'ok');
        }).catch(function(err) {
            pendingRequestId = null;
            if (err && err.getCode && err.getCode() === bemap.Error.ABORTED) {
                setStatus('Cancelled.', 'error'); return;
            }
            if (err && err.getCode && err.getCode() === bemap.Error.ROUTING_NO_ROUTE) {
                setStatus('No route was found between the supplied points.', 'error'); return;
            }
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    });

    document.getElementById('rt-cancel').addEventListener('click', function() {
        if (pendingRequestId && routing.cancel(pendingRequestId)) {
            setStatus('Cancelling …');
        }
    });

    document.getElementById('rt-clear').addEventListener('click', function() { clearAll(); refreshSnippet(); });
    ['rt-crit', 'rt-veh', 'rt-avoid-toll', 'rt-avoid-hw'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', refreshSnippet);
    });
    refreshSnippet();

    map.on(bemap.Map.EventType.CLICK, function(evt) {
        var c = evt.getCoordinate ? evt.getCoordinate() : evt.coordinate;
        if (!c || snapping) return;

        // Snap each click to the nearest road via reverse-geocoding before
        // adding it as a waypoint. This prevents the server's
        //   "Via not match: CoordinateGps [...]"
        // 400 when the user clicks on water, a park, or off-road.
        snapping = true;
        setStatus('Snapping to nearest road …');
        bemap.helpers.snapToRoad(reverseGeocoder, c, {
            radius: 1000,
            transportMode: document.getElementById('rt-veh').value || bemap.TransportMode.CAR
        }).then(function(snapped) {
            snapping = false;
            if (!snapped) {
                setStatus('No road found within 1 km. Try clicking closer to a road.', 'error');
                return;
            }
            addWaypoint(snapped);
        }).catch(function(err) {
            snapping = false;
            setStatus('Snap-to-road failed: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    });

})();
