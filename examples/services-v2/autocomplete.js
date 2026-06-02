/**
 * Autocomplete v2 demo — bemap.Autocomplete.attachToInput.
 *
 * Wires a plain <input> to the autocomplete service with debounce,
 * in-flight cancellation and keyboard navigation. No jQuery.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 11);
    var ac = new bemap.Autocomplete(bemapMainCtx);

    var marker = null;
    var statusEl = document.getElementById('ac-status');

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }

    // ---- Copy-paste code panel ----
    var snippet = bemap.demoSnippet.attach(document.querySelector('.panel-v2'), {
        title: 'Code example — copy & paste'
    });
    snippet.setContext(bemap.demoSnippet.contextLine(bemapMainCtx));
    snippet.setRequest(bemap.demoSnippet.requestSnippet('AutocompleteGeocodingRequest', {
        place: 'your-search-text',
        proximity: '/*RAW*/new bemap.Coordinate(2.35, 48.85)',
        language: 'fr',
        maxResult: 10
    }));
    snippet.setCall([
        "var ac = new bemap.Autocomplete(ctx);",
        "// Option A — wire to a plain <input> (debounce + abort + keyboard nav):",
        "ac.attachToInput(document.getElementById('input'), {",
        "    proximity: new bemap.Coordinate(2.35, 48.85),",
        "    language: 'fr',",
        "    maxResult: 10,",
        "    debounceMs: 200,",
        "    minChars: 2,",
        "    onSelect: function(element) { console.log(element.getPlace()); },",
        "    onResults: function(items)  { console.log(items.length); },",
        "    onError:   function(err)    { console.error(err.getMessage()); }",
        "});",
        "",
        "// Option B — one-shot call:",
        "ac.autocomplete(req).then(function(response) {",
        "    response.getElements().forEach(function(e) { console.log(e.getPlace()); });",
        "});"
    ].join('\n'));
    snippet.setResponse('(type in the box to see a real response)');

    ac.attachToInput(document.getElementById('ac-input'), {
        proximity: new bemap.Coordinate(2.35, 48.85),
        language: 'fr',
        maxResult: 10,
        debounceMs: 200,
        minChars: 2,
        onSelect: function(element) {
            setStatus('Picked: ' + element.getPlace(), 'ok');
            // If the worker supplied a coordinate, jump to it.
            var c = element.getCoordinate();
            if (c) {
                if (marker) { try { map.removeMarker(marker); } catch (e) {} }
                marker = new bemap.Marker(c, { id: 'ac-pick' });
                map.addMarker(marker);
                map.move(c.getLon(), c.getLat(), 14);
            } else {
                setStatus('Picked: ' + element.getPlace() + ' (no resolved coordinate — try GeoAutocomplete for postal address + coordinate)', 'ok');
            }
        },
        onResults: function(items) {
            setStatus('Showing ' + items.length + ' suggestion' + (items.length === 1 ? '' : 's'));
            snippet.setResponse({ elements: items.map(function(e) {
                return { place: e.getPlace(), lon: e.getCoordinate() ? e.getCoordinate().getLon() : null, lat: e.getCoordinate() ? e.getCoordinate().getLat() : null };
            }) });
        },
        onError: function(err) {
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        }
    });

})();
