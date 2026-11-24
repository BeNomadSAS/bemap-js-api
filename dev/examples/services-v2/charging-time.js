/**
 * Charging Time v2 demo — bemap.ChargingTime.
 *
 * Brand + vehicle picker (chained from bemap.EvVehicles), charger-power
 * slider, from/to SOC sliders, temperature. POST service/chargingTime/1.0
 * returns the duration in seconds and the "knee" of the charging curve.
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 4);
    var ct = new bemap.ChargingTime(bemapMainCtx);
    var evv = new bemap.EvVehicles(bemapMainCtx);

    var brandSel = document.getElementById('ct-brand');
    var vehicleSel = document.getElementById('ct-vehicle');
    var powerEl = document.getElementById('ct-power');
    var currentSel = document.getElementById('ct-current');
    var fromEl = document.getElementById('ct-from');
    var toEl = document.getElementById('ct-to');
    var tempEl = document.getElementById('ct-temp');
    var goBtn = document.getElementById('ct-go');
    var statusEl = document.getElementById('ct-status');
    var resultEl = document.getElementById('ct-result');

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
            vehicle: vehicleSel.value || '/*RAW*/\'<vehicle-uuid>\'',
            chargingPointPower: parseFloat(powerEl.value) || 22,
            chargingCurrentType: '/*RAW*/bemap.ChargingCurrentType.' + currentSel.value,
            remainingBatteryLevel: parseFloat(fromEl.value) || 0,
            chargingBatteryLevel: parseFloat(toEl.value) || 100,
            temperature: parseInt(tempEl.value, 10) || 20
        };
        snippet.setRequest(bemap.demoSnippet.requestSnippet('ChargingTimeRequest', opts));
        snippet.setCall([
            "var ct = new bemap.ChargingTime(ctx);",
            "ct.estimate(req).then(function(resp) {",
            "    console.log('charging time:', resp.getChargingTime(), 's');",
            "    console.log('optimum knee at:', resp.getOptimumBatteryChargeLevel(), '%');",
            "}).catch(function(err) {",
            "    if (err.getCode() === bemap.Error.CHARGING_TIME_FAILED) console.warn('no estimate');",
            "    else console.error(err.getMessage());",
            "});"
        ].join('\n'));
    }
    refreshSnippet();

    ['ct-power', 'ct-current', 'ct-from', 'ct-to', 'ct-temp'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', refreshSnippet);
        if (el) el.addEventListener('change', refreshSnippet);
    });
    vehicleSel.addEventListener('change', refreshSnippet);

    function loadVehicles(brandId) {
        vehicleSel.innerHTML = '<option>Loading…</option>';
        evv.list({ brandId: brandId }).then(function(vehicles) {
            vehicleSel.innerHTML = '';
            if (!vehicles.length) {
                vehicleSel.innerHTML = '<option value="">(none)</option>';
                setStatus('No vehicles under this brand.');
                return;
            }
            vehicles.forEach(function(v) {
                var opt = document.createElement('option');
                opt.value = v.getKey();
                opt.textContent = v.getDisplayLabel();
                vehicleSel.appendChild(opt);
            });
            refreshSnippet();
            setStatus(vehicles.length + ' vehicle(s) loaded — hit Estimate.', 'ok');
        }).catch(function(err) {
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    }

    brandSel.addEventListener('change', function() {
        if (brandSel.value) loadVehicles(brandSel.value);
    });

    goBtn.addEventListener('click', function() {
        var vehicleKey = vehicleSel.value;
        if (!vehicleKey) { setStatus('Pick a vehicle first.', 'error'); return; }
        var from = parseFloat(fromEl.value);
        var to = parseFloat(toEl.value);
        if (to <= from) { setStatus('"To" must be greater than "From".', 'error'); return; }

        var req = new bemap.ChargingTimeRequest({
            vehicle: vehicleKey,
            chargingPointPower: parseFloat(powerEl.value) || 22,
            chargingCurrentType: currentSel.value,
            remainingBatteryLevel: from,
            chargingBatteryLevel: to,
            temperature: parseInt(tempEl.value, 10) || 20
        });

        setStatus('Calling /service/chargingTime/1.0 …');
        ct.estimate(req).then(function(resp) {
            snippet.setResponse(resp);
            var secs = resp.getChargingTime();
            var min = Math.floor(secs / 60);
            var sec = secs % 60;
            resultEl.className = 'status ok';
            resultEl.innerHTML =
                '<strong>Estimated time:</strong> ' + min + ' min ' + sec + ' s' +
                ' &nbsp;·&nbsp; <strong>Optimum knee:</strong> ' + Math.round(resp.getOptimumBatteryChargeLevel()) + ' %';
            setStatus('Estimate received.', 'ok');
        }).catch(function(err) {
            resultEl.className = 'status error';
            resultEl.textContent = '';
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    });

    // Boot — load brands.
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
        setStatus(brands.length + ' brand(s) loaded.');
    }).catch(function(err) {
        setStatus('Could not load brands: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
    });

})();
