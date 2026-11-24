/**
 * Style picker v2 demo.
 *
 * Shows the v2 style flow:
 *   1. `new bemap.MapLibreMap(ctx, 'map1')` with NO `style` option →
 *      paints the tiny font-free fallback instantly, then auto-loads the Worker's
 *      default style after login (fallback → server style; no first-paint cost).
 *   2. `map.fetchAvailableStyles()` → GET /api/styles → { styles, defaultStyle }
 *      populates the dropdown.
 *   3. `map.setStyle('<name>')` → fetch /styles/<name> → swap (overlay-preserving).
 *
 * MapLibre-only: vector tile styles live on the Worker; Leaflet/OL would reject
 * fetchAvailableStyles() with MAPLIBRE_ONLY (they use WMS STYLES instead). So
 * this demo builds a bemap.MapLibreMap directly, not bemap.createMap.
 */
(function () {

    function byId(id) { return document.getElementById(id); }
    var statusEl = byId('sp-status'),
        sel      = byId('sp-style'),
        applyBtn = byId('sp-apply'),
        defEl    = byId('sp-default'),
        jsonEl   = byId('sp-json');

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

    // No `style` option → bundled bootstrap now + live default style after login.
    var map = new bemap.MapLibreMap(bemapMainCtx, 'map1').move(2.35, 48.85, 5);

    function loadStyles() {
        setStatus('GET /api/styles …');
        map.fetchAvailableStyles().then(function (cfg) {
            var styles = (cfg && cfg.styles) || [];
            var def    = cfg && (cfg.defaultStyle || cfg['default']);
            sel.innerHTML = '';
            styles.forEach(function (s) {
                var o = document.createElement('option');
                o.value = s;
                o.textContent = s + (s === def ? '  (default)' : '');
                sel.appendChild(o);
            });
            if (def && styles.indexOf(def) !== -1) sel.value = def;
            defEl.textContent = def || '(none)';
            jsonEl.textContent = JSON.stringify(cfg, null, 2);
            setStatus('Loaded ' + styles.length + ' style(s). The default charte is already live on the map.', 'ok');
        }).catch(function (err) {
            setStatus('Could not load styles: ' + (err && err.message ? err.message : err), 'error');
        });
    }

    function applySelected() {
        var name = sel.value;
        if (!name) return;
        setStatus('setStyle("' + name + '") …');
        // Bare name → the SDK resolves it to <tilesHost>/styles/<name>, fetches,
        // resolves placeholders + injects the session token, and swaps the style
        // while preserving any markers/polylines you've added.
        map.setStyle(name);
        setStatus('Style = ' + name, 'ok');
    }

    applyBtn.addEventListener('click', applySelected);
    sel.addEventListener('change', applySelected); // switch live on pick

    loadStyles();

})();
