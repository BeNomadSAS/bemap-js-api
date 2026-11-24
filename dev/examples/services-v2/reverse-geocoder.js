/**
 * Reverse Geocoder v2 demo — stand-alone bemap.ReverseGeocoder service.
 *
 * Click anywhere on the map; the demo issues a typed
 * ReverseGeocodingRequest and renders the resolved postal address.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 13);
    var rev = new bemap.ReverseGeocoder(bemapMainCtx);

    var marker = null;
    var statusEl = document.getElementById('r-status');
    var listEl = document.getElementById('r-results');

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
            radius: parseInt(document.getElementById('r-radius').value, 10) || 100,
            language: document.getElementById('r-lang').value || null,
            maxResult: parseInt(document.getElementById('r-max').value, 10) || 1
        };
        var mode = document.getElementById('r-mode').value;
        if (mode) opts.transportMode = '/*RAW*/bemap.TransportMode.' + mode;
        opts.options = [
            '/*RAW*/bemap.RevGeocodingOptions.ROAD_FEATURE',
            '/*RAW*/bemap.RevGeocodingOptions.URBAN_AREA'
        ];
        snippet.setRequest(bemap.demoSnippet.requestSnippet('ReverseGeocodingRequest', opts));
        snippet.setCall([
            "var rev = new bemap.ReverseGeocoder(ctx);",
            "rev.revGeo(req).then(function(response) {",
            "    response.getGeocodingItems().forEach(function(item) {",
            "        console.log(bemap.geocoderHelpers.formatAddress(item));",
            "    });",
            "}).catch(function(err) { console.error(err.getMessage()); });"
        ].join('\n'));
    }
    refreshSnippet();
    ['r-radius', 'r-lang', 'r-max', 'r-mode'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', refreshSnippet);
        if (el) el.addEventListener('change', refreshSnippet);
    });

    function reverseAt(coord) {
        lastCoord = { lon: coord.getLon(), lat: coord.getLat() };
        refreshSnippet();
        listEl.innerHTML = '';
        if (marker) { try { map.removeMarker(marker); } catch (e) {} marker = null; }
        marker = new bemap.Marker(coord, { id: 'r-click' });
        map.addMarker(marker);
        setStatus('Calling /service/geocoding/1.0/reverse ...');

        var mode = document.getElementById('r-mode').value;
        var req = new bemap.ReverseGeocodingRequest({
            coordinate: coord,
            radius: parseInt(document.getElementById('r-radius').value, 10) || 100,
            language: document.getElementById('r-lang').value || null,
            maxResult: parseInt(document.getElementById('r-max').value, 10) || 1,
            transportMode: mode || null,
            options: [
                bemap.RevGeocodingOptions.ROAD_FEATURE,
                bemap.RevGeocodingOptions.URBAN_AREA
            ]
        });

        rev.revGeo(req).then(function(response) {
            snippet.setResponse(response);
            var items = response.getGeocodingItems();
            if (!items.length) { setStatus('No address found at this point', 'error'); return; }
            items.forEach(function(item) {
                var li = document.createElement('li');
                li.textContent = bemap.geocoderHelpers.formatAddress(item);
                listEl.appendChild(li);
            });
            setStatus('Resolved ' + items.length + ' address' + (items.length > 1 ? 'es' : ''), 'ok');
        }).catch(function(err) {
            console.error(err);
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    }

    map.on(bemap.Map.EventType.CLICK, function(evt) {
        var c = evt.getCoordinate ? evt.getCoordinate() : evt.coordinate;
        if (!c) return;
        reverseAt(c);
    });

})();
