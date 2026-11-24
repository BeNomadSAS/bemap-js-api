/**
 * EV Reachable Area v2 demo — bemap.EvReachableArea.
 *
 * Click the map to drop a start point → polygon of the EV-reachable
 * area is drawn. Brand + model picker chained from bemap.EvVehicles.
 * Optional "Overlay 50/70/90 %" toggle uses
 * combineMultipleBatteryLevels() to draw three concentric polygons.
 *
 * Real-time updates on input changes use debounce + AbortController
 * (mirrors the pattern in routing-isochrone.js).
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 9);
    var era = new bemap.EvReachableArea(bemapMainCtx);
    var evv = new bemap.EvVehicles(bemapMainCtx);

    var brandSel = document.getElementById('era-brand');
    var vehicleSel = document.getElementById('era-vehicle');
    var batEl = document.getElementById('era-bat');
    var tempEl = document.getElementById('era-temp');
    var payloadEl = document.getElementById('era-payload');
    var overlayChk = document.getElementById('era-overlay');
    var statusEl = document.getElementById('era-status');
    var summaryEl = document.getElementById('era-summary');

    var startMarker = null;
    var startCoord = null;
    var polygons = [];
    var pendingAbort = null;
    var debounceTimer = null;

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
        var lon = startCoord ? startCoord.getLon() : 2.35;
        var lat = startCoord ? startCoord.getLat() : 48.85;
        snippet.setRequest(bemap.demoSnippet.requestSnippet('EvReachableAreaRequest', {
            start: '/*RAW*/new bemap.Coordinate(' + lon + ', ' + lat + ')',
            vehicle: vehicleSel.value || '/*RAW*/\'<vehicle-uuid>\'',
            temperature: parseInt(tempEl.value, 10) || 18,
            initBatteryLevel: parseFloat(batEl.value) || 80,
            payload: parseInt(payloadEl.value, 10) || 75
        }));
        snippet.setCall([
            "var era = new bemap.EvReachableArea(ctx);",
            (overlayChk.checked
              ? "era.combineMultipleBatteryLevels(req, [50, 70, 90]).then(function(results) {\n    results.forEach(function(r) {\n        map.addPolygon(new bemap.Polygon(r.response.getPolygon(), { style: ... }));\n    });\n});"
              : "era.compute(req).then(function(response) {\n    var polygon = new bemap.Polygon(response.getPolygon(), {\n        style: new bemap.PolygonStyle({ fillColor: new bemap.Color(142, 68, 173, 0.2) })\n    });\n    map.addPolygon(polygon);\n}).catch(function(err) {\n    if (err.getCode() === bemap.Error.REACHABLE_AREA_FAILED) noAreaUI();\n    else console.error(err.getMessage());\n});")
        ].join('\n'));
    }
    refreshSnippet();

    function clearPolygons() {
        polygons.forEach(function(p) { try { map.removePolygon(p); } catch (e) {} });
        polygons = [];
    }

    function drawSingle(response, batteryLevel, alpha) {
        var coords = response.getPolygon();
        if (!coords.length) return;
        var fill = new bemap.Color(142, 68, 173, alpha || 0.2);
        var stroke = new bemap.Color(142, 68, 173, 1);
        var poly = new bemap.Polygon(coords, {
            style: new bemap.PolygonStyle({ fillColor: fill, strokeColor: stroke, width: 2 }),
            id: 'era-poly-' + (batteryLevel || 'main')
        });
        map.addPolygon(poly);
        polygons.push(poly);
    }

    function abortPending() {
        if (pendingAbort) { try { pendingAbort.abort(); } catch (e) {} pendingAbort = null; }
    }

    function compute() {
        if (!startCoord) return;
        if (!vehicleSel.value) { setStatus('Pick a vehicle first.', 'error'); return; }

        abortPending();
        var ac = (typeof AbortController === 'function') ? new AbortController() : null;
        pendingAbort = ac;

        var baseReq = new bemap.EvReachableAreaRequest({
            start: startCoord,
            vehicle: vehicleSel.value,
            temperature: parseInt(tempEl.value, 10) || 18,
            initBatteryLevel: parseFloat(batEl.value) || 80,
            payload: parseInt(payloadEl.value, 10) || 75
        });

        setStatus('Calling /service/evreachablearea/1.0 …');
        clearPolygons();

        if (overlayChk.checked) {
            era.combineMultipleBatteryLevels(baseReq, [50, 70, 90], { signal: ac ? ac.signal : undefined })
                .then(function(results) {
                    pendingAbort = null;
                    // Outer first (highest battery), inner last so the small one is on top.
                    results.sort(function(a, b) { return b.batteryLevel - a.batteryLevel; });
                    results.forEach(function(r, i) {
                        drawSingle(r.response, r.batteryLevel, 0.12 + i * 0.07);
                    });
                    snippet.setResponse({ levels: results.map(function(r) {
                        return { batteryLevel: r.batteryLevel, polygonVertices: r.response.getPolygon().length };
                    }) });
                    summaryEl.className = 'status ok';
                    summaryEl.innerHTML = 'Drew 3 polygons (50 / 70 / 90 %).';
                    setStatus('Done.', 'ok');
                }).catch(handleErr);
        } else {
            era.compute(baseReq, { signal: ac ? ac.signal : undefined })
                .then(function(response) {
                    pendingAbort = null;
                    snippet.setResponse(response);
                    drawSingle(response, null, 0.22);
                    var bbox = response.getBoundingBox();
                    if (bbox && typeof map.moveToBoundingBox === 'function') {
                        try { map.moveToBoundingBox(bbox); } catch (e) {}
                    }
                    summaryEl.className = 'status ok';
                    summaryEl.innerHTML = 'Polygon: <strong>' + response.getPolygon().length + '</strong> vertices.';
                    setStatus('Done.', 'ok');
                }).catch(handleErr);
        }
    }

    function handleErr(err) {
        pendingAbort = null;
        if (err && err.getCode && err.getCode() === bemap.Error.ABORTED) return;
        setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        summaryEl.textContent = '';
    }

    function scheduleCompute() {
        if (!startCoord || !vehicleSel.value) return;
        refreshSnippet();
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(compute, 300);
    }

    map.on(bemap.Map.EventType.CLICK, function(evt) {
        var c = evt.getCoordinate ? evt.getCoordinate() : evt.coordinate;
        if (!c) return;
        startCoord = c;
        if (startMarker) { try { map.removeMarker(startMarker); } catch (e) {} }
        startMarker = new bemap.Marker(c, { id: 'era-start' });
        map.addMarker(startMarker);
        scheduleCompute();
    });

    ['era-bat', 'era-temp', 'era-payload'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', scheduleCompute);
    });
    overlayChk.addEventListener('change', scheduleCompute);
    vehicleSel.addEventListener('change', scheduleCompute);

    function loadVehicles(brandId) {
        vehicleSel.innerHTML = '<option>Loading…</option>';
        evv.list({ brandId: brandId }).then(function(vehicles) {
            vehicleSel.innerHTML = '';
            if (!vehicles.length) {
                vehicleSel.innerHTML = '<option value="">(none)</option>';
                return;
            }
            vehicles.forEach(function(v) {
                var opt = document.createElement('option');
                opt.value = v.getKey(); opt.textContent = v.getDisplayLabel();
                vehicleSel.appendChild(opt);
            });
            refreshSnippet();
        });
    }
    brandSel.addEventListener('change', function() {
        if (brandSel.value) loadVehicles(brandSel.value);
    });

    // Boot
    evv.brands().then(function(brands) {
        brandSel.innerHTML = '';
        if (!brands.length) {
            brandSel.innerHTML = '<option value="">(none)</option>';
            setStatus('Your ACL exposes no EV brands.', 'error');
            return;
        }
        var first = document.createElement('option');
        first.value = ''; first.textContent = 'Pick a brand…';
        brandSel.appendChild(first);
        brands.forEach(function(b) {
            var opt = document.createElement('option');
            opt.value = b.getId(); opt.textContent = b.getLabel();
            brandSel.appendChild(opt);
        });
    }).catch(function(err) {
        setStatus('Could not load brands: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
    });

})();
