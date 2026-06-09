/**
 * Tiles & Map Discovery v2 demo.
 *
 * Exercises the BeNomad Tiles Worker discovery endpoints exposed on the
 * MapLibre map:
 *   - map.fetchAvailableMaps()   -> GET /api/maps    { default, aliases, tilesets }
 *   - map.fetchAvailableStyles() -> GET /api/styles  { styles: [...] }
 *   - map.fetchDefaultMap()      -> GET /api/default  { default: '<file>'|null }
 *
 * The session token is attached automatically by the TilesAuth fetch
 * interceptor; the helpers wait for login to complete before firing.
 *
 * MapLibre-only: the discovery API + PMTiles base are MapLibre features, so
 * this demo builds a bemap.MapLibreMap directly (not bemap.createMap, which
 * would honour the sidebar engine picker and might return OL/Leaflet).
 */
(function() {

    var statusEl = document.getElementById('td-status');
    var mapSel   = document.getElementById('td-map');
    var applyBtn = document.getElementById('td-apply');
    var defEl    = document.getElementById('td-default');
    var mapsJson = document.getElementById('td-maps-json');
    var stylesJson = document.getElementById('td-styles-json');

    function setStatus(text, kind) {
        statusEl.className = 'status' + (kind ? ' ' + kind : '');
        statusEl.textContent = text;
    }

    if (typeof maplibregl === 'undefined') {
        setStatus('MapLibre GL JS not loaded — this demo is MapLibre-only.', 'error');
        return;
    }
    if (!bemapMainCtx || !bemapMainCtx.hasTilesConfig || !bemapMainCtx.hasTilesConfig()) {
        setStatus('No tilesHost on the Context. Set BeNomad Tiles credentials (topbar) to use this demo.', 'error');
        return;
    }

    var ctx = bemapMainCtx;
    var map = new bemap.MapLibreMap(ctx, 'map1').move(2.35, 48.85, 5);

    function addOption(value, label) {
        var o = document.createElement('option');
        o.value = value;
        o.textContent = label;
        mapSel.appendChild(o);
    }

    // ---- Discovery: populate the picker + raw JSON from the Worker config ----
    function loadDiscovery() {
        setStatus('GET /api/maps · /api/styles · /api/default …');
        Promise.all([
            map.fetchAvailableMaps(),
            map.fetchAvailableStyles().catch(function (e) { return { __err: e }; }),
            map.fetchDefaultMap().catch(function (e) { return { __err: e }; })
        ]).then(function (res) {
            var maps = res[0], styles = res[1], def = res[2];

            mapSel.innerHTML = '';
            var aliases = maps.aliases || {};
            Object.keys(aliases).forEach(function (a) {
                addOption(a, a + '  (alias → ' + aliases[a] + ')');
            });
            (maps.tilesets || []).forEach(function (t) { addOption(t, t); });

            // Default to the 'default' alias if present, else the first option.
            mapSel.value = aliases.default !== undefined ? 'default' : (mapSel.options[0] && mapSel.options[0].value);

            mapsJson.textContent   = JSON.stringify(maps, null, 2);
            stylesJson.textContent = styles && styles.__err
                ? 'error: ' + (styles.__err.message || styles.__err)
                : JSON.stringify(styles, null, 2);
            defEl.textContent = (def && !def.__err && def.default) ? def.default : '(none)';

            setStatus('Loaded ' + Object.keys(aliases).length + ' alias(es), '
                + (maps.tilesets || []).length + ' tileset(s).', 'ok');
        }).catch(function (err) {
            setStatus('Discovery failed: ' + (err && err.message ? err.message : err), 'error');
        });
    }

    // ---- Switch the base map to the selected alias/tileset ----
    function applySelection() {
        var sel = mapSel.value;
        if (!sel) return;
        setStatus('Switching base to "' + sel + '" …');
        // Pin the choice on the shared Context, then rebuild the MapLibre map.
        // The JWT lives in tokenStorage, so the rebuilt map reuses it (no re-login).
        ctx.tilesFile = sel;
        var center = map.getCenter ? map.getCenter() : null;
        try { if (map.native && map.native.remove) map.native.remove(); } catch (e) {}
        map = new bemap.MapLibreMap(ctx, 'map1');
        if (center) map.move(center.getLon(), center.getLat(), 5); else map.move(2.35, 48.85, 5);
        setStatus('Base map = ' + sel + (sel.indexOf('.pmtiles') === -1 ? '  (alias — server resolves the file)' : ''), 'ok');
    }

    applyBtn.addEventListener('click', applySelection);

    loadDiscovery();

})();
