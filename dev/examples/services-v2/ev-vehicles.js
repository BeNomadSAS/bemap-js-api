/**
 * EV Vehicles v2 demo — bemap.EvVehicles.
 *
 * Browse the EV catalogue: pick a brand → list its vehicles → click one
 * to see structured specs (battery, DC/AC power, dimensions, WLTP,
 * connectors). "Plan a route with this vehicle" stashes the UUID in
 * localStorage and jumps to the EV Smart Routing demo.
 *
 * Endpoints (v1.1, the same ones Flutter SDK uses):
 *   - GET service/vehicle/1.1/getbrands
 *   - GET service/vehicle/1.1/findvehicles?brandId=
 */
(function() {

    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35, 48.85, 4);
    var service = new bemap.EvVehicles(bemapMainCtx);

    var brandSel = document.getElementById('ev-brand');
    var searchEl = document.getElementById('ev-search');
    var statusEl = document.getElementById('ev-status');
    var listEl = document.getElementById('ev-list');
    var specEl = document.getElementById('ev-spec');
    var specNameEl = document.getElementById('ev-spec-name');
    var specBodyEl = document.getElementById('ev-spec-body');
    var specRouteBtn = document.getElementById('ev-spec-route');

    var currentBrandId = null;
    var currentVehicles = [];
    var selectedVehicle = null;

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
        snippet.setRequest([
            "// Two stages — brand list, then vehicles for that brand.",
            "var service = new bemap.EvVehicles(ctx);",
            "",
            "// Stage 1: brand dropdown",
            "service.brands().then(function(brands) {",
            "    brands.forEach(function(b) { console.log(b.getId(), b.getLabel()); });",
            "});",
            "",
            "// Stage 2: vehicles for the picked brand",
            "service.list({ brandId: " + (currentBrandId ? JSON.stringify(currentBrandId) : "'<brand-id>'") + " })",
            "    .then(function(vehicles) {",
            "        vehicles.forEach(function(v) {",
            "            console.log(v.getDisplayLabel());",
            "            console.log('  battery:', v.getBatteryCapacity(), 'kWh');",
            "            console.log('  DC:', v.getMaxChargingPowerDc(), 'kW');",
            "            console.log('  connectors:', v.getConnectorTypes());",
            "        });",
            "    });"
        ].join('\n'));
        snippet.setCall([
            "// Fetch a single vehicle by UUID key:",
            "service.get('<uuid>').then(function(vehicle) {",
            "    console.log(vehicle.getBrandName(), vehicle.getName(), vehicle.getVariant());",
            "});",
            "",
            "// Convert to a RoutingVehicleProfile for EvSmartRouting:",
            "service.toRoutingProfile('<uuid>').then(function(profile) {",
            "    // pass `profile` to bemap.EvSmartRoutingRequest etc.",
            "});"
        ].join('\n'));
        snippet.setResponse('(pick a brand to see real responses)');
    }
    refreshSnippet();

    function renderSpec(v) {
        selectedVehicle = v;
        specEl.style.display = 'block';
        specNameEl.textContent = (v.getBrandName() || '') + ' — ' + (v.getName() || '');
        var bits = [];
        if (v.getVariant()) bits.push('<em>' + v.getVariant() + '</em>');
        if (v.getYear()) bits.push('Year: ' + v.getYear());
        if (v.getBatteryCapacity()) bits.push('Battery: <strong>' + v.getBatteryCapacity() + ' kWh</strong>');
        if (v.getMaxChargingPowerDc()) bits.push('DC max: <strong>' + v.getMaxChargingPowerDc() + ' kW</strong>');
        if (v.getMaxChargingPowerAcThreePhases()) bits.push('AC3 max: ' + v.getMaxChargingPowerAcThreePhases() + ' kW');
        if (v.getMaxChargingPowerAcSinglePhase()) bits.push('AC1 max: ' + v.getMaxChargingPowerAcSinglePhase() + ' kW');
        if (v.getConsumptionInWhPerKm()) bits.push('Consumption: ' + Math.round(v.getConsumptionInWhPerKm()) + ' Wh/km');
        if (v.getWltp() && v.getWltp().completeWltp) bits.push('WLTP: ' + Math.round(v.getWltp().completeWltp) + ' km');
        if (v.getConnectorTypes().length) bits.push('Connectors: ' + v.getConnectorTypes().join(', '));
        var dims = v.getDimensions();
        if (dims) bits.push('Dimensions: ' + dims.length + '×' + dims.width + '×' + dims.height + ' cm');
        if (v.getTransportType()) bits.push('Type: ' + v.getTransportType());
        specBodyEl.innerHTML = bits.join(' · ');
    }

    function renderList(vehicles) {
        listEl.innerHTML = '';
        var query = (searchEl.value || '').trim().toLowerCase();
        var matches = query
            ? vehicles.filter(function(v) {
                  var hay = (v.getName() + ' ' + (v.getVariant() || '') + ' ' + (v.getYear() || '')).toLowerCase();
                  return hay.indexOf(query) >= 0;
              })
            : vehicles;
        if (!matches.length) { setStatus('No vehicles match the search.', 'error'); return; }
        matches.forEach(function(v, i) {
            var li = document.createElement('li');
            li.textContent = v.getDisplayLabel();
            li.addEventListener('click', function() { renderSpec(v); refreshSnippet(); });
            listEl.appendChild(li);
        });
        setStatus('Showing ' + matches.length + ' vehicle' + (matches.length > 1 ? 's' : '') + (query ? ' (filtered)' : ''), 'ok');
    }

    function loadVehicles(brandId) {
        currentBrandId = brandId;
        setStatus('Loading vehicles …');
        listEl.innerHTML = '';
        specEl.style.display = 'none';
        service.list({ brandId: brandId }).then(function(vehicles) {
            currentVehicles = vehicles;
            snippet.setResponse({ vehicles: vehicles.map(function(v) {
                return { key: v.getKey(), brand: v.getBrandName(), name: v.getName(), variant: v.getVariant(),
                         battery: v.getBatteryCapacity(), dc: v.getMaxChargingPowerDc() };
            }) });
            renderList(vehicles);
            refreshSnippet();
        }).catch(function(err) {
            setStatus('Error: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
        });
    }

    brandSel.addEventListener('change', function() {
        if (brandSel.value) loadVehicles(brandSel.value);
    });
    searchEl.addEventListener('input', function() { renderList(currentVehicles); });

    specRouteBtn.addEventListener('click', function() {
        if (!selectedVehicle) return;
        // Hand off to the EV Smart Routing demo via localStorage.
        localStorage.setItem('bemap-ev-vehicle-key', selectedVehicle.getKey());
        localStorage.setItem('bemap-ev-vehicle-label', selectedVehicle.getDisplayLabel());
        window.parent.location.hash = '#embed-services-v2/ev-smart-routing.html';
    });

    // Boot — populate the brand dropdown.
    service.brands().then(function(brands) {
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
            opt.value = b.getId();
            opt.textContent = b.getLabel();
            brandSel.appendChild(opt);
        });
        setStatus(brands.length + ' brand' + (brands.length > 1 ? 's' : '') + ' available — pick one.');
    }).catch(function(err) {
        setStatus('Could not load brands: ' + (err.getMessage ? err.getMessage() : err.message), 'error');
    });

})();
