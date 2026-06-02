/**
 * Geocoder v2 demo — Promise-based geocoding via bemap.GeocodingRequest.
 *
 * Pattern shown:
 *   var geocoder = new bemap.Geocoder(bemapMainCtx);
 *   geocoder.geocode(new bemap.GeocodingRequest({...}))
 *           .then(function(response) { ... });
 *
 * The map engine (OL / Leaflet / MapLibre) is chosen by the dashboard's
 * "Map Provider" dropdown — bemap.createMap() resolves it from localStorage.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 12);
    var geocoder = new bemap.Geocoder(bemapMainCtx);

    var markers = [];
    var statusEl = document.getElementById('g-status');
    var listEl = document.getElementById('g-results');

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }

    // ---- Copy-paste code panel ----
    var snippet = bemap.demoSnippet.attach(document.querySelector('.panel-v2'), {
        title: 'Code example — copy & paste'
    });
    function refreshSnippet() {
        snippet.setContext(bemap.demoSnippet.contextLine(bemapMainCtx));
        var opts = {
            place: document.getElementById('g-place').value || 'your-address',
            language: document.getElementById('g-lang').value || null,
            maxResult: parseInt(document.getElementById('g-max').value, 10) || 5
        };
        var stype = document.getElementById('g-stype').value;
        if (stype) opts.searchType = '/*RAW*/bemap.GeocodingSearchType.' + stype;
        var country = document.getElementById('g-country').value;
        if (country) opts.address = '/*RAW*/new bemap.Address({ country: ' + JSON.stringify(country) + ' })';
        snippet.setRequest(bemap.demoSnippet.requestSnippet('GeocodingRequest', opts));
        snippet.setCall([
            "var geocoder = new bemap.Geocoder(ctx);",
            "geocoder.geocode(req).then(function(response) {",
            "    response.getGeocodingItems().forEach(function(item) {",
            "        var c = bemap.geocoderHelpers.toCoordinate(item);",
            "        console.log(bemap.geocoderHelpers.formatAddress(item), c && c.getLon(), c && c.getLat());",
            "    });",
            "}).catch(function(err) { console.error(err.getMessage()); });"
        ].join('\n'));
    }
    refreshSnippet();
    ['g-place', 'g-lang', 'g-max', 'g-stype', 'g-country'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', refreshSnippet);
        if (el) el.addEventListener('change', refreshSnippet);
    });

    function clearResults() {
        for (var i = 0; i < markers.length; i++) {
            try { map.removeMarker(markers[i]); } catch (e) { /* ignore */ }
        }
        markers = [];
        listEl.innerHTML = '';
        setStatus('');
    }

    function renderResults(response) {
        listEl.innerHTML = '';
        var items = response.getGeocodingItems();
        if (!items.length) {
            setStatus('No result for this query', 'error');
            return;
        }

        var firstCoord = null;
        items.forEach(function(item, idx) {
            var coord = bemap.geocoderHelpers.toCoordinate(item);
            if (!coord) return;
            if (!firstCoord) firstCoord = coord;

            var marker = new bemap.Marker(coord, { id: 'g-' + idx });
            map.addMarker(marker);
            markers.push(marker);

            var li = document.createElement('li');
            li.textContent = bemap.geocoderHelpers.formatAddress(item);
            var hint = document.createElement('small');
            hint.textContent = '  (' + coord.getLon().toFixed(4) + ', ' + coord.getLat().toFixed(4) + ')';
            li.appendChild(hint);
            li.addEventListener('click', function() {
                map.move(coord.getLon(), coord.getLat(), 15);
            });
            listEl.appendChild(li);
        });

        if (firstCoord) map.move(firstCoord.getLon(), firstCoord.getLat(), 13);
        setStatus('Got ' + items.length + ' result' + (items.length > 1 ? 's' : ''), 'ok');
    }

    document.getElementById('g-go').addEventListener('click', function() {
        clearResults();
        setStatus('Calling /service/geocoding/autocomplete/1.0 (forward geocoder rides the autocomplete endpoint) ...');

        var req = new bemap.GeocodingRequest({
            place: document.getElementById('g-place').value || null,
            language: document.getElementById('g-lang').value || null,
            maxResult: parseInt(document.getElementById('g-max').value, 10) || 5
        });
        var stype = document.getElementById('g-stype').value;
        if (stype) req.setSearchType(stype);

        var country = document.getElementById('g-country').value;
        if (country) req.setAddress(new bemap.Address({ country: country }));

        geocoder.geocode(req)
            .then(function(response) { snippet.setResponse(response); renderResults(response); })
            .catch(function(err) {
                console.error(err);
                setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
            });
    });

    document.getElementById('g-clear').addEventListener('click', clearResults);

})();
