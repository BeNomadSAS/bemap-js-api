/**
 * Charging Stations v2 demo — bemap.ChargingStations.
 *
 * Click the map; the demo calls
 *   POST service/chargingstation/search/1.0
 * with the active geoserver (from the sidebar dropdown) and the active
 * charging-station provider (read from `bemapMainCtx.chargingStationProvider`).
 *
 * Server contract cross-checked against
 * `bemap_idea/.../service/v1_0_0/ChargingStationController.java`.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 13);
    var service = new bemap.ChargingStations(bemapMainCtx);

    var centerMarker = null;
    var poolMarkers = [];
    var statusEl = document.getElementById('cs-status');
    var listEl = document.getElementById('cs-results');

    // ---- Copy-paste code panel ----
    var lastCoord = { lon: 2.35, lat: 48.85 };
    var snippet = bemap.demoSnippet.attach(document.querySelector('.panel-v2'), {
        title: 'Code example — copy & paste'
    });
    function refreshSnippet() {
        snippet.setContext(bemap.demoSnippet.contextLine(bemapMainCtx));
        var provider = bemapMainCtx.chargingStationProvider || 'ecoMovement';
        snippet.setRequest(bemap.demoSnippet.requestSnippet('ChargingStationSearchRequest', {
            providers: [provider],
            mode: '/*RAW*/bemap.ChargingStationMode.' + document.getElementById('cs-mode').value,
            options: ['/*RAW*/bemap.ChargingStationOption.' + document.getElementById('cs-depth').value],
            coordinate: '/*RAW*/new bemap.Coordinate(' + lastCoord.lon + ', ' + lastCoord.lat + ')',
            radius: parseInt(document.getElementById('cs-radius').value, 10) || 2000,
            maxPoolResult: parseInt(document.getElementById('cs-max').value, 10) || 25
        }));
        snippet.setCall([
            "var cs = new bemap.ChargingStations(ctx);",
            "cs.search(req).then(function(response) {",
            "    response.getPools().forEach(function(pool) {",
            "        console.log(pool.getName(), pool.getCoordinate(), pool.getMaxNominalPower() + ' kW');",
            "    });",
            "}).catch(function(err) {",
            "    console.error(err.getMessage());",
            "});"
        ].join('\n'));
        snippet.setResponse('(call the service to see a real response)');
    }
    refreshSnippet();
    ['cs-radius', 'cs-max', 'cs-mode', 'cs-depth'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', refreshSnippet);
    });

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }

    function clearMarkers() {
        for (var i = 0; i < poolMarkers.length; i++) {
            try { map.removeMarker(poolMarkers[i]); } catch (e) {}
        }
        poolMarkers = [];
    }

    function searchAt(coord) {
        var provider = bemapMainCtx.chargingStationProvider;
        if (!provider) {
            setStatus('No charging-station provider in your ACL. Pick one in the sidebar.', 'error');
            return;
        }

        lastCoord = { lon: coord.getLon(), lat: coord.getLat() };
        refreshSnippet();

        clearMarkers();
        listEl.innerHTML = '';
        if (centerMarker) { try { map.removeMarker(centerMarker); } catch (e) {} }
        centerMarker = new bemap.Marker(coord, { id: 'cs-center' });
        map.addMarker(centerMarker);

        var req = new bemap.ChargingStationSearchRequest({
            providers: [provider],
            mode: document.getElementById('cs-mode').value,
            options: [document.getElementById('cs-depth').value],
            coordinate: coord,
            radius: parseInt(document.getElementById('cs-radius').value, 10) || 2000,
            maxPoolResult: parseInt(document.getElementById('cs-max').value, 10) || 25
        });

        setStatus('Calling /service/chargingstation/search/1.0 ...');
        service.search(req).then(function(response) {
            snippet.setResponse(response);
            var pools = response.getPools();
            if (!pools.length) {
                setStatus('No pool found in this area for provider "' + provider + '"', 'error');
                return;
            }

            pools.forEach(function(p, idx) {
                var c = p.getCoordinate();
                if (!c) return;
                var marker = new bemap.Marker(c, { id: 'cs-' + idx });
                map.addMarker(marker);
                poolMarkers.push(marker);

                var li = document.createElement('li');
                var name = p.getName() || p.getBrand() || ('Pool ' + (p.getId() || idx));
                li.textContent = name;
                var small = document.createElement('small');
                var bits = [];
                if (p.getMaxNominalPower()) bits.push(p.getMaxNominalPower() + ' kW max');
                if (p.getNumberOfChargingPoint()) bits.push(p.getNumberOfChargingPoint() + ' point(s)');
                if (p.getAvailabilityStatus()) bits.push(p.getAvailabilityStatus());
                var addr = p.getFormattedAddress();
                if (addr) bits.push(addr);
                small.textContent = bits.length ? '  ' + bits.join(' · ') : '';
                li.appendChild(small);
                li.addEventListener('click', function() {
                    map.move(c.getLon(), c.getLat(), 17);
                });
                listEl.appendChild(li);
            });
            setStatus('Found ' + pools.length + ' pool' + (pools.length > 1 ? 's' : '') + ' (' + provider + ')', 'ok');
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
