/**
 * Shared "Code example" panel for v1.5 demo pages.
 *
 * Each demo attaches a panel that surfaces four copy-ready blocks built
 * from the LIVE dashboard selections and the LIVE demo form values:
 *
 *   1. Context  — `new bemap.Context({...})` with the current dropdown
 *                 values (geoserver, chargingStationProvider, ...) already
 *                 plugged in. Reflects what the user picked in the sidebar.
 *   2. Request  — the typed `bemap.XxxRequest` object the demo would send,
 *                 built from the current panel form values.
 *   3. Call     — the service-method invocation pattern (so the user knows
 *                 which Promise to `.then` and which accessors to read).
 *   4. Response — populated after each successful call, as JSON, so the
 *                 user can see the real shape the BeMap server returned.
 *
 * Every block has a `Copy` button. The whole thing lives inside a
 * `<details>` so it stays out of the way when not needed.
 *
 * Usage:
 *     var snippet = bemap.demoSnippet.attach(panelEl, { title: '...' });
 *     snippet.setContext(bemap.demoSnippet.contextLine(bemapMainCtx));
 *     snippet.setRequest('var req = new bemap.Foo({ ... });');
 *     snippet.setCall('foo.bar(req).then(...);');
 *     // After the demo finishes a call:
 *     snippet.setResponse(jsonFromServerOrFromResponseObject);
 *
 * Pretty-printing of arbitrary values is provided by `jsLiteral` —
 * it understands nested objects, arrays, Date and numbers / strings /
 * booleans / null.
 *
 * @since 1.5.0
 */
window.bemap = window.bemap || {};
bemap.demoSnippet = bemap.demoSnippet || {};

// The three pure-function helpers (`contextLine`, `jsLiteral`,
// `requestSnippet`) now live in the lib under `bemap.snippet`. Keep the
// legacy `bemap.demoSnippet` namespace as a thin alias so existing demo
// pages keep working unchanged.
//
// `contextLine` is wrapped so dashboard snippets emit the user's real
// credentials (entered via the topbar Credentials popover) instead of the
// safe-to-share placeholders. The library default stays safe; only this
// dashboard alias opts in.
bemap.demoSnippet.contextLine = function (ctx, opts) {
    var merged = opts || {};
    if (merged.includeCredentials === undefined) merged.includeCredentials = true;
    return bemap.snippet.contextLine(ctx, merged);
};
bemap.demoSnippet.jsLiteral      = bemap.snippet.jsLiteral;
bemap.demoSnippet.requestSnippet = bemap.snippet.requestSnippet;

/**
 * Wrap a panel with a collapsible "Code example" details element holding
 * the four code blocks (Context, Request, Call, Response).
 *
 * @public
 * @param {HTMLElement|String} panel  Container element (or CSS selector).
 * @param {Object} [opts]
 * @param {String} [opts.title='Code example — copy & paste']
 * @param {Boolean} [opts.open=false] Whether the <details> starts open.
 * @return {{setContext, setRequest, setCall, setResponse}}
 */
