/**
 * GeoAutocomplete v2 demo — Promise-based autocomplete() forcing
 * addressDetails: true so every item carries a PostalAddress and
 * (when resolvable) a Coordinate.
 *
 * We drive the input ourselves rather than reusing attachToInput because
 * we want full control over how the structured results are rendered.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 11);
    var ga = new bemap.GeoAutocomplete(bemapMainCtx);

    var input = document.getElementById('ga-input');
    var statusEl = document.getElementById('ga-status');
    var listEl = document.getElementById('ga-results');
    var marker = null;
    var typingTimer = null;
    var controller = null;

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
        snippet.setRequest(bemap.demoSnippet.requestSnippet('AutocompleteGeocodingRequest', {
            place: input.value || 'your-search-text',
            coordinate: '/*RAW*/new bemap.Coordinate(2.35, 48.85)',
            language: 'fr'
        }));
        snippet.setCall([
            "var ga = new bemap.GeoAutocomplete(ctx);",
            "ga.autocomplete(req).then(function(response) {",
            "    response.getItems().forEach(function(el) {",
            "        var addr = el.getPostalAddress();",
            "        var c = el.getCoordinate();",
            "        console.log(el.getPlace(), addr && addr.getCity(), c && c.getLon(), c && c.getLat());",
            "    });",
            "}).catch(function(err) {",
            "    if (err.getCode() === bemap.Error.ABORTED) return;",
            "    console.error(err.getMessage());",
            "});"
        ].join('\n'));
    }
    refreshSnippet();
    input.addEventListener('input', refreshSnippet);

    function pick(element) {
        var c = element.getCoordinate();
        var addr = element.getPostalAddress();
        var parts = [];
        if (addr) {
            if (addr.getStreetNumber()) parts.push(addr.getStreetNumber());
            if (addr.getStreet()) parts.push(addr.getStreet());
            if (addr.getCity()) parts.push(addr.getCity());
            if (addr.getCountry()) parts.push(addr.getCountry());
        }
        var label = parts.length ? parts.join(', ') : element.getPlace();
        input.value = label;
        listEl.innerHTML = '';

        if (c) {
            if (marker) { try { map.removeMarker(marker); } catch (e) {} }
            marker = new bemap.Marker(c, { id: 'ga-pick' });
            map.addMarker(marker);
            map.move(c.getLon(), c.getLat(), 15);
            setStatus('Picked: ' + label + '  ·  (' + c.getLon().toFixed(4) + ', ' + c.getLat().toFixed(4) + ')', 'ok');
        } else {
            setStatus('Picked (no coordinate): ' + label, 'ok');
        }
    }

    function renderItems(items) {
        listEl.innerHTML = '';
        if (!items.length) { setStatus('No suggestion'); return; }
        items.forEach(function(el) {
            var li = document.createElement('li');
            var addr = el.getPostalAddress();
            li.textContent = el.getPlace();
            if (addr) {
                var small = document.createElement('small');
                var bits = [];
                if (addr.getCity()) bits.push(addr.getCity());
                if (addr.getCountry()) bits.push(addr.getCountry());
                small.textContent = bits.length ? '  ' + bits.join(' · ') : '';
                li.appendChild(small);
            }
            li.addEventListener('mousedown', function(ev) { ev.preventDefault(); pick(el); });
            listEl.appendChild(li);
        });
        setStatus('Showing ' + items.length + ' suggestion' + (items.length === 1 ? '' : 's'));
    }

    function fireQuery() {
        var value = input.value;
        if (!value || value.length < 2) { listEl.innerHTML = ''; setStatus('Type at least 2 characters.'); return; }

        if (controller && typeof controller.abort === 'function') {
            try { controller.abort(); } catch (e) { /* ignore */ }
        }
        controller = (typeof AbortController === 'function') ? new AbortController() : null;

        var req = new bemap.AutocompleteGeocodingRequest({
            place: value,
            coordinate: new bemap.Coordinate(2.35, 48.85),
            language: 'fr'
        });

        setStatus('Calling /service/geocoding/autocomplete/1.0 ...');
        ga.autocomplete(req, { signal: controller ? controller.signal : undefined })
            .then(function(response) {
                snippet.setResponse(response);
                renderItems(response.getItems());
            })
            .catch(function(err) {
                if (err && err.getCode && err.getCode() === bemap.Error.ABORTED) return;
                setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
            });
    }

    input.addEventListener('input', function() {
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(fireQuery, 220);
    });

})();
