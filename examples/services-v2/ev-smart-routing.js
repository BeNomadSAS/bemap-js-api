/**
 * EV Smart Routing v2 demo — bemap.EvSmartRouting.
 *
 * 1st map click → start point. 2nd map click → stop point. Hit Calculate.
 * The demo calls `POST service/evsmartrouting/1.0` with the configured
 * EV and the active CSP from the sidebar.
 *
 * Server contract cross-checked against
 * `bemap_idea/.../service/v1_0_0/EvSmartRoutingController.java`.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 6);
    var router = new bemap.EvSmartRouting(bemapMainCtx);

    var startCoord = null;
    var stopCoord = null;
    var startMarker = null;
    var stopMarker = null;
    var routePolyline = null;
    var stopMarkers = [];

    var statusEl = document.getElementById('ev-status');
    var summaryEl = document.getElementById('ev-summary');
    var stepsEl = document.getElementById('ev-steps');
    var brandSel = document.getElementById('ev-brand');
    var vehicleSel = document.getElementById('ev-vehicle-sel');
    var vehicleFallback = document.getElementById('ev-vehicle-fallback');
    var evv = new bemap.EvVehicles(bemapMainCtx);

    // Reads the active vehicle key from the dropdown (preferred) or the
    // fallback text input (when the user's ACL has no EV brands).
    function getVehicleKey() {
        if (vehicleSel && vehicleSel.value) return vehicleSel.value;
        var fallbackInput = document.getElementById('ev-vehicle');
        return fallbackInput ? (fallbackInput.value || '').trim() : '';
    }

    // ---- Copy-paste code panel ----
    var snippet = bemap.demoSnippet.attach(document.querySelector('.panel-v2'), {
        title: 'Code example — copy & paste'
    });
    function refreshSnippet() {
        snippet.setContext(bemap.demoSnippet.contextLine(bemapMainCtx));
        var s = startCoord || { getLon: function() { return 2.35; }, getLat: function() { return 48.85; } };
        var e = stopCoord  || { getLon: function() { return 4.83; }, getLat: function() { return 45.75; } };
        var provider = bemapMainCtx.chargingStationProvider || 'ecoMovement';
        var vehicle = getVehicleKey() || '<vehicle-uuid>';
        snippet.setRequest(bemap.demoSnippet.requestSnippet('EvSmartRoutingRequest', {
            start: '/*RAW*/new bemap.Coordinate(' + s.getLon() + ', ' + s.getLat() + ')',
            stop:  '/*RAW*/new bemap.Coordinate(' + e.getLon() + ', ' + e.getLat() + ')',
            vehicle: vehicle,
            chargingStationProviders: [provider],
            initBatteryLevel: parseFloat(document.getElementById('ev-init').value) || 100,
            minBatteryLevel: parseFloat(document.getElementById('ev-min').value) || 0,
            minArrivalBatteryLevel: parseFloat(document.getElementById('ev-arrival').value) || 0,
            temperature: parseInt(document.getElementById('ev-temp').value, 10) || 20,
            payload: parseInt(document.getElementById('ev-payload').value, 10) || 75,
            polyline: true,
            co2Emissions: true
        }));
        snippet.setCall([
            "var router = new bemap.EvSmartRouting(ctx);",
            "router.calculate(req).then(function(response) {",
            "    console.log('distance:', response.getDistance(), 'm');",
            "    console.log('duration:', response.getDuration(), 's');",
            "    console.log('arrival battery:', response.getArrivalBatteryLevel(), '%');",
            "    response.getStepPoints().forEach(function(stop) {",
            "        console.log('charge at', stop.getName(), stop.getChargingTime() + 's');",
            "    });",
            "    drawPolyline(response.getPolyline());",
            "}).catch(function(err) {",
            "    console.error(err.getCode(), err.getMessage());",
            "});"
        ].join('\n'));
        snippet.setResponse('(hit Calculate to see a real response)');
    }
    ['ev-vehicle', 'ev-init', 'ev-min', 'ev-arrival', 'ev-temp', 'ev-payload'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', refreshSnippet);
    });
    if (vehicleSel) vehicleSel.addEventListener('change', refreshSnippet);

    // ---- Brand → vehicle cascading picker (powered by bemap.EvVehicles) ----
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
                opt.value = v.getKey();
                opt.textContent = v.getDisplayLabel();
                vehicleSel.appendChild(opt);
            });
            // Apply a key handed off by the ev-vehicles demo, if present.
            var preset = localStorage.getItem('bemap-ev-vehicle-key');
            if (preset) {
                vehicleSel.value = preset;
                localStorage.removeItem('bemap-ev-vehicle-key');
                localStorage.removeItem('bemap-ev-vehicle-label');
            }
            refreshSnippet();
        }).catch(function(err) {
            vehicleSel.innerHTML = '<option value="">(error)</option>';
        });
    }
    if (brandSel) brandSel.addEventListener('change', function() {
        if (brandSel.value) loadVehicles(brandSel.value);
    });

    evv.brands().then(function(brands) {
        if (!brands.length) {
            // ACL has no EV brands — show the fallback text input so the
            // user can still paste a vehicle UUID directly.
            brandSel.parentElement.parentElement.style.display = 'none';
            vehicleFallback.style.display = 'flex';
            return;
        }
        brandSel.innerHTML = '';
        var first = document.createElement('option');
        first.value = ''; first.textContent = 'Pick a brand…';
        brandSel.appendChild(first);
        brands.forEach(function(b) {
            var opt = document.createElement('option');
            opt.value = b.getId(); opt.textContent = b.getLabel();
            brandSel.appendChild(opt);
        });
    }).catch(function() {
        // Network / ACL failure — fall back to text input so the demo
        // is still usable.
        brandSel.parentElement.parentElement.style.display = 'none';
        vehicleFallback.style.display = 'flex';
    });

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }

    function clearAll() {
        startCoord = null;
        stopCoord = null;
        if (startMarker) { try { map.removeMarker(startMarker); } catch (e) {} startMarker = null; }
        if (stopMarker) { try { map.removeMarker(stopMarker); } catch (e) {} stopMarker = null; }
        if (routePolyline) { try { map.removePolyline(routePolyline); } catch (e) {} routePolyline = null; }
        stopMarkers.forEach(function(m) { try { map.removeMarker(m); } catch (e) {} });
        stopMarkers = [];
        summaryEl.textContent = '';
        stepsEl.innerHTML = '';
        setStatus('Click the map to drop the start point.');
    }

    function drawRoute(response) {
        if (routePolyline) { try { map.removePolyline(routePolyline); } catch (e) {} routePolyline = null; }
        stopMarkers.forEach(function(m) { try { map.removeMarker(m); } catch (e) {} });
        stopMarkers = [];

        var coords = response.getPolyline();
        if (coords && coords.length >= 2) {
            routePolyline = new bemap.Polyline(coords, {
                style: new bemap.LineStyle({
                    width: 5,
                    color: new bemap.Color(46, 204, 113, 1),
                    type: bemap.LineStyle.TYPE.PLANE
                }),
                id: 'ev-route'
            });
            map.addPolyline(routePolyline);
        }

        var steps = response.getStepPoints();
        steps.forEach(function(s, idx) {
            var c = s.getCoordinate();
            if (!c) return;
            var m = new bemap.Marker(c, { id: 'ev-stop-' + idx });
            map.addMarker(m);
            stopMarkers.push(m);
        });

        var bbox = response.getBoundingBox();
        if (bbox && typeof map.moveToBoundingBox === 'function') {
            try { map.moveToBoundingBox(bbox); } catch (e) {}
        }
    }

    function renderSummary(response) {
        var d = response.getDistance();
        var dur = response.getDuration();
        var charge = response.getChargingTime();
        var batt = response.getArrivalBatteryLevel();
        var kwh = response.getConsumed();

        var km = (d / 1000).toFixed(1);
        var hh = Math.floor(dur / 3600);
        var mm = Math.floor((dur % 3600) / 60);
        var ch = Math.floor(charge / 60);

        summaryEl.innerHTML =
            '<strong>Distance:</strong> ' + km + ' km' +
            ' · <strong>Duration:</strong> ' + (hh ? hh + 'h ' : '') + mm + ' min' +
            ' · <strong>Charging:</strong> ' + ch + ' min' +
            '<br><strong>Battery on arrival:</strong> ' + Math.round(batt) + '%' +
            ' · <strong>Consumed:</strong> ' + kwh.toFixed(1) + ' kWh';
    }

    function renderSteps(response) {
        stepsEl.innerHTML = '';
        var steps = response.getStepPoints();
        if (!steps.length) {
            var li = document.createElement('li');
            li.textContent = 'No charging stop required.';
            stepsEl.appendChild(li);
            return;
        }
        steps.forEach(function(s, idx) {
            var c = s.getCoordinate();
            var li = document.createElement('li');
            li.textContent = (idx + 1) + '. ' + (s.getName() || s.getBrand() || ('Stop ' + (idx + 1)));
            var small = document.createElement('small');
            var bits = [];
            if (s.getArrivalBatteryLevel() !== null) bits.push('arr ' + Math.round(s.getArrivalBatteryLevel()) + '%');
            if (s.getDepartureBatteryLevel() !== null) bits.push('dep ' + Math.round(s.getDepartureBatteryLevel()) + '%');
            if (s.getChargingTime()) bits.push(Math.round(s.getChargingTime() / 60) + ' min');
            if (s.getCity()) bits.push(s.getCity());
            small.textContent = bits.length ? '  ' + bits.join(' · ') : '';
            li.appendChild(small);
            if (c) {
                li.addEventListener('click', function() { map.move(c.getLon(), c.getLat(), 14); });
            }
            stepsEl.appendChild(li);
        });
    }

    document.getElementById('ev-clear').addEventListener('click', clearAll);

    document.getElementById('ev-go').addEventListener('click', function() {
        if (!startCoord || !stopCoord) { setStatus('Drop both start and stop on the map first.', 'error'); return; }
        var vehicle = getVehicleKey();
        if (!vehicle) { setStatus('Set a vehicle key first (server requires one).', 'error'); return; }
        var provider = bemapMainCtx.chargingStationProvider;
        if (!provider) { setStatus('No charging-station provider in your ACL.', 'error'); return; }

        var req = new bemap.EvSmartRoutingRequest({
            start: startCoord,
            stop: stopCoord,
            vehicle: vehicle,
            chargingStationProviders: [provider],
            initBatteryLevel: parseFloat(document.getElementById('ev-init').value) || 100,
            minBatteryLevel: parseFloat(document.getElementById('ev-min').value) || 0,
            minArrivalBatteryLevel: parseFloat(document.getElementById('ev-arrival').value) || 0,
            temperature: parseInt(document.getElementById('ev-temp').value, 10) || 20,
            payload: parseInt(document.getElementById('ev-payload').value, 10) || 75,
            polyline: true,
            co2Emissions: true
        });

        setStatus('Calling /service/evsmartrouting/1.0 ...');

        router.calculate(req).then(function(response) {
            snippet.setResponse(response);
            drawRoute(response);
            renderSummary(response);
            renderSteps(response);
            setStatus('Journey planned.', 'ok');
        }).catch(function(err) {
            console.error(err);
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    });

    map.on(bemap.Map.EventType.CLICK, function(evt) {
        var c = evt.getCoordinate ? evt.getCoordinate() : evt.coordinate;
        if (!c) return;
        if (!startCoord) {
            startCoord = c;
            startMarker = new bemap.Marker(c, { id: 'ev-start' });
            map.addMarker(startMarker);
            setStatus('Drop the destination …');
        } else if (!stopCoord) {
            stopCoord = c;
            stopMarker = new bemap.Marker(c, { id: 'ev-stop' });
            map.addMarker(stopMarker);
            setStatus('Ready. Hit Calculate.', 'ok');
        } else {
            clearAll();
            startCoord = c;
            startMarker = new bemap.Marker(c, { id: 'ev-start' });
            map.addMarker(startMarker);
            setStatus('Drop the destination …');
        }
        refreshSnippet();
    });

    refreshSnippet();

})();
