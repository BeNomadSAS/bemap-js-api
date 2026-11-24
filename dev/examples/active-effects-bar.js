/* ============================================================
 * Active-Effects bar — parent-dashboard side
 *
 * Listens for `bemap:effect` postMessage events from the embedded
 * iframe (each example page includes effect-bridge.js which posts
 * to its parent on every `bemap:effect:change` from the map).
 * Renders one chip per active effect, plus a "Clear all" button.
 *
 * On `iframe.onload` the chip set is reset because the new iframe
 * mounts a fresh map with no effects.
 *
 * Wiring: see examples/index.html — load this script in the parent
 * and include effect-bridge.js inside every example HTML.
 * ============================================================ */

(function () {
  if (typeof window === 'undefined') return;
  // Avoid double-init when the parent dashboard hot-reloads.
  if (window.__bemapActiveEffectsBarReady) return;
  window.__bemapActiveEffectsBarReady = true;

  // The dashboard-suppression check moved INTO init() so it runs after
  // <body> is parsed (this script lives in <head>, so document.body is null
  // at script-eval time).
  function isOnSpaDashboard() {
    var topLevel = true;
    try { topLevel = window.parent === window; } catch (e) {}
    if (!topLevel) return false;          // inside an iframe → always render
    if (!document.body) return false;     // body not parsed yet → caller must wait
    return document.body.hasAttribute('data-bn-title')
        || !!document.querySelector('body.bn-page')
        || !!document.querySelector('.bn-shell');
  }

  function $(sel) { return document.querySelector(sel); }

  // Build the DOM lazily so the script can be included before the
  // dashboard markup exists.
  function ensureBar() {
    if ($('#active-effects-bar')) return $('#active-effects-bar');
    // Top-level dashboard window suppression — the embedded iframe renders
    // its OWN bar right above its maps (the canonical position). The parent
    // bar would be a duplicate.
    if (isOnSpaDashboard()) return null;
    var bar = document.createElement('div');
    bar.id = 'active-effects-bar';
    bar.innerHTML =
      '<span class="ae-label">Active effects:</span>' +
      '<ul class="ae-list"></ul>' +
      '<span class="ae-empty">(none)</span>' +
      '<button id="ae-clear-all" title="Refresh: clear effects, layers, popups, fly to France">Clear all</button>' +
      '<button id="ae-paris" title="Fly to Paris">Paris</button>' +
      '<button id="ae-globe" title="Toggle globe projection (MapLibre only)">Globe</button>' +
      '<button id="ae-cache" title="Clear browser tile cache + stored token">Clear cache</button>' +
      '<details id="ae-log"><summary>log</summary><pre></pre></details>';
    // Insertion priority:
    //   1. Inside `.bn-sidebar` at the bottom (BeMap 2026 dashboard).
    //   2. After `.top-bar` (function-showcase pattern — own row below).
    //   3. Before `.page-container` (legacy dashboard pattern).
    //   4. Before <main>.
    //   5. At the top of <body>.
    var bnSidebar = $('.bn-sidebar');
    if (bnSidebar) {
      bar.classList.add('ae--in-sidebar');
      bnSidebar.appendChild(bar);
      return bar;
    }
    var topBar = $('.top-bar');
    if (topBar && topBar.parentNode) {
      topBar.parentNode.insertBefore(bar, topBar.nextSibling);
      return bar;
    }
    var anchor = $('.page-container') || $('main');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(bar, anchor);
      return bar;
    }
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  var state = { effects: {} };  // { name → true }

  function render() {
    var bar = ensureBar();
    if (!bar) return;       // suppressed on the top-level SPA dashboard
    var list = bar.querySelector('.ae-list');
    var empty = bar.querySelector('.ae-empty');
    var clearBtn = bar.querySelector('#ae-clear-all');
    var names = Object.keys(state.effects);
    list.innerHTML = '';
    names.forEach(function (n) {
      var li = document.createElement('li');
      li.className = 'ae-chip';
      li.setAttribute('data-effect', n);
      var label = document.createTextNode(n + ' ');
      var btn = document.createElement('button');
      btn.textContent = '×';
      btn.setAttribute('title', 'Remove this effect');
      btn.addEventListener('click', function () { postToIframe({ type: 'bemap:clear-effect', name: n }); });
      li.appendChild(label);
      li.appendChild(btn);
      list.appendChild(li);
    });
    empty.style.display = names.length ? 'none' : 'inline';
    // Clear-all is always enabled — it doubles as a "refresh maps to
    // default state" button, useful even when no effects are active
    // (e.g. when overlays got into a weird state).
    clearBtn.disabled = false;
  }

  function log(line) {
    var bar = ensureBar();
    if (!bar) return;       // suppressed on the top-level SPA dashboard
    var pre = bar.querySelector('#ae-log pre');
    if (!pre) return;
    var ts = new Date().toLocaleTimeString();
    pre.textContent = ('[' + ts + '] ' + line + '\n' + pre.textContent).slice(0, 8000);
  }

  function postToIframe(msg) {
    var iframe = document.querySelector('.page-container iframe') || document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(msg, '*');
    }
  }

  // Parent listens for bemap:effect messages from the iframe shim.
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'bemap:effect') {
      if (data.active) state.effects[data.name] = true;
      else delete state.effects[data.name];
      log((data.active ? '+ ' : '- ') + data.name);
      render();
    } else if (data.type === 'bemap:effect:reset') {
      state.effects = {};
      render();
      log('reset (iframe reload)');
    }
  });

  // On iframe reload (navigating between examples), the new page
  // starts with no effects.
  function attachIframeReload() {
    var iframe = document.querySelector('.page-container iframe') || document.querySelector('iframe');
    if (!iframe) return;
    if (iframe._aeReloadAttached) return;
    iframe._aeReloadAttached = true;
    iframe.addEventListener('load', function () {
      state.effects = {};
      render();
      log('iframe reloaded — cleared');
    });
  }

  // postToIframe is the parent-dashboard path. When the bar is in the
  // SAME window as the map (functions.html), the iframe doesn't exist;
  // post to `window` so the local effect-bridge picks it up.
  function broadcastCmd(msg) {
    var iframe = document.querySelector('.page-container iframe') || document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      try { iframe.contentWindow.postMessage(msg, '*'); } catch (e) {}
    } else {
      try { window.postMessage(msg, '*'); } catch (e) {}
    }
  }

  function init() {
    // Re-check AFTER body is parsed: when this script runs in the top-level
    // dashboard window (not inside an iframe), the embedded example renders
    // its own bar above its maps, so the parent must not render a second one.
    if (isOnSpaDashboard()) return;
    ensureBar();
    var bar = $('#active-effects-bar');
    bar.querySelector('#ae-clear-all').addEventListener('click', function () {
      broadcastCmd({ type: 'bemap:clear-all' });
    });
    var parisBtn = bar.querySelector('#ae-paris');
    if (parisBtn) parisBtn.addEventListener('click', function () {
      broadcastCmd({ type: 'bemap:fly-paris' });
    });
    var globeBtn = bar.querySelector('#ae-globe');
    if (globeBtn) globeBtn.addEventListener('click', function () {
      broadcastCmd({ type: 'bemap:toggle-globe' });
    });
    var cacheBtn = bar.querySelector('#ae-cache');
    if (cacheBtn) cacheBtn.addEventListener('click', function () {
      if (!confirm('Clear browser tile cache + stored auth token? Next load will re-fetch tiles and re-login.')) return;
      broadcastCmd({ type: 'bemap:clear-cache' });
    });
    render();
    attachIframeReload();
    // Re-attach when the example switcher reloads the iframe src.
    var observer = new MutationObserver(function () { attachIframeReload(); });
    var target = document.querySelector('.page-container') || document.body;
    observer.observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