bemap.demoSnippet.attach = function(panel, opts) {
    opts = opts || {};
    if (typeof panel === 'string') panel = document.querySelector(panel);
    if (!panel) return { setContext: noop, setRequest: noop, setCall: noop, setResponse: noop };

    var details = document.createElement('details');
    details.className = 'demo-snippet';
    if (opts.open) details.open = true;

    var summary = document.createElement('summary');
    summary.textContent = opts.title || 'Code example — copy & paste';
    details.appendChild(summary);

    function noop() {}

    function block(label, lang) {
        var wrap = document.createElement('div');
        wrap.className = 'snippet-block';
        var head = document.createElement('div');
        head.className = 'snippet-head';
        var hl = document.createElement('span');
        hl.className = 'snippet-label';
        hl.textContent = label;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'snippet-copy';
        btn.textContent = 'Copy';
        head.appendChild(hl);
        head.appendChild(btn);
        var pre = document.createElement('pre');
        pre.className = 'snippet-pre snippet-' + (lang || 'js');
        var code = document.createElement('code');
        code.textContent = '';
        pre.appendChild(code);
        wrap.appendChild(head);
        wrap.appendChild(pre);
        btn.addEventListener('click', function() {
            var txt = code.textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).catch(fallback);
            } else {
                fallback();
            }
            function fallback() {
                var ta = document.createElement('textarea');
                ta.value = txt;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); } catch (e) {}
                document.body.removeChild(ta);
            }
            var orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(function() { btn.textContent = orig; }, 1200);
        });
        return { wrap: wrap, code: code };
    }

    var ctxBlock  = block('Context (live from sidebar)', 'js');
    var reqBlock  = block('Request', 'js');
    var callBlock = block('Call', 'js');
    var respBlock = block('Response (last result)', 'json');

    details.appendChild(ctxBlock.wrap);
    details.appendChild(reqBlock.wrap);
    details.appendChild(callBlock.wrap);
    details.appendChild(respBlock.wrap);
    panel.appendChild(details);

    var state = { ctx: '', req: '', call: '', resp: '' };

    function pushToDashboard() {
        // Forward the four blocks as a single concatenated snippet to the
        // BeMap 2026 dashboard's outer code panel. Only fires when embedded.
        if (!_BN_EMBED) return;
        var parts = [];
        if (state.ctx)  parts.push('// === Context (live from sidebar) ===\n' + state.ctx);
        if (state.req)  parts.push('// === Request ===\n' + state.req);
        if (state.call) parts.push('// === Call ===\n' + state.call);
        if (state.resp) parts.push('// === Response (last result) ===\n' + state.resp);
        try {
            window.parent.postMessage({
                type: 'bemap:fn:code',
                code: parts.join('\n\n'),
                label: (document.title || 'service').replace(/ — BeMap.*$/, '')
            }, '*');
        } catch (e) {}
    }

    return {
        setContext: function(s) {
            state.ctx = s || '';
            ctxBlock.code.textContent = state.ctx;
            pushToDashboard();
        },
        setRequest: function(s) {
            state.req = s || '';
            reqBlock.code.textContent = state.req;
            pushToDashboard();
        },
        setCall: function(s) {
            state.call = s || '';
            callBlock.code.textContent = state.call;
            pushToDashboard();
        },
        setResponse: function(s) {
            if (s === null || s === undefined) {
                state.resp = '(no call yet)';
                respBlock.code.textContent = state.resp;
            } else {
                try { state.resp = (typeof s === 'string') ? s : JSON.stringify(s, null, 2); }
                catch (e) { state.resp = String(s); }
                respBlock.code.textContent = state.resp;
            }
            pushToDashboard();
            // Service responses are valuable to log too — push a one-line
            // summary to the dashboard's outer console.
            if (_BN_EMBED) {
                try {
                    var preview = state.resp.length > 120 ? state.resp.substring(0, 117) + '…' : state.resp;
                    window.parent.postMessage({
                        type: 'bemap:fn:log',
                        provider: 'service',
                        status: 'ok',
                        msg: 'response received — ' + preview
                    }, '*');
                } catch (e) {}
            }
        }
    };
};

/* ============================================================
 * SPA-embed wiring for service pages
 *
 * Every page under examples/services-v2/ loads this script. When the page
 * is rendered inside the BeMap 2026 dashboard iframe, do three things:
 *
 *   1. Hide the page-local snippet `<details>` so its content doesn't
 *      duplicate the dashboard's outer code panel.
 *   2. Forward setContext / setRequest / setCall / setResponse via
 *      postMessage to the dashboard. (Wired in the returned object above.)
 *   3. Patch `bemap.createMap` so every map created by a service page
 *      gets the MapLibre-canvas-resize fix — without this, the MapLibre
 *      backend latches a wrong canvas size during the iframe layout and
 *      renders with oversize labels / wrong zoom.
 * ============================================================ */

var _BN_EMBED = (function () { try { return window.parent !== window; } catch (e) { return false; } })();

if (_BN_EMBED) {
    // 1. Hide the local snippet block once it's been added. We do this with
    //    a MutationObserver because demoSnippet.attach is called after this
    //    file evaluates — the `<details class="demo-snippet">` may not exist
    //    yet at this point.
    function hideLocalSnippets() {
        var nodes = document.querySelectorAll('details.demo-snippet');
        for (var i = 0; i < nodes.length; i++) nodes[i].style.display = 'none';
    }
    if (typeof MutationObserver === 'function') {
        var snippetMo = new MutationObserver(hideLocalSnippets);
        if (document.body) snippetMo.observe(document.body, { childList: true, subtree: true });
        else document.addEventListener('DOMContentLoaded', function () {
            snippetMo.observe(document.body, { childList: true, subtree: true });
        });
    }
    document.addEventListener('DOMContentLoaded', hideLocalSnippets);
}

// 3. Monkey-patch bemap.createMap so EVERY service page (embedded or not)
//    gets the canvas-resize race fix automatically. This costs nothing on
//    OL/Leaflet (the resize calls are no-ops on already-sized canvases).
(function patchCreateMapForResize() {
    if (typeof bemap !== 'object' || !bemap || typeof bemap.createMap !== 'function') return;
    if (bemap.createMap.__bnResized) return;          // idempotent
    var original = bemap.createMap;
    var patched = function (context, target, options) {
        var m = original.apply(this, arguments);
        if (!m) return m;
        function resize() {
            try { if (m.native && m.native.resize)         m.native.resize(); } catch (e) {}
            try { if (m.native && m.native.invalidateSize) m.native.invalidateSize(); } catch (e) {}
            try { if (m.native && m.native.updateSize)     m.native.updateSize(); } catch (e) {}
        }
        requestAnimationFrame(function () { requestAnimationFrame(resize); });
        setTimeout(resize, 100);
        setTimeout(resize, 500);
        if (typeof ResizeObserver === 'function' && typeof target === 'string') {
            var el = document.getElementById(target);
            if (el) new ResizeObserver(resize).observe(el);
        }
        return m;
    };
    patched.__bnResized = true;
    bemap.createMap = patched;
})();
