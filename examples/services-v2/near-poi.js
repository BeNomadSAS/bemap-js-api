/**
 * Near POI Search v2 demo — bemap.NearPoiSearch.
 *
 * Click anywhere on the map; the demo searches for POIs around that
 * coordinate using the filters in the panel.
 *
 * Wire shape: `POST service/nearpoi/1.0` with body
 *   { coordinate: {lon, lat}, distance, transportType, orderBy?,
 *     enablePolyline?, enableEncodedPolyline?, geoserver }
 * — cross-checked against the Flutter SDK at
 * `bemap-flutter-api/lib/service/near_poi`.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 13);
    var search = new bemap.NearPoiSearch(bemapMainCtx);

    var centerMarker = null;
    var poiMarkers = [];
    var statusEl = document.getElementById('np-status');
    var listEl = document.getElementById('np-results');

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
        var opts = {
            coordinate: '/*RAW*/new bemap.Coordinate(' + lastCoord.lon + ', ' + lastCoord.lat + ')',
            distance: parseInt(document.getElementById('np-distance').value, 10) || 800,
            transportType: '/*RAW*/bemap.TransportMode.' + (document.getElementById('np-mode').value || 'CAR'),
            enablePolyline: document.getElementById('np-polyline').checked
        };
        var order = document.getElementById('np-order').value;
        if (order) opts.orderBy = '/*RAW*/bemap.NearPoiOrder.' + order;
        snippet.setRequest(bemap.demoSnippet.requestSnippet('NearPoiRequest', opts));
        snippet.setCall([
            "var search = new bemap.NearPoiSearch(ctx);",
            "search.nearPoi(req).then(function(response) {",
            "    response.getPoints().forEach(function(p) {",
            "        var c = p.getCoordinate();",
            "        console.log(p.getName(), p.getType(), c.getLon(), c.getLat(), p.getDistance() + 'm');",
            "    });",
            "}).catch(function(err) { console.error(err.getMessage()); });"
        ].join('\n'));
    }
    refreshSnippet();
    ['np-distance', 'np-mode', 'np-order', 'np-polyline'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', refreshSnippet);
        if (el) el.addEventListener('input', refreshSnippet);
    });

    function clearMarkers() {
        for (var i = 0; i < poiMarkers.length; i++) {
            try { map.removeMarker(poiMarkers[i]); } catch (e) {}
        }
        poiMarkers = [];
    }

    function searchAt(coord) {
        lastCoord = { lon: coord.getLon(), lat: coord.getLat() };
        refreshSnippet();
        clearMarkers();
        listEl.innerHTML = '';
        if (centerMarker) { try { map.removeMarker(centerMarker); } catch (e) {} }
        centerMarker = new bemap.Marker(coord, { id: 'np-center' });
        map.addMarker(centerMarker);

        var order = document.getElementById('np-order').value || null;

        var req = new bemap.NearPoiRequest({
            coordinate: coord,
            distance: parseInt(document.getElementById('np-distance').value, 10) || 800,
            transportType: document.getElementById('np-mode').value || bemap.TransportMode.CAR,
            orderBy: order,
            enablePolyline: document.getElementById('np-polyline').checked
        });

        setStatus('Calling /service/nearpoi/1.0 ...');
        search.nearPoi(req).then(function(response) {
            snippet.setResponse(response);
            var points = response.getPoints();
            if (!points.length) { setStatus('No POI found in this area', 'error'); return; }

            points.forEach(function(p, idx) {
                var c = p.getCoordinate();
                if (!c) return;
                var marker = new bemap.Marker(c, { id: 'np-' + idx });
                map.addMarker(marker);
                poiMarkers.push(marker);

                var li = document.createElement('li');
                li.textContent = (p.getName() || '(' + (p.getType() || 'unnamed') + ')');
                var small = document.createElement('small');
                var bits = [];
                if (p.getType()) bits.push(p.getType());
                if (p.getDistance() !== null) bits.push(Math.round(p.getDistance()) + ' m');
                if (p.getDuration() !== null) bits.push(Math.round(p.getDuration()) + ' s');
                if (p.getTelephone()) bits.push(p.getTelephone());
                small.textContent = bits.length ? '  ' + bits.join(' · ') : '';
                li.appendChild(small);
                li.addEventListener('click', function() {
                    map.move(c.getLon(), c.getLat(), 17);
                });
                listEl.appendChild(li);
            });
            setStatus('Found ' + points.length + ' POI' + (points.length > 1 ? 's' : ''), 'ok');
        }).catch(function(err) {
            console.error(err);
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    }

    map.on(bemap.Map.EventType.CLICK, function(evt) {
        var c = evt.getCoordinate ? evt.getCoordinate() : evt.coordinate;
        if (c) searchAt(c);
    });

})();
