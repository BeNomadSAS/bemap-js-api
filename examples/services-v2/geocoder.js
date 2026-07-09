/**
 * Geocoder v2 demo — Promise-based forward geocoding via bemap.GeocodingRequest.
 *
 * Forward geocoding rides the autocomplete endpoint
 * (service/geocoding/autocomplete/1.0) and is served by the geoservers that
 * expose it — in practice HERE HLP (autosuggest) and Nominatim (OSM). This demo
 * DISCOVERS which of those the account actually has — from the ACL profile
 * (bemap.helpers.listGeoservers → getCurrentUserDetails().getGeoservers()), the
 * same authoritative list the dashboard's geoserver dropdown uses — and lets you
 * pick between them. It never assumes a single hardcoded provider.
 *
 * Pattern shown:
 *   var geocoder = new bemap.Geocoder(ctx);
 *   geocoder.geocode(new bemap.GeocodingRequest({ place, proximity, addressDetails }),
 *                    { geoserver: 'nominatim' })   // or 'herehlp'
 *           .then(function(response) { ... });
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 12);
    var geocoder = new bemap.Geocoder(bemapMainCtx);

    var markers = [];
    var statusEl     = document.getElementById('g-status');
    var listEl       = document.getElementById('g-results');
    var geoserverSel = document.getElementById('g-geoserver');
    var addrSel      = document.getElementById('g-addr');
    var noticeEl     = document.getElementById('g-notice');
    var goBtn        = document.getElementById('g-go');

    if (goBtn) goBtn.disabled = true;   // enabled once a provider is discovered

    // Forward-geocoding providers, in preference order. Only those the account
    // actually exposes (∩ the ACL geoserver list, see detectProviders) are offered.
    //
    // TODO: stop hardcoding this list — detect forward-geocoders dynamically.
    // The clean way is geoServerInfo/1.0 per geoserver → offer any whose
    // servicesInfo includes 'AutocompleteGeocoding'/'Geocoding'. That does NOT
    // work today for HERE HLP: the backend HerehlpGeoServerInfoService.render()
    // (bemap_idea) never calls response.setServicesInfo(...), so
    // geoServerInfo('herehlp') returns an EMPTY servicesInfo even though herehlp
    // does forward-geocode. Until that backend gap is fixed we fall back to this
    // known-good candidate set intersected with the account's geoservers. Once
    // herehlp reports its services, switch detectProviders() to a servicesInfo/
    // hasService('AutocompleteGeocoding') sweep over ALL account geoservers and
    // delete this list.
    var CANDIDATES = [
        { key: 'herehlp',   label: 'HERE HLP (autosuggest)' },
        { key: 'nominatim', label: 'Nominatim (OpenStreetMap)' }
    ];
    function candidateLabel(key) {
        for (var i = 0; i < CANDIDATES.length; i++) if (CANDIDATES[i].key === key) return CANDIDATES[i].label;
        return key;
    }

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }
    function setNotice(text, kind) {
        if (!noticeEl) return;
        noticeEl.textContent = text;
        noticeEl.style.borderLeftColor = kind === 'error' ? '#c0392b'
                                       : (kind === 'ok' ? '#16a085' : '#e67e22');
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
            maxResult: parseInt(document.getElementById('g-max').value, 10) || 5,
            // A location bias is REQUIRED server-side (coordinate) for both
            // providers — herehlp autosuggest needs `at`, nominatim needs it too.
            proximity: '/*RAW*/map.getCenter()',
            addressDetails: !(addrSel && addrSel.value === 'false')
        };
        var stype = document.getElementById('g-stype').value;
        if (stype) opts.searchType = '/*RAW*/bemap.GeocodingSearchType.' + stype;
        var country = document.getElementById('g-country').value;
        if (country) opts.address = '/*RAW*/new bemap.Address({ countryCode: ' + JSON.stringify(country) + ' })';
        snippet.setRequest(bemap.demoSnippet.requestSnippet('GeocodingRequest', opts));
        var gs = (geoserverSel && geoserverSel.value) || 'herehlp';
        snippet.setCall([
            "var geocoder = new bemap.Geocoder(ctx);",
            "geocoder.geocode(req, { geoserver: " + JSON.stringify(gs) + " }).then(function(response) {",
            "    response.getGeocodingItems().forEach(function(item) {",
            "        var c = bemap.geocoderHelpers.toCoordinate(item);",
            "        console.log(bemap.geocoderHelpers.formatAddress(item), c && c.getLon(), c && c.getLat());",
            "    });",
            "}).catch(function(err) { console.error(err.getMessage()); });"
        ].join('\n'));
    }
    refreshSnippet();
    ['g-place', 'g-lang', 'g-max', 'g-stype', 'g-country', 'g-geoserver', 'g-addr'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', refreshSnippet);
        if (el) el.addEventListener('change', refreshSnippet);
    });

    // ---- Provider discovery (availability-driven UX) ----
    // The authoritative source for "which geoservers does this account have" is
    // the ACL user profile — AclService.getCurrentUserDetails().getGeoservers(),
    // surfaced by bemap.helpers.listGeoservers(ctx). We keep the forward-geocoding
    // candidates whose geoserver key the account actually exposes (e.g. an account
    // that lists "herehlp" gets HERE HLP offered). This is the same list the
    // dashboard's geoserver dropdown is built from — no getGeoServerInfo probe,
    // whose per-geoserver servicesInfo names are not reliable for this check.
    function detectProviders() {
        if (!bemap.helpers || typeof bemap.helpers.listGeoservers !== 'function') {
            return Promise.resolve(CANDIDATES.map(function (c) { return c.key; }));
        }
        return bemap.helpers.listGeoservers(bemapMainCtx).then(function (labels) {
            var have = {};
            (labels || []).forEach(function (l) {
                var k = (l && typeof l.getKey === 'function') ? l.getKey() : (l && l.key);
                if (k) have[String(k).toLowerCase()] = true;
            });
            var out = [];
            CANDIDATES.forEach(function (c) { if (have[c.key]) out.push(c.key); });
            return out;
        });
    }

    function fillProviders(available) {
        geoserverSel.innerHTML = '';
        if (!available.length) {
            geoserverSel.innerHTML = '<option value="">(none available)</option>';
            geoserverSel.disabled = true;
            if (goBtn) goBtn.disabled = true;
            setNotice('Your account has no forward-geocoding provider — it needs Nominatim or HERE HLP. Ask your BeMap admin.', 'error');
            return;
        }
        available.forEach(function (key) {
            var opt = document.createElement('option');
            opt.value = key;
            opt.textContent = candidateLabel(key);
            geoserverSel.appendChild(opt);
        });
        // Default to the dashboard's selected geoserver when it is one of these.
        var saved = null;
        try { saved = String(localStorage.getItem('bemap-geoserver') || '').toLowerCase(); } catch (e) { /* ignore */ }
        if (saved && available.indexOf(saved) > -1) geoserverSel.value = saved;
        geoserverSel.disabled = (available.length < 2);   // no point offering a single-item select
        if (goBtn) goBtn.disabled = false;
        setNotice(available.length > 1
            ? 'Forward geocoding available via ' + available.map(candidateLabel).join(' and ') + '. Pick a provider above — a location bias (the map centre) is sent automatically.'
            : 'Forward geocoding via ' + candidateLabel(available[0]) + '. A location bias (the map centre) is sent automatically.', 'ok');
        refreshSnippet();
    }

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

    goBtn.addEventListener('click', function() {
        var chosen = geoserverSel && geoserverSel.value;
        if (!chosen) { setStatus('No forward-geocoding provider available for your account.', 'error'); return; }
        clearResults();
        setStatus('Calling /service/geocoding/autocomplete/1.0 via "' + chosen + '" …');

        var req = new bemap.GeocodingRequest({
            place: document.getElementById('g-place').value || null,
            language: document.getElementById('g-lang').value || null,
            maxResult: parseInt(document.getElementById('g-max').value, 10) || 5,
            // `coordinate` is required server-side for BOTH providers (herehlp
            // autosuggest `at` bias, and nominatim). Send the current map centre.
            proximity: map.getCenter() || new bemap.Coordinate(2.35, 48.85),
            addressDetails: !(addrSel && addrSel.value === 'false')
        });
        var stype = document.getElementById('g-stype').value;
        if (stype) req.setSearchType(stype);

        var country = document.getElementById('g-country').value;
        if (country) req.setAddress(new bemap.Address({ countryCode: country }));

        // Target the chosen geoserver explicitly (goes into the request body).
        geocoder.geocode(req, { geoserver: chosen })
            .then(function(response) { snippet.setResponse(response); renderResults(response); })
            .catch(function(err) {
                console.error(err);
                setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
            });
    });

    document.getElementById('g-clear').addEventListener('click', clearResults);

    // Kick off provider discovery; fall back to offering both if the info call fails.
    setNotice('Checking which forward-geocoding providers your account has…');
    detectProviders()
        .then(fillProviders)
        .catch(function () { fillProviders(CANDIDATES.map(function (c) { return c.key; })); });

})();
