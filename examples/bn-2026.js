/* ============================================================
 * BeNomad 2026 — shared helper for examples/*.html
 *
 * Exposes a tiny `window.bn` API every example page can reuse:
 *
 *   bn.boot({ title, subtitle, chips, hasLog, hasPanel })
 *     One-call page bootstrap. Reads optional <body data-bn-*=...>
 *     overrides. Builds .bn-shell / .bn-topbar / .bn-log if absent.
 *
 *   bn.log(message, level)
 *     Append a line to the bottom log pane. level ∈ info|ok|warn|err.
 *     Also mirrors to console.* so F12 power-users see it too.
 *
 *   bn.clearLog() / bn.copyLog() / bn.toggleLog()
 *
 *   bn.panel({ id, title, sections })
 *     Programmatic right-side panel. Returns the body element so the
 *     caller can append custom controls.
 *
 *   bn.onMapReady(map, fn)
 *     Engine-agnostic "map ready" hook (OL / Leaflet / MapLibre).
 *
 *   bn.fmtCoord(lon, lat) / bn.fmtKm(m) / bn.fmtMs(ms)
 *
 * Companion CSS: bn-2026.css (must be linked before this script
 * runs, otherwise the layout will show un-styled while the bundle
 * loads).
 *
 * The script auto-boots on DOMContentLoaded IF <body> carries a
 * `data-bn-page` attribute. Pages that prefer imperative wiring can
 * call bn.boot({...}) themselves and skip the attribute.
 * ============================================================ */

(function (global) {
  if (global.bn && global.bn.__ready) return;

  var doc = global.document;

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function el(tag, attrs, children) {
    var n = doc.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'on' && typeof attrs.on === 'object') {
        for (var ev in attrs.on) n.addEventListener(ev, attrs.on[ev]);
      }
      else n.setAttribute(k, attrs[k]);
    }
    if (children) for (var i = 0; i < children.length; i++) {
      if (children[i]) n.appendChild(children[i]);
    }
    return n;
  }
  function isEmbedded() {
    try { return global.parent !== global; } catch (e) { return false; }
  }

  /* --------------------------------------------------
   * Top bar
   * -------------------------------------------------- */

  function buildTopBar(opts) {
    var title    = opts.title    || doc.title || 'BeMap';
    var subtitle = opts.subtitle || '';
    var chips    = opts.chips    || [];

    // Brand text shows the real library version (bemap.version) so the
    // dashboard always advertises exactly which build it is running. Falls
    // back to "2026" if the library hasn't loaded yet.
    var libVer = (typeof bemap !== 'undefined' && bemap.version) ? ('v' + bemap.version) : '2026';
    var brand = el('a', { class: 'bn-topbar__brand', href: '../examples/index.html', title: 'Back to BeMap dashboard' }, [
      // Official scalable BeNomad SVG (the same source pav / fleex / zone-optimizer
      // use) — crisp at any size, unlike the old 143×20 PNG. Falls back to the
      // bundled PNG if the SVG is unreachable (offline / CSP-restricted host).
      el('img', { src: 'https://benomad.com/assets/benomad-logo.svg', alt: 'BeNomad',
        on: { error: function (e) { var i = e.target || e.srcElement; if (i && !i._fellBack) { i._fellBack = true; i.src = 'benomad-logo.png'; } } } }),
      el('div', { class: 'bn-topbar__brand-text', html: 'BeMap<small>JS API · ' + libVer + '</small>' })
    ]);

    var chipBox = el('div', { class: 'bn-topbar__chips' });
    chips.forEach(function (c) {
      var cls = 'bn-chip';
      if (c.kind) cls += ' bn-chip--' + c.kind;
      chipBox.appendChild(el('span', { class: cls, text: c.label || c }));
    });

    var titles = el('div', { class: 'bn-topbar__titles' }, [
      el('h1', { class: 'bn-topbar__title', text: title }),
      subtitle ? el('div', { class: 'bn-topbar__subtitle', html: subtitle }) : null
    ]);

    var actions = el('div', { class: 'bn-topbar__actions' }, [
      buildSearchBox(),
      buildCredentialsButton(),
      el('a', {
        class: 'bn-btn bn-btn--ghost bn-btn--sm',
        href: global.location.pathname.split('/').pop(),
        target: '_blank',
        title: 'Open this example in a new tab',
        text: 'Open ↗'
      }),
      el('a', {
        class: 'bn-btn bn-btn--ghost bn-btn--sm bn-topbar__back',
        href: '../examples/index.html',
        title: 'Back to dashboard',
        text: '← Dashboard'
      })
    ]);

    return el('header', { class: 'bn-topbar' }, [brand, chipBox, titles, actions]);
  }

  /* --------------------------------------------------
   * Global search (Cmd/Ctrl-K, /)
   *
   * One in-memory index over five sources:
   *   - sidebar manifest leaves (~57)
   *   - example HTML data-bn-* attributes (lazy-fetched once)
   *   - markdown pages (lazy-fetched once, parses H1 + H2 sections)
   *   - JSDoc API (lazy-fetched once if dist/doc/ exists, opens new tab)
   *
   * Scoring is deterministic substring + small kind-based weights. No
   * external dependency; ~210 items at 200 chars each → scan in <1 ms per
   * keystroke.
   * -------------------------------------------------- */
  var searchState = {
    input: null, popover: null, wrap: null,
    index: [],
    seen: {},           // de-dupe key → true
    cursor: -1,         // selected result index
    lastResults: [],
    markdownLoaded: false,
    examplesLoaded: false,
    jsdocLoaded: false,
    triggerLoaded: false
  };

  // Markdown sources outside the sidebar manifest (orphan docs that aren't
  // linked from anywhere). Kept here so they're still findable by search.
  var SEARCH_ORPHAN_MARKDOWN = [
    { href: '#page-../docs/attributions-widget.md',  label: 'Attributions widget' },
    { href: '#page-../docs/style-customisation.md',  label: 'Style customisation' },
    { href: '#page-../docs/services-v2/SERVICES.md', label: 'Services v2 reference' }
  ];

  function buildSearchBox() {
    var input = el('input', {
      type: 'search',
      class: 'bn-search__input',
      placeholder: 'Search… (Ctrl-K or /)',
      'aria-label': 'Search BeMap docs, functions, examples',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    var popover = el('div', { class: 'bn-search__popover', role: 'listbox' });
    popover.style.display = 'none';
    var wrap = el('div', { class: 'bn-search' }, [input, popover]);
    searchState.input = input;
    searchState.popover = popover;
    searchState.wrap = wrap;

    input.addEventListener('focus', function () {
      _triggerLazyLoads();
      runSearch(input.value);
    });
    input.addEventListener('input', function () { runSearch(input.value); });
    input.addEventListener('keydown', _onSearchKeydown);

    // Close popover on outside click.
    doc.addEventListener('mousedown', function (e) {
      if (!wrap.contains(e.target)) _hidePopover();
    });

    // Global shortcuts: Cmd/Ctrl-K + / from anywhere.
    doc.addEventListener('keydown', function (e) {
      var isMod = (e.metaKey || e.ctrlKey);
      var k = (e.key || '').toLowerCase();
      if (isMod && k === 'k') {
        e.preventDefault();
        try { input.focus(); input.select(); } catch (err) {}
      } else if (e.key === '/' && doc.activeElement !== input) {
        var tag = (doc.activeElement && doc.activeElement.tagName) || '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          try { input.focus(); input.select(); } catch (err) {}
        }
      } else if (k === 'escape' && doc.activeElement === input) {
        input.blur(); _hidePopover();
      }
    });

    return wrap;
  }

  function _buildBaseIndex() {
    if (searchState.index.length) return; // already built
    var manifest = (typeof global.bnSidebarManifest === 'object') ? global.bnSidebarManifest : [];
    function walk(node, path) {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(function (n) { walk(n, path); }); return; }
      var nextPath = node.label ? path.concat([node.label]) : path;
      if (node.children) {
        walk(node.children, nextPath);
      } else if (node.href) {
        var kind = 'sidebar';
        if (node.href.indexOf('#nav-functions.html?fn=') === 0) kind = 'function';
        else if (node.href.indexOf('#nav-') === 0)              kind = 'example';
        else if (node.href.indexOf('#page-') === 0)             kind = 'doc';
        else if (node.href.indexOf('dist/doc') !== -1)          kind = 'api';
        var chipText = (node.chips || []).map(function (c) { return c.label || c; }).join(' ');
        _addToIndex({
          title:    node.label,
          href:     node.href,
          target:   node.target,
          kind:     kind,
          section:  nextPath.slice(0, -1).join(' › '),
          chipText: chipText
        });
      }
    }
    walk(manifest, []);
    // Add orphan docs.
    for (var i = 0; i < SEARCH_ORPHAN_MARKDOWN.length; i++) {
      var o = SEARCH_ORPHAN_MARKDOWN[i];
      _addToIndex({ title: o.label, href: o.href, kind: 'doc', section: 'docs (unlinked)', chipText: 'DOC' });
    }
  }

  function _addToIndex(item) {
    var key = (item.href || '') + '|' + (item.title || '') + '|' + (item.heading || '');
    if (searchState.seen[key]) return;
    searchState.seen[key] = true;
    item._searchHaystack = ((item.title || '') + ' ' + (item.subtitle || '') + ' ' +
                            (item.chipText || '') + ' ' + (item.section || '') + ' ' +
                            (item.heading || '') + ' ' + (item.snippet || '')).toLowerCase();
    searchState.index.push(item);
  }

  // Resolve a `#nav-…` or `#page-…` href to an absolute fetchable URL
  // relative to examples/. Mirrors what the SPA's hash router does.
  function _hrefToUrl(href) {
    var h = (href || '').replace(/^#/, '');
    if (h.indexOf('nav-') === 0) return h.substring(4);
    if (h.indexOf('page-') === 0) return h.substring(5);
    return null;
  }

  function _triggerLazyLoads() {
    if (searchState.triggerLoaded) return;
    searchState.triggerLoaded = true;
    _loadExamples();   // phase 1.5 — example data-bn-* attrs
    _loadMarkdown();   // phase 2 — markdown bodies
    _loadJsdoc();      // phase 3 — JSDoc class/method list
  }

  /* ---- Phase 1.5: example HTML data-bn-title / data-bn-subtitle ----
     The sidebar manifest already gives us the labels for example pages.
     This extra pass fetches each example HTML and reads its richer
     `data-bn-title` / `data-bn-subtitle` attributes — typically a fuller
     description than the sidebar label. */
  function _loadExamples() {
    if (searchState.examplesLoaded) return;
    searchState.examplesLoaded = true;
    var seenFiles = {};
    var targets = [];
    for (var i = 0; i < searchState.index.length; i++) {
      var it = searchState.index[i];
      if (it.kind !== 'example') continue;
      var url = _hrefToUrl(it.href);
      if (!url || seenFiles[url]) continue;
      seenFiles[url] = true;
      targets.push({ item: it, url: url });
    }
    var parser = (typeof DOMParser === 'function') ? new DOMParser() : null;
    if (!parser) return;
    targets.forEach(function (t) {
      fetch(t.url, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (html) {
          if (!html) return;
          var d = parser.parseFromString(html, 'text/html');
          var body = d && d.body;
          if (!body) return;
          var title    = body.getAttribute('data-bn-title')    || '';
          var subtitle = body.getAttribute('data-bn-subtitle') || '';
          var chips    = body.getAttribute('data-bn-chips')    || '';
          if (title)    t.item.subtitle = subtitle ? title + ' — ' + _stripTags(subtitle) : title;
          if (subtitle) t.item.snippet  = _stripTags(subtitle);
          if (chips)    t.item.chipText = ((t.item.chipText || '') + ' ' + chips).trim();
          t.item._searchHaystack = ((t.item.title || '') + ' ' + (t.item.subtitle || '') + ' ' +
                                    (t.item.chipText || '') + ' ' + (t.item.section || '') + ' ' +
                                    (t.item.snippet || '')).toLowerCase();
        })
        .catch(function () { /* ignore — page just stays minimally indexed */ });
    });
  }

  function _stripTags(s) {
    return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ---- Phase 2: markdown deep search ----
     For every .md file referenced by the manifest (plus the orphans),
     fetch the body, parse H1 + every H2 + their opening paragraph, and
     add one extra index entry per H2 section. */
  function _loadMarkdown() {
    if (searchState.markdownLoaded) return;
    searchState.markdownLoaded = true;
    var seenFiles = {};
    var targets = [];
    for (var i = 0; i < searchState.index.length; i++) {
      var it = searchState.index[i];
      if (it.kind !== 'doc') continue;
      var url = _hrefToUrl(it.href);
      if (!url || seenFiles[url]) continue;
      seenFiles[url] = true;
      targets.push({ item: it, url: url });
    }
    targets.forEach(function (t) {
      fetch(t.url, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (md) {
          if (!md) return;
          // First H1 → enrich the parent entry with a snippet.
          var h1 = md.match(/^#\s+(.+?)\s*$/m);
          var firstPara = md.match(/^(?!#)([^\n][^\n]*)/m);
          if (firstPara) {
            t.item.snippet = firstPara[1].slice(0, 160);
            t.item._searchHaystack = ((t.item.title || '') + ' ' + (t.item.snippet || '') + ' ' +
                                      (t.item.chipText || '') + ' ' + (t.item.section || '')).toLowerCase();
          }
          // Each H2 becomes its own index entry — clicking jumps into the
          // same markdown page (Showdown preserves heading anchors).
          var h2Regex = /^##\s+(.+?)\s*$/gm;
          var m, lastEnd = 0, sectionTitle = h1 ? h1[1] : t.item.title;
          while ((m = h2Regex.exec(md)) !== null) {
            var heading = m[1];
            // Take ~200 chars of body following the heading as snippet.
            var bodyStart = m.index + m[0].length;
            var nextH2 = md.indexOf('\n## ', bodyStart);
            var bodyEnd = nextH2 > -1 ? nextH2 : Math.min(md.length, bodyStart + 800);
            var snippet = md.substring(bodyStart, bodyEnd)
                            .replace(/```[\s\S]*?```/g, ' ')   // strip code fences
                            .replace(/[*_`#>\-]+/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .slice(0, 240);
            _addToIndex({
              title:   heading,
              href:    t.item.href,    // same page; could append #anchor later
              kind:    'doc-section',
              section: sectionTitle,
              snippet: snippet
            });
            lastEnd = m.index;
          }
          if (searchState.input && searchState.input === doc.activeElement) {
            runSearch(searchState.input.value);
          }
        })
        .catch(function () {});
    });
  }

  /* ---- Phase 3: JSDoc API ----
     HEAD dist/doc/index.html. If it exists, fetch its <nav> and parse the
     class + method list. Each entry opens the JSDoc page in a new tab. */
  function _loadJsdoc() {
    if (searchState.jsdocLoaded) return;
    searchState.jsdocLoaded = true;
    var docIndexUrl = '../dist/doc/index.html';
    fetch(docIndexUrl, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html || typeof DOMParser !== 'function') return;
        var d = new DOMParser().parseFromString(html, 'text/html');
        // JSDoc's default template renders classes/methods in a <nav>.
        // We pick up every <a href> in the nav whose text looks like a
        // class name (PascalCase) or member (Class#method or Class.method).
        var nav = d.querySelector('nav') || d.body;
        if (!nav) return;
        var anchors = nav.querySelectorAll('a[href]');
        for (var i = 0; i < anchors.length; i++) {
          var a = anchors[i];
          var label = (a.textContent || '').trim();
          var href  = a.getAttribute('href') || '';
          if (!label || !href || href.charAt(0) === '#') continue;
          _addToIndex({
            title:   label,
            href:    '../dist/doc/' + href.replace(/^\.\//, ''),
            target:  '_blank',
            kind:    'api',
            section: 'JSDoc API reference',
            chipText: 'API'
          });
        }
        if (searchState.input && searchState.input === doc.activeElement) {
          runSearch(searchState.input.value);
        }
      })
      .catch(function () { /* JSDoc not built — silent degrade */ });
  }

  function runSearch(query) {
    _buildBaseIndex();
    query = (query || '').trim().toLowerCase();
    if (!query) {
      searchState.lastResults = [];
      _renderResults([], '');
      _showPopover();
      return;
    }
    var hits = [];
    var idx = searchState.index;
    for (var i = 0; i < idx.length; i++) {
      var it = idx[i];
      var hay = it._searchHaystack;
      if (!hay) continue;
      var titleLow = (it.title || '').toLowerCase();
      if (hay.indexOf(query) === -1) continue;
      var score = 0;
      if (titleLow.indexOf(query) === 0)        score += 100;
      if (titleLow.indexOf(query) !== -1)       score += 50;
      if ((it.snippet || '').toLowerCase().indexOf(query) !== -1)  score += 20;
      if ((it.chipText || '').toLowerCase().indexOf(query) !== -1) score += 10;
      if (it.kind === 'doc-section')            score += 5; // body match
      if (score === 0) score = 1; // matched somewhere
      hits.push({ item: it, score: score });
    }
    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return (a.item.title || '').localeCompare(b.item.title || '');
    });
    var top = hits.slice(0, 25).map(function (h) { return h.item; });
    searchState.lastResults = top;
    searchState.cursor = top.length ? 0 : -1;
    _renderResults(top, query);
    _showPopover();
  }

  function _renderResults(items, query) {
    var pop = searchState.popover;
    if (!pop) return;
    pop.innerHTML = '';
    if (!items.length) {
      pop.appendChild(el('div', { class: 'bn-search__empty', text:
        query ? 'No matches for "' + query + '". Try a method name, chip (ML / OL / LF / v1 / v2), or a doc keyword.'
              : 'Type to search the sidebar, function methods, examples, docs, and JSDoc API.'
      }));
      return;
    }
    // Group by kind for visual scanning.
    var KIND_LABEL = { function: 'Functions', example: 'Examples',
                       doc: 'Documentation', 'doc-section': 'Documentation', api: 'API reference',
                       sidebar: 'Other' };
    var KIND_ICON  = { function: '⚙️', example: '🎬', doc: '📄', 'doc-section': '📄', api: '📖', sidebar: '↳' };
    var KIND_ORDER = ['function', 'example', 'doc', 'doc-section', 'api', 'sidebar'];
    var groups = {};
    for (var i = 0; i < items.length; i++) {
      var k = items[i].kind || 'sidebar';
      (groups[k] = groups[k] || []).push(items[i]);
    }
    var resultCounter = 0;
    KIND_ORDER.forEach(function (k) {
      if (!groups[k]) return;
      pop.appendChild(el('div', { class: 'bn-search__group-header', text: KIND_LABEL[k] || k }));
      groups[k].forEach(function (it) {
        var bread = it.section ? it.section + (it.heading ? ' › ' + it.heading : '') : '';
        var snip  = it.snippet || it.subtitle || '';
        var row = el('a', {
          class:        'bn-search__result',
          href:         it.href || '#',
          'data-bn-idx': String(resultCounter)
        }, [
          el('span', { class: 'bn-search__icon', text: KIND_ICON[k] || '·' }),
          el('div',  { class: 'bn-search__body' }, [
            el('div', { class: 'bn-search__title', html: _highlight(it.title || '', query) }),
            bread ? el('div', { class: 'bn-search__breadcrumb', text: bread }) : null,
            snip  ? el('div', { class: 'bn-search__snippet',    html: _highlight(_truncate(snip, 140), query) }) : null
          ])
        ]);
        if (it.target === '_blank') row.setAttribute('target', '_blank');
        row.addEventListener('mouseenter', function () {
          var idx = parseInt(row.getAttribute('data-bn-idx'), 10);
          _setCursor(idx);
        });
        row.addEventListener('click', function (e) {
          // Let `target=_blank` rows escape to native handling.
          if (it.target === '_blank') return;
          e.preventDefault();
          _navigate(it);
        });
        pop.appendChild(row);
        resultCounter++;
      });
    });
    _setCursor(searchState.cursor);
  }

  function _highlight(text, query) {
    var s = String(text || '');
    if (!query) return _escape(s);
    var idx = s.toLowerCase().indexOf(query);
    if (idx === -1) return _escape(s);
    return _escape(s.slice(0, idx)) +
           '<mark>' + _escape(s.slice(idx, idx + query.length)) + '</mark>' +
           _escape(s.slice(idx + query.length));
  }
  function _escape(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function _truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function _setCursor(idx) {
    var rows = searchState.popover ? searchState.popover.querySelectorAll('.bn-search__result') : [];
    if (!rows.length) { searchState.cursor = -1; return; }
    if (idx < 0) idx = 0;
    if (idx >= rows.length) idx = rows.length - 1;
    searchState.cursor = idx;
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.toggle('bn--active', i === idx);
    }
    var active = rows[idx];
    if (active && active.scrollIntoView) {
      try { active.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }
  }

  function _navigate(item) {
    _hidePopover();
    if (searchState.input) { try { searchState.input.blur(); } catch (e) {} }
    if (item.target === '_blank' && item.href) {
      try { global.open(item.href, '_blank', 'noopener'); } catch (e) {}
      return;
    }
    if (item.href && item.href.charAt(0) === '#') {
      // Force a hashchange even if it's the same hash (re-trigger autoRun).
      if (global.location.hash === item.href) {
        global.location.hash = '#';
        setTimeout(function () { global.location.hash = item.href; }, 0);
      } else {
        global.location.hash = item.href;
      }
    } else if (item.href) {
      global.location.href = item.href;
    }
  }

  function _onSearchKeydown(e) {
    var k = e.key;
    if (k === 'ArrowDown') { e.preventDefault(); _setCursor(searchState.cursor + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); _setCursor(searchState.cursor - 1); }
    else if (k === 'Enter') {
      e.preventDefault();
      var target = searchState.lastResults[searchState.cursor];
      if (target) _navigate(target);
    } else if (k === 'Escape') {
      _hidePopover();
      searchState.input.blur();
    }
  }

  function _showPopover() {
    if (searchState.popover) searchState.popover.style.display = 'block';
  }
  function _hidePopover() {
    if (searchState.popover) searchState.popover.style.display = 'none';
  }

  /* --------------------------------------------------
   * Credentials button — opens a popover with login/password
   * inputs. Values persist to localStorage under
   * `bemap.user-credentials.v1` (see examples/context.js).
   * On save, mutates bemapMainCtx.login/password live (the
   * RuntimeConfig Proxy's `set` trap syncs to innerCtx + ctxBridge)
   * AND reloads the active example iframe so service calls
   * inside it pick up the new creds. The badge label
   * ("Demo" / "User") updates in real time.
   * -------------------------------------------------- */
  var credentialsState = { popover: null, badge: null, btn: null, banner: null };

  // Three credential states for the badge label / colour:
  //   user  — login saved by the user via the popover         (green)
  //   demo  — bundled demo creds in use (legacy / local override) (yellow)
  //   empty — nothing set; every service call will 401        (red, pulses)
  function _credentialsState() {
    if (global.bemapCredentialsAreEmpty) return 'empty';
    if (global.bemapCredentialsAreDemo)  return 'demo';
    return 'user';
  }
  var BADGE_TEXT  = { user: 'User',  demo: 'Demo',  empty: 'Not set' };
  var BADGE_TITLE = {
    user:  'Using your own BeMap credentials',
    demo:  'Demo credentials in use — click to enter your own BeMap account',
    empty: 'NO credentials configured — click to enter your BeMap account. Service calls will 401 until you do.'
  };

  function buildCredentialsButton() {
    var state = _credentialsState();
    var badge = el('span', {
      class: 'bn-cred__badge bn-cred__badge--' + state,
      text:  BADGE_TEXT[state],
      title: BADGE_TITLE[state]
    });
    var btn = el('button', {
      type: 'button',
      class: 'bn-btn bn-btn--ghost bn-btn--sm bn-cred__btn' +
             (state === 'empty' ? ' bn-cred__btn--empty' : ''),
      title: BADGE_TITLE[state],
      on: { click: toggleCredentialsPopover }
    }, [doc.createTextNode('Credentials '), badge]);
    credentialsState.badge = badge;
    credentialsState.btn = btn;
    return btn;
  }

  // Loud red banner shown directly under the topbar when no credentials
  // are configured. Goes away the moment the user saves valid creds via
  // the popover (applyCredentialsLive flips bemapCredentialsAreEmpty).
  function buildCredentialsBanner() {
    if (!global.bemapCredentialsAreEmpty) return null;
    var openBtn = el('button', {
      type: 'button',
      class: 'bn-cred-banner__btn',
      text: 'Set credentials →',
      on: { click: openCredentialsPopover }
    });
    var msg = el('span', { class: 'bn-cred-banner__msg', html:
      '<strong>⚠ No credentials configured.</strong> Every service call will return ' +
      '<code>401 Unauthorized</code> until you enter your BeMap account login + password.'
    });
    var bar = el('div', { class: 'bn-cred-banner', role: 'alert' }, [msg, openBtn]);
    credentialsState.banner = bar;
    return bar;
  }

  function toggleCredentialsPopover() {
    if (credentialsState.popover && credentialsState.popover.parentNode) {
      closeCredentialsPopover();
      return;
    }
    openCredentialsPopover();
  }

  // Read the saved credentials for a specific environment from the per-env
  // map ({ beta:{login,password}, … }). Returns blanks when none are saved.
  function credsForEnv(envKey) {
    try {
      var key = global.bemapUserCredentialsKey || 'bemap.user-credentials.v1';
      var raw = localStorage.getItem(key);
      if (raw) {
        var map = JSON.parse(raw);
        if (map && typeof map === 'object' && map[envKey] && typeof map[envKey].login === 'string') {
          return { login: map[envKey].login || '', password: map[envKey].password || '' };
        }
      }
    } catch (e) { /* ignore */ }
    return { login: '', password: '' };
  }

  function openCredentialsPopover() {
    // Credentials are PER ENVIRONMENT — pick the env first, then the account.
    var envs = global.bemapEnvironments || {};
    var activeEnvKey = global.bemapActiveEnvKey || 'beta';

    var envSel = el('select', { class: 'bn-cred__input', id: 'credEnvSelect',
      title: 'BeMap environment these credentials belong to' });
    var hasEnvs = false;
    for (var ek in envs) {
      if (!Object.prototype.hasOwnProperty.call(envs, ek)) continue;
      hasEnvs = true;
      envSel.appendChild(el('option', { value: ek, text: (envs[ek].label || ek) + ' — ' + envs[ek].host }));
    }
    if (hasEnvs) envSel.value = activeEnvKey;

    // Initial fields = saved creds for the active env; fall back to whatever the
    // live Context holds (covers an unsaved demo account on the active env).
    var initial = credsForEnv(activeEnvKey);
    if (!initial.login && global.bemap && global.bemap.RuntimeConfig) {
      var cfg = global.bemap.RuntimeConfig.toJSON() || {};
      initial = { login: cfg.login || '', password: cfg.password || '' };
    }

    var loginInput = el('input', {
      type: 'text',
      class: 'bn-cred__input',
      placeholder: 'your BeMap login',
      value: initial.login || '',
      autocomplete: 'username'
    });
    var passInput = el('input', {
      type: 'password',
      class: 'bn-cred__input',
      placeholder: 'your BeMap password',
      value: initial.password || '',
      autocomplete: 'current-password'
    });

    // Switching env in the popover loads THAT env's saved creds (blank if none)
    // so each environment can carry a different BeMap account.
    envSel.addEventListener('change', function () {
      var c = credsForEnv(envSel.value);
      loginInput.value = c.login;
      passInput.value  = c.password;
    });
    var hint = el('div', { class: 'bn-cred__hint' });
    function updateHint() {
      var isDemo = !!global.bemapCredentialsAreDemo;
      hint.innerHTML = isDemo
        ? '<strong>Demo credentials in use.</strong> They are shared and rate-limited — enter your own for production-rate access.'
        : '<strong>Your credentials are saved locally.</strong> They are used for every service call from this dashboard and substituted into copyable code snippets.';
    }
    updateHint();

    var saveBtn = el('button', {
      type: 'button',
      class: 'bn-btn bn-btn--accent bn-btn--sm',
      text: 'Save',
      on: { click: function () {
        var login = (loginInput.value || '').trim();
        var pwd   = (passInput.value || '').trim();
        if (!login || !pwd) {
          hint.innerHTML = '<strong style="color:var(--bn-err)">Both login and password are required.</strong>';
          return;
        }
        saveCredentials(login, pwd, envSel.value);
        closeCredentialsPopover();
      }}
    });
    // Button label depends on whether bundled demo creds exist (via the
    // optional local-only context.local.js → window.bemapDemoCreds). With
    // no demo, the button just wipes localStorage → dashboard returns to
    // the red "Not set" banner state.
    var hasDemoFallback = !!(global.bemapDemoCredentials &&
                             global.bemapDemoCredentials.login &&
                             global.bemapDemoCredentials.password);
    var resetBtn = el('button', {
      type: 'button',
      class: 'bn-btn bn-btn--ghost bn-btn--sm',
      text:  hasDemoFallback ? 'Reset to demo' : 'Clear',
      title: hasDemoFallback
        ? 'Wipe stored credentials and revert to the bundled demo account'
        : 'Wipe stored credentials — service calls will 401 until you save new ones',
      on: { click: function () {
        resetCredentials();
        closeCredentialsPopover();
      }}
    });
    var cancelBtn = el('button', {
      type: 'button',
      class: 'bn-btn bn-btn--ghost bn-btn--sm',
      text: 'Cancel',
      on: { click: closeCredentialsPopover }
    });

    var popover = el('div', { class: 'bn-cred__popover', role: 'dialog', 'aria-label': 'BeMap credentials' }, [
      el('div', { class: 'bn-cred__title', text: 'BeMap account credentials' }),
      hasEnvs ? el('label', { class: 'bn-cred__label', text: 'Environment' }) : null,
      hasEnvs ? envSel : null,
      el('label', { class: 'bn-cred__label', text: 'Login' }),
      loginInput,
      el('label', { class: 'bn-cred__label', text: 'Password' }),
      passInput,
      hint,
      el('div', { class: 'bn-cred__actions' }, [resetBtn, cancelBtn, saveBtn])
    ]);
    credentialsState.popover = popover;

    // Position the popover under the button.
    if (credentialsState.btn) {
      credentialsState.btn.parentNode.appendChild(popover);
    } else {
      doc.body.appendChild(popover);
    }
    setTimeout(function () { try { loginInput.focus(); loginInput.select(); } catch (e) {} }, 0);

    // Close on outside click / Escape.
    var handler = function (e) {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.type === 'mousedown') {
        if (popover.contains(e.target) || (credentialsState.btn && credentialsState.btn.contains(e.target))) return;
      }
      closeCredentialsPopover();
      doc.removeEventListener('mousedown', handler, true);
      doc.removeEventListener('keydown', handler, true);
    };
    doc.addEventListener('mousedown', handler, true);
    doc.addEventListener('keydown', handler, true);
  }

  function closeCredentialsPopover() {
    if (credentialsState.popover && credentialsState.popover.parentNode) {
      credentialsState.popover.parentNode.removeChild(credentialsState.popover);
    }
    credentialsState.popover = null;
  }

  // Read the per-env credentials map from storage (always a map post-migration;
  // a stray legacy flat shape is treated as empty so we never merge into it).
  function _readCredsMap() {
    try {
      var raw = localStorage.getItem(global.bemapUserCredentialsKey || 'bemap.user-credentials.v1');
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object' && typeof p.login !== 'string') return p;
      }
    } catch (e) { /* ignore */ }
    return {};
  }
  function _writeCredsMap(map) {
    try {
      var key = global.bemapUserCredentialsKey || 'bemap.user-credentials.v1';
      if (map && Object.keys(map).length) localStorage.setItem(key, JSON.stringify(map));
      else localStorage.removeItem(key);
    } catch (e) { /* quota / private mode — ignore */ }
  }

  // Persist creds for an env into the per-env map + remember it as the active
  // env. PURE storage (no reload / no live mutation) so it is unit-testable.
  // Returns the resolved env + whether activating it needs a reload (i.e. the
  // chosen env differs from the currently-active one → host + tiles change).
  function _persistCredsForEnv(login, password, selectedEnv) {
    var activeEnv = global.bemapActiveEnvKey || 'beta';
    var envKey = selectedEnv || activeEnv;
    var map = _readCredsMap();
    map[envKey] = { login: login, password: password };
    _writeCredsMap(map);
    try { localStorage.setItem(global.bemapEnvStorageKey || 'bemap-env', envKey); } catch (e) { /* ignore */ }
    return { envKey: envKey, willReload: envKey !== activeEnv };
  }

  // Remove just one env's entry from the per-env map (others untouched).
  function _clearCredsForEnv(envKey) {
    var map = _readCredsMap();
    delete map[envKey];
    _writeCredsMap(map);
  }

  function saveCredentials(login, password, selectedEnv) {
    var plan = _persistCredsForEnv(login, password, selectedEnv);
    if (!plan.willReload) {
      // Same env → API/tiles host unchanged → apply live, no reload.
      applyCredentialsLive(login, password, /* demo */ false);
      log('Credentials saved for "' + plan.envKey + '" — service calls now use the account "' + login + '"');
    } else {
      // Different env → API host AND tiles host change → clean rebuild via
      // reload (host is bound once at RuntimeConfig.bind; TilesAuth logs in
      // once at map construction). Drop the old env's tiles JWT first.
      try {
        var tkey = (global.bemap && global.bemap.TilesAuth && global.bemap.TilesAuth.STORAGE_KEY) || 'bemap_tiles_token';
        localStorage.removeItem(tkey);
      } catch (e) { /* ignore */ }
      log('Switching to "' + plan.envKey + '" and reloading to apply its host + credentials…');
      global.location.reload();
    }
  }

  function resetCredentials() {
    // Clear ONLY the active env's entry — other envs keep their saved accounts.
    var envKey = global.bemapActiveEnvKey || 'beta';
    _clearCredsForEnv(envKey);
    var demo = global.bemapDemoCredentials || { login: '', password: '' };
    var hasDemo = !!(demo.login && demo.password);
    applyCredentialsLive(demo.login, demo.password, /* isDemo */ hasDemo);
    log(hasDemo
      ? 'Credentials reset to the bundled demo account for "' + envKey + '"'
      : 'Credentials cleared for "' + envKey + '" — service calls will 401 until you save new ones');
  }

  function applyCredentialsLive(login, password, isDemo) {
    // 1. Mutate the live ctx Proxy — the RuntimeConfig `set` trap pushes
    //    these into both ctxBridge AND innerCtx (the real bemap.Context),
    //    invalidating the cached auth URLs so the very next service call
    //    rebuilds with the new creds.
    try {
      if (global.bemapMainCtx) {
        global.bemapMainCtx.login = login;
        global.bemapMainCtx.password = password;
        // Force the Context to drop its cached Basic-Auth / URL params so
        // the next getBaseUrl() / getAuthUrlParams() picks up the new creds.
        try {
          global.bemapMainCtx.cacheBaseUrl = null;
          global.bemapMainCtx.cacheUrlAuthParams = null;
          global.bemapMainCtx.cacheBase64Auth = null;
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }

    // 2. Update the three-state badge label / colour + the warning banner.
    var nextEmpty = !login || !password;
    global.bemapCredentialsAreDemo  = !!isDemo && !nextEmpty;
    global.bemapCredentialsAreEmpty = nextEmpty;
    var nextState = nextEmpty ? 'empty' : (isDemo ? 'demo' : 'user');
    if (credentialsState.badge) {
      credentialsState.badge.textContent = BADGE_TEXT[nextState];
      credentialsState.badge.className   = 'bn-cred__badge bn-cred__badge--' + nextState;
      credentialsState.badge.title       = BADGE_TITLE[nextState];
    }
    if (credentialsState.btn) {
      credentialsState.btn.classList.toggle('bn-cred__btn--empty', nextState === 'empty');
    }
    if (credentialsState.banner) {
      if (nextEmpty) {
        credentialsState.banner.style.display = '';
      } else {
        // Removing rather than hiding so it doesn't reserve any vertical
        // space + so it gets rebuilt cleanly if creds get cleared later.
        if (credentialsState.banner.parentNode) {
          credentialsState.banner.parentNode.removeChild(credentialsState.banner);
        }
        credentialsState.banner = null;
      }
    } else if (nextEmpty) {
      // Banner was previously dismissed/removed but we're back to empty —
      // rebuild + re-insert under the topbar.
      var newBar = buildCredentialsBanner();
      var topbar = doc.querySelector('.bn-topbar');
      if (newBar && topbar && topbar.parentNode) {
        topbar.parentNode.insertBefore(newBar, topbar.nextSibling);
      }
    }

    // 3. Force-reload the active example iframe so its OWN bemapMainCtx
    //    (separate Context instance inside the iframe) picks up the new
    //    creds from localStorage on next boot.
    try {
      if (shellState && shellState.currentIframe) {
        shellState.currentIframe.src = shellState.currentIframe.src;
      }
    } catch (e) { /* ignore */ }

    // 4. Broadcast to anything subscribed (e.g. snippet substitution).
    try { global.dispatchEvent(new CustomEvent('bemap:credentials-changed', { detail: { isDemo: !!isDemo } })); } catch (e) { /* ignore */ }
  }

  /* --------------------------------------------------
   * Log pane
   * -------------------------------------------------- */

  var logState = { entries: [], collapsed: false, root: null, body: null, count: null, empty: null };

  function buildLog() {
    var body  = el('div', { class: 'bn-log__body' });
    var empty = el('div', { class: 'bn-log__empty', text: 'Waiting for events…' });
    body.appendChild(empty);

    var count = el('span', { class: 'bn-log__count', text: '0' });

    var header = el('div', { class: 'bn-log__header' }, [
      el('span', { class: 'bn-log__title', text: 'Console' }),
      count,
      el('div', { class: 'bn-log__spacer' }),
      el('button', { class: 'bn-log__btn', type: 'button', text: 'Copy',  on: { click: copyLog  } }),
      el('button', { class: 'bn-log__btn', type: 'button', text: 'Clear', on: { click: clearLog } }),
      el('button', { class: 'bn-log__btn', type: 'button', html: 'Collapse <span class="bn-log__toggle-icon">⌄</span>', on: { click: toggleLog } })
    ]);

    var root = el('footer', { class: 'bn-log' }, [header, body]);
    logState.root = root; logState.body = body; logState.count = count; logState.empty = empty;
    return root;
  }

  function log(message, level) {
    level = level || 'info';
    var ts = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var ts_s = pad(ts.getHours()) + ':' + pad(ts.getMinutes()) + ':' + pad(ts.getSeconds());

    logState.entries.push({ ts: ts_s, level: level, message: String(message) });

    if (logState.body) {
      if (logState.empty && logState.empty.parentNode === logState.body) {
        logState.body.removeChild(logState.empty);
      }
      var line = el('div', { class: 'bn-log__entry', 'data-level': level });
      line.appendChild(el('span', { class: 'bn-log__ts',  text: ts_s }));
      line.appendChild(el('span', { class: 'bn-log__lvl', text: level }));
      line.appendChild(doc.createTextNode(String(message)));
      var atBottom = (logState.body.scrollTop + logState.body.clientHeight) >= (logState.body.scrollHeight - 4);
      logState.body.appendChild(line);
      if (atBottom) logState.body.scrollTop = logState.body.scrollHeight;
      if (logState.count) logState.count.textContent = String(logState.entries.length);
    }

    var c = level === 'err' ? 'error' : (level === 'warn' ? 'warn' : 'log');
    if (global.console && global.console[c]) global.console[c]('[bn] ' + message);
  }
  function clearLog() {
    logState.entries.length = 0;
    if (logState.body) {
      logState.body.innerHTML = '';
      logState.empty = el('div', { class: 'bn-log__empty', text: 'Waiting for events…' });
      logState.body.appendChild(logState.empty);
    }
    if (logState.count) logState.count.textContent = '0';
  }
  function copyLog() {
    var txt = logState.entries.map(function (e) {
      return '[' + e.ts + '] ' + e.level.toUpperCase() + ' ' + e.message;
    }).join('\n');
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(txt).catch(noop);
    } else {
      var ta = doc.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = 0;
      doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy'); } catch (e) {}
      doc.body.removeChild(ta);
    }
  }
  function toggleLog() {
    logState.collapsed = !logState.collapsed;
    if (logState.root) logState.root.classList.toggle('bn-log--collapsed', logState.collapsed);
  }
  function noop() {}

  /* --------------------------------------------------
   * Side panel
   * -------------------------------------------------- */

  function makePanel(opts) {
    opts = opts || {};
    var title = opts.title || 'Controls';
    var body = el('div', { class: 'bn-panel__body' });
    var toggleBtn = el('button', { class: 'bn-panel__header-toggle', type: 'button', html: '⮞', title: 'Collapse' });

    var root = el('aside', { class: 'bn-panel', id: opts.id || 'bnPanel' }, [
      el('div', { class: 'bn-panel__header' }, [
        el('span', { class: 'bn-panel__header-title', text: title }),
        toggleBtn
      ]),
      body
    ]);

    toggleBtn.addEventListener('click', function () {
      root.classList.toggle('bn-panel--collapsed');
      toggleBtn.innerHTML = root.classList.contains('bn-panel--collapsed') ? '⮜' : '⮞';
    });

    (opts.sections || []).forEach(function (s) {
      var section = el('section', { class: 'bn-panel__section' });
      if (s.heading) section.appendChild(el('h4', { text: s.heading }));
      (s.rows || []).forEach(function (r) {
        var row = el('div', { class: 'bn-row' });
        if (r.label) row.appendChild(el('label', { text: r.label }));
        var ctrl = r.control;
        if (typeof ctrl === 'string') {
          var wrap = el('div'); wrap.innerHTML = ctrl;
          while (wrap.firstChild) row.appendChild(wrap.firstChild);
        } else if (ctrl) {
          row.appendChild(ctrl);
        }
        section.appendChild(row);
      });
      body.appendChild(section);
    });

    return { root: root, body: body, addSection: function (heading) {
      var s = el('section', { class: 'bn-panel__section' });
      if (heading) s.appendChild(el('h4', { text: heading }));
      body.appendChild(s);
      return s;
    } };
  }

  /* --------------------------------------------------
   * Engine-agnostic onMapReady
   * -------------------------------------------------- */

  function onMapReady(map, fn) {
    if (!map) { setTimeout(fn, 0); return; }
    try {
      if (map.native && typeof map.native.isStyleLoaded === 'function') {  // MapLibre
        if (map.native.isStyleLoaded()) { fn(); }
        else map.native.once('load', fn);
        return;
      }
      if (map.native && typeof map.native.whenReady === 'function') {       // Leaflet
        map.native.whenReady(fn);
        return;
      }
      if (map.native && typeof map.native.once === 'function') {            // OpenLayers
        map.native.once('postrender', fn);
        return;
      }
    } catch (e) {}
    setTimeout(fn, 0);
  }

  /* --------------------------------------------------
   * Formatters
   * -------------------------------------------------- */

  function fmtCoord(lon, lat) {
    if (lon && typeof lon.getLon === 'function') { lat = lon.getLat(); lon = lon.getLon(); }
    return (+lon).toFixed(5) + ', ' + (+lat).toFixed(5);
  }
  function fmtKm(meters)  { return (meters / 1000).toFixed(2) + ' km'; }
  function fmtMs(ms)      {
    if (ms < 1000) return ms + ' ms';
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' s';
    return Math.floor(s / 60) + ' min ' + (s % 60) + ' s';
  }

  /* --------------------------------------------------
   * Boot
   * -------------------------------------------------- */

  function boot(opts) {
    opts = opts || {};
    var body = doc.body;
    body.classList.add('bn-page');
    var embedded = isEmbedded();
    if (embedded) body.classList.add('bn-embedded');

    // Read overrides from <body data-bn-*=...>
    var dataTitle    = body.getAttribute('data-bn-title');
    var dataSubtitle = body.getAttribute('data-bn-subtitle');
    var dataHasLog   = body.getAttribute('data-bn-log');     // "off" to disable
    var dataChips    = body.getAttribute('data-bn-chips');

    if (dataTitle    && !opts.title)    opts.title    = dataTitle;
    if (dataSubtitle && !opts.subtitle) opts.subtitle = dataSubtitle;
    if (dataChips    && !opts.chips) {
      opts.chips = dataChips.split(',').map(function (s) {
        var parts = s.trim().split(':');
        return { label: parts[0], kind: parts[1] || null };
      });
    }

    // When this page is rendered inside the SPA dashboard iframe, the
    // dashboard provides the top bar, log panel and side chrome. Building
    // a second set inside the embedded page would duplicate every element
    // (two top bars, two consoles, two code panels). Forward the page's
    // metadata up so the dashboard can update its own chrome, then bail.
    if (embedded) {
      try {
        window.parent.postMessage({
          type:  'bemap:page:meta',
          title: opts.title    || '',
          subtitle: opts.subtitle || '',
          chips: opts.chips    || []
        }, '*');
      } catch (e) {}
      bn.elements = { topbar: null, log: null };
      return;
    }

    var enableLog = (opts.hasLog !== false) && (dataHasLog !== 'off');

    // Standalone page (opened in its own tab) — build the full single-page
    // chrome: top bar + optional log panel.
    var existingShell = $('.bn-shell');
    var topbar = buildTopBar(opts);
    var logPane = enableLog ? buildLog() : null;

    if (existingShell) {
      if (!$('.bn-topbar', existingShell)) existingShell.insertBefore(topbar, existingShell.firstChild);
      if (logPane && !$('.bn-log', existingShell)) existingShell.appendChild(logPane);
    } else {
      var stage = el('div', { class: 'bn-stage' });
      var kids = [];
      for (var i = 0; i < body.children.length; i++) kids.push(body.children[i]);
      kids.forEach(function (k) { stage.appendChild(k); });
      if (stage.children.length === 1 && stage.children[0].id) {
        stage.children[0].classList.add('bn-map');
      }
      var shell = el('div', { class: 'bn-shell' }, [topbar, stage]);
      if (logPane) shell.appendChild(logPane);
      body.appendChild(shell);
    }

    bn.elements = { topbar: topbar, log: logPane };
  }

  /* ============================================================
   * SPA shell
   * ============================================================ */

  /* ----- bn.registerExample / idempotent registry ----- */
  var registry = {};
  function registerExample(name, opts) {
    if (registry[name]) {
      // First registration wins (§2.5); subsequent calls log a warning.
      if (global.console && global.console.warn) global.console.warn('bn.registerExample: "' + name + '" already registered; ignoring second call.');
      return;
    }
    registry[name] = opts || {};
  }
  function lookupExample(name) { return registry[name] || null; }

  /* ----- bn.snippet — rewriter pipeline (§6.2) ----- */
  function rewriteSnippet(src, name) {
    if (typeof src !== 'string') return '';
    var lines = src.split('\n');
    var out = [];
    var inRegister = false, registerDepth = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Strip bn.log(...) whole lines
      if (/^\s*bn\.log\s*\(/.test(line)) continue;
      // Strip RuntimeConfig.set / .onChange whole lines
      if (/^\s*bemap\.RuntimeConfig\.(set|onChange|bind)\s*\(/.test(line)) continue;
      // Strip bridge <script> tags
      if (/<script\s+src=["']effect-bridge\.js["']/.test(line)) continue;
      if (/<script\s+src=["']bemap-provider\.js["']/.test(line)) continue;
      // Unwrap bn.registerExample(name, { boot(stage){ ... }, dispose(){}, meta: {} })
      // Heuristic: when we see registerExample, skip until the matching closing brace
      // of `boot(stage) {` then emit inner body only.
      if (!inRegister && /bn\.registerExample\s*\(/.test(line)) {
        inRegister = true;
        // Look for `boot:` or `boot(stage)` opening — start counting braces from there.
        // For simplicity emit nothing until we exit boot's brace.
        registerDepth = 0;
        continue;
      }
      if (inRegister) {
        // Count braces; when we exit, switch back.
        for (var c = 0; c < line.length; c++) {
          if (line[c] === '{') registerDepth++;
          else if (line[c] === '}') registerDepth--;
        }
        if (registerDepth <= 0 && /\}\s*\)\s*;?\s*$/.test(line)) {
          inRegister = false;
        }
        // Emit lines INSIDE boot's body (depth >= 2 = inside register({ boot: function() { ... } }))
        if (registerDepth >= 2) out.push(line);
        continue;
      }
      out.push(line);
    }
    var joined = out.join('\n');
    // Substitute bemapMainCtx → literal new bemap.Context({...}) from live RuntimeConfig
    if (global.bemap && global.bemap.RuntimeConfig) {
      try {
        var cfg = global.bemap.RuntimeConfig.toJSON();
        var ctxLiteral = 'new bemap.Context({\n' +
          "    host:      '" + (cfg.host || '') + "',\n" +
          "    login:     '" + (cfg.login || '') + "',\n" +
          "    password:  '" + (cfg.password || '') + "',\n" +
          '    secure:    ' + (cfg.secure ? 'true' : 'false') + ',\n' +
          "    geoserver: '" + (cfg.geoserver || 'default') + "'," +
          (cfg.tilesHost ? "\n    tilesHost: '" + cfg.tilesHost + "'\n" : '\n') +
          '  })';
        joined = joined.replace(/\bbemapMainCtx\b/g, ctxLiteral);
      } catch (e) {}
    }
    // Trim and add a "Source:" header
    joined = joined.replace(/^\s+|\s+$/g, '');
    if (name) joined = '// Source: examples/' + name + ' — copy & paste\n\n' + joined;
    return joined;
  }

  /* ----- bn.controlsBar — thin button row above the code panel, populated
   * by `bemap:fn:controls` events from the embedded function showcase.
   * Clicking a button posts `bemap:fn:btn` back to the iframe by index. ----- */
  var controlsState = { root: null, title: null, list: null };
  function buildControlsBar() {
    if (controlsState.root) return controlsState.root;
    var title = el('span', { class: 'bn-controls__title', text: '' });
    var list  = el('div',  { class: 'bn-controls__list' });
    var clearBtn = el('button', { class: 'bn-controls__btn bn-controls__btn--reset', type: 'button', text: 'Clear Log', on: { click: function () {
      try { if (shellState.currentIframe) shellState.currentIframe.contentWindow.postMessage({ type: 'bemap:fn:clear-log' }, '*'); } catch (e) {}
      clearLog();
    }}});
    var root = el('div', { class: 'bn-controls' }, [title, list, clearBtn]);
    root.style.display = 'none';
    controlsState.root = root; controlsState.title = title; controlsState.list = list;
    return root;
  }
  function renderControlsBar(title, buttons) {
    var bar = controlsState.root || buildControlsBar();
    controlsState.title.textContent = title || '';
    controlsState.list.innerHTML = '';
    buttons.forEach(function (b, i) {
      var btn = el('button', {
        class: 'bn-controls__btn',
        type:  'button',
        text:  b.label,
        on:    { click: function () {
          try { shellState.currentIframe.contentWindow.postMessage({ type: 'bemap:fn:btn', idx: i }, '*'); }
          catch (e) {}
        }}
      });
      controlsState.list.appendChild(btn);
    });
    bar.style.display = (buttons.length || title) ? 'flex' : 'none';
  }

  /* ----- bn.codePanel — bottom panel (§6) ----- */
  var codeState = { entries: {}, current: null, collapsed: false, root: null, body: null, label: null };
  function buildCodePanel() {
    if (codeState.root) return codeState.root;
    var label = el('span', { class: 'bn-code__label', text: '' });
    var body  = el('pre',  { class: 'bn-code__body' });
    var copyBtn  = el('button', { class: 'bn-code__btn', type: 'button', text: 'Copy',  on: { click: copyCode } });
    var toggleBtn = el('button', { class: 'bn-code__btn', type: 'button', html: 'Collapse <span class="bn-code__caret">⌄</span>', on: { click: toggleCode } });
    var header = el('div', { class: 'bn-code__header' }, [
      el('span', { class: 'bn-code__title', text: '📋 Code' }),
      label,
      el('div', { class: 'bn-code__spacer' }),
      copyBtn, toggleBtn
    ]);
    var root = el('section', { class: 'bn-code' }, [header, body]);
    codeState.root = root; codeState.body = body; codeState.label = label;
    return root;
  }
  function setCodeSource(src, label) {
    if (!codeState.root) return;
    codeState.body.textContent = String(src || '');
    codeState.label.textContent = label ? '· ' + label : '';
  }
  function copyCode() {
    if (!codeState.body) return;
    var txt = codeState.body.textContent;
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(txt).catch(function () {});
    } else {
      var ta = doc.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = 0;
      doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy'); } catch (e) {}
      doc.body.removeChild(ta);
    }
  }
  function toggleCode() {
    codeState.collapsed = !codeState.collapsed;
    if (codeState.root) codeState.root.classList.toggle('bn-code--collapsed', codeState.collapsed);
  }

  /* ----- bn.requestSnippet — per-call snippet card inside .bn-panel ----- */
  function requestSnippet(opts) {
    opts = opts || {};
    var parent = opts.parent;
    if (!parent) return null;
    var blocks = opts.blocks || ['context', 'request', 'call', 'response'];
    var blockEls = {};
    var bodyEl = el('div', { class: 'bn-card__body' });
    blocks.forEach(function (b) {
      var pre = el('pre', { text: '' });
      var blk = el('div', { class: 'bn-card__block' }, [
        el('div', { class: 'bn-card__block-label', text: b }),
        pre
      ]);
      blockEls[b] = pre;
      bodyEl.appendChild(blk);
    });
    var caret = el('span', { class: 'bn-card__caret', text: '▾' });
    var header = el('div', { class: 'bn-card__header', 'aria-expanded': opts.open ? 'true' : 'false' }, [
      el('span', { text: opts.title || 'Code example' }),
      caret
    ]);
    var card = el('details', { class: 'bn-card bn-card--snippet' }, [header, bodyEl]);
    header.addEventListener('click', function (e) {
      e.preventDefault();
      var open = card.hasAttribute('open');
      if (open) card.removeAttribute('open'); else card.setAttribute('open', '');
      header.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    if (opts.open) card.setAttribute('open', '');
    parent.appendChild(card);
    var api = {};
    blocks.forEach(function (b) {
      var name = 'set' + b.charAt(0).toUpperCase() + b.slice(1);
      api[name] = function (txt) { blockEls[b].textContent = String(txt == null ? '' : txt); return api; };
    });
    return api;
  }

  /* ----- bn.sidebar — nested tree renderer with persistence + gating (§3) ----- */
  var sidebarState = { manifest: null, root: null, openMap: {}, activePath: null };
  function loadSidebarState() {
    try {
      var openRaw = localStorage.getItem('bn.sidebar.v1.open');
      sidebarState.openMap = openRaw ? (JSON.parse(openRaw) || {}) : {};
    } catch (e) { sidebarState.openMap = {}; }
    try {
      sidebarState.activePath = sessionStorage.getItem('bn.sidebar.v1.active') || null;
    } catch (e) { sidebarState.activePath = null; }
  }
  function persistSidebarOpen() {
    try { localStorage.setItem('bn.sidebar.v1.open', JSON.stringify(sidebarState.openMap)); } catch (e) {}
  }
  function persistSidebarActive(path) {
    try { sessionStorage.setItem('bn.sidebar.v1.active', path || ''); } catch (e) {}
  }
  function renderSidebar(rootEl, manifest) {
    sidebarState.manifest = manifest || [];
    loadSidebarState();
    var scroll = el('div', { class: 'bn-sidebar__scroll' });
    var tree = el('ul', { class: 'bn-tree' });
    manifest.forEach(function (sec) {
      tree.appendChild(buildSection(sec, [sec.label]));
    });
    scroll.appendChild(tree);
    // Provider card slot is left for the dashboard to fill — we just expose
    // a helper hook here. The dashboard mounts its own card content via
    // bn.sidebar.setProviderCard(htmlElement).
    rootEl.innerHTML = '';
    if (sidebarState.providerCard) rootEl.appendChild(sidebarState.providerCard);
    rootEl.appendChild(scroll);
    sidebarState.root = rootEl;
  }
  function buildSection(sec, pathSoFar) {
    var pathKey = pathSoFar.join('/');
    var isOpen = (sec.label === 'Get started') ? (sidebarState.openMap[pathKey] !== false)
                                                : (sidebarState.openMap[pathKey] === true);
    var caret = el('span', { class: 'bn-tree__caret', text: '▸' });
    var btn = el('button', { class: 'bn-tree__section', type: 'button', 'aria-expanded': isOpen ? 'true' : 'false' }, [
      caret,
      el('span', { text: sec.label })
    ]);
    var children = el('ul', { class: 'bn-tree__children' });
    // No inline max-height — the [aria-expanded="true"] + .bn-tree__children
    // CSS rule alone controls visibility, so toggling the attribute on click
    // collapses + re-expands cleanly. Inline styles override CSS and would
    // wedge the section permanently open.
    btn.addEventListener('click', function () {
      var nowOpen = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      sidebarState.openMap[pathKey] = nowOpen;
      persistSidebarOpen();
    });
    (sec.children || []).forEach(function (child) {
      if (child.children) {
        children.appendChild(buildSubsection(child, pathSoFar.concat([child.label])));
      } else {
        children.appendChild(buildLeaf(child, pathSoFar.concat([child.label]).join('/')));
      }
    });
    var li = el('li', { class: 'bn-tree__group' }, [btn, children]);
    return li;
  }
  function buildSubsection(sec, pathSoFar) {
    var pathKey = pathSoFar.join('/');
    var isOpen = sidebarState.openMap[pathKey] === true;
    var caret = el('span', { class: 'bn-tree__caret', text: '▸' });
    var btn = el('button', { class: 'bn-tree__subsection', type: 'button', 'aria-expanded': isOpen ? 'true' : 'false' }, [
      caret, el('span', { text: sec.label })
    ]);
    var children = el('ul', { class: 'bn-tree__children' });
    // No inline max-height — the [aria-expanded="true"] + .bn-tree__children
    // CSS rule alone controls visibility, so toggling the attribute on click
    // collapses + re-expands cleanly. Inline styles override CSS and would
    // wedge the section permanently open.
    btn.addEventListener('click', function () {
      var nowOpen = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      sidebarState.openMap[pathKey] = nowOpen;
      persistSidebarOpen();
    });
    (sec.children || []).forEach(function (child) {
      children.appendChild(buildLeaf(child, pathSoFar.concat([child.label]).join('/')));
    });
    return el('li', null, [btn, children]);
  }
  function buildLeaf(leaf, path) {
    var label = el('span', { class: 'bn-tree__leaf-label', text: leaf.label });
    var children = [label];
    (leaf.chips || []).forEach(function (c) {
      var cls = 'bn-chip';
      if (c.kind) cls += ' bn-chip--' + c.kind;
      children.push(el('span', { class: cls, text: c.label || c }));
    });
    var classes = 'bn-tree__leaf';
    if (sidebarState.activePath === path) classes += ' bn--active';
    var a = el('a', {
      class: classes,
      href: leaf.href || '#',
      'data-bn-path': path
    }, children);
    if (leaf.requiresService) a.setAttribute('data-requires-service', leaf.requiresService);
    if (leaf.requiresProvider) a.setAttribute('data-requires-provider', leaf.requiresProvider);
    if (leaf.adminOnly) a.classList.add('admin-only', 'bn-tree__leaf--admin');
    if (leaf.target) { a.setAttribute('target', leaf.target); a.setAttribute('rel', 'noopener'); }
    a.addEventListener('click', function () {
      sidebarState.activePath = path;
      persistSidebarActive(path);
      // Update highlight live
      var all = sidebarState.root ? sidebarState.root.querySelectorAll('.bn-tree__leaf') : [];
      for (var i = 0; i < all.length; i++) {
        all[i].classList.toggle('bn--active', all[i] === a);
      }
    });
    return el('li', null, [a]);
  }

  /* ----- bn.shell — SPA hash router (§2) ----- */
  var shellState = { stage: null, currentExample: null };
  function bootShell(opts) {
    opts = opts || {};
    var body = doc.body;
    body.classList.add('bn-page');
    if (isEmbedded()) body.classList.add('bn-embedded');

    // Reload the embedded example iframe whenever a RuntimeConfig field
    // changes — same UX as the V1 dashboard. The iframe's window pulls a
    // fresh bemapMainCtx with the new geoserver / CSP / tilesHost on next
    // map construction.
    if (global.bemap && global.bemap.RuntimeConfig && typeof global.bemap.RuntimeConfig.onChange === 'function') {
      global.bemap.RuntimeConfig.onChange(function () {
        if (shellState.currentIframe) {
          try { shellState.currentIframe.src = shellState.currentIframe.src; } catch (e) {}
        }
      });
    }

    // Listen for postMessages from embedded examples. functions.js posts
    //   bemap:fn:log       — { provider, status, msg } → outer console
    //   bemap:fn:code      — { code, label }           → outer code panel
    //   bemap:fn:controls  — { title, buttons[]}       → outer controls slot
    global.addEventListener('message', function (ev) {
      var d = ev.data;
      if (!d || typeof d !== 'object' || !d.type) return;
      if (d.type === 'bemap:fn:log') {
        var lvl = d.status === 'err' ? 'err' : d.status === 'warn' ? 'warn'
                : d.status === 'ok'  ? 'ok'  : 'info';
        log((d.provider ? d.provider + ': ' : '') + (d.msg || ''), lvl);
      } else if (d.type === 'bemap:fn:code') {
        setCodeSource(String(d.code || ''), d.label || 'functions');
      } else if (d.type === 'bemap:fn:controls') {
        renderControlsBar(d.title, d.buttons || []);
      } else if (d.type === 'bemap:page:meta') {
        // Embedded page reporting its title / subtitle / chips. Update the
        // dashboard's single top bar so the user sees the active example.
        applyMeta({ title: d.title, subtitle: d.subtitle, chips: d.chips });
      }
    });

    // Build the shell DOM if not already present.
    var shell = $('.bn-shell');
    if (!shell) {
      var topbar = buildTopBar(opts);
      var credBanner = buildCredentialsBanner(); // null when creds OK
      var sidebar = el('aside', { class: 'bn-sidebar', id: 'bnSidebar' });
      var stage = el('section', { class: 'bn-stage', 'data-bn-stage': 'landing' });
      var controlsBar = buildControlsBar();
      var codePanel = buildCodePanel();
      var logPanel = buildLog();
      // Stage column: stage + controls + code + log, all stacked vertically.
      // This is the RIGHT side of the horiz row, so code+log live under the
      // stage only — NEVER under the sidebar.
      var stageCol = el('div', { class: 'bn-shell__stage-col' }, [stage, controlsBar, codePanel, logPanel]);
      stageCol.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;';
      var horiz = el('div', { class: 'bn-shell__horiz' }, [sidebar, stageCol]);
      horiz.style.cssText = 'display:flex;flex:1;min-height:0;overflow:hidden;';
      var shellChildren = credBanner ? [topbar, credBanner, horiz] : [topbar, horiz];
      shell = el('div', { class: 'bn-shell' }, shellChildren);
      body.appendChild(shell);
      shellState.stage = stage;
    } else {
      shellState.stage = $('.bn-stage', shell);
    }

    if (opts.manifest && sidebarState.providerCard !== undefined) {
      // Provider card already set; just render
    }
    if (opts.manifest) {
      renderSidebar($('#bnSidebar') || $('.bn-sidebar'), opts.manifest);
    }

    // Wire hash router
    global.addEventListener('hashchange', handleHashChange);
    // Initial route
    setTimeout(handleHashChange, 0);
  }

  function setProviderCard(node) {
    sidebarState.providerCard = node;
    var sb = $('.bn-sidebar');
    if (sb && node && !sb.contains(node)) sb.insertBefore(node, sb.firstChild);
  }

  /**
   * Find the sidebar leaf whose href matches the current URL hash, set it
   * as active, and expand every ancestor section so the user actually
   * sees the highlight. Called on every hashchange (including the initial
   * route fired on boot — covers the "paste URL" case).
   *
   * Hash + href are normalised through decodeURIComponent before compare
   * — the manifest stores `on(CLICK)` literally but browsers may serialise
   * the same URL as `on%28CLICK%29` in location.hash, breaking strict
   * string equality.
   */
  function _normalizeHref(s) {
    try { return decodeURIComponent(s || ''); } catch (e) { return s || ''; }
  }
  function syncSidebarActiveFromHash() {
    if (!sidebarState.root) return;
    var normHash = _normalizeHref(global.location.hash);
    var leaves = sidebarState.root.querySelectorAll('.bn-tree__leaf');
    var matched = null;
    for (var i = 0; i < leaves.length; i++) {
      if (_normalizeHref(leaves[i].getAttribute('href')) === normHash) {
        matched = leaves[i]; break;
      }
    }
    // Toggle active class on every leaf (clears stale highlights even when
    // no leaf matches, e.g. for #page-… markdown routes).
    for (var j = 0; j < leaves.length; j++) {
      leaves[j].classList.toggle('bn--active', leaves[j] === matched);
    }
    if (!matched) return;
    var path = matched.getAttribute('data-bn-path');
    sidebarState.activePath = path;
    persistSidebarActive(path);

    // Walk up the tree, expanding every collapsed section / subsection.
    // Use firstElementChild instead of `:scope >` for the button lookup —
    // the button is always the first child of the .bn-tree__group <li> and
    // this avoids any old-browser :scope quirks.
    var li = matched.parentElement;
    while (li && li !== sidebarState.root) {
      if (li.classList && li.classList.contains('bn-tree__group')) {
        var btn = li.firstElementChild;
        if (btn && (btn.classList.contains('bn-tree__section') || btn.classList.contains('bn-tree__subsection'))) {
          if (btn.getAttribute('aria-expanded') !== 'true') {
            btn.setAttribute('aria-expanded', 'true');
          }
        }
      }
      li = li.parentElement;
    }
    // Persist the open state so a reload keeps the same expanded sections.
    if (path) {
      var parts = path.split('/');
      for (var k = 1; k < parts.length; k++) {
        sidebarState.openMap[parts.slice(0, k).join('/')] = true;
      }
      persistSidebarOpen();
    }

    // Bring the highlighted leaf into view if it was below the fold.
    try { matched.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
  }

  var embedWarned = false;
  function handleHashChange() {
    var hash = (global.location.hash || '').replace(/^#/, '');
    syncSidebarActiveFromHash();
    if (!hash) return showLanding();
    if (hash.indexOf('embed-') === 0) {
      // Hard alias — log once, then route as nav-
      if (!embedWarned && global.console && global.console.warn) {
        global.console.warn('bemap dashboard: #embed- URL contract is deprecated, use #nav-');
        embedWarned = true;
      }
      navigateExample(hash.substring('embed-'.length));
      return;
    }
    if (hash.indexOf('nav-') === 0) {
      navigateExample(hash.substring('nav-'.length));
      return;
    }
    if (hash.indexOf('page-') === 0) {
      navigateMarkdown(hash.substring('page-'.length));
      return;
    }
    showLanding();
  }

  // Capture console.* from the embedded example and pipe it into the
  // dashboard's bottom log pane. The original console.* still fires too, so
  // F12 keeps working for power users.
  function hookIframeConsole(iframe) {
    var iw;
    try { iw = iframe.contentWindow; } catch (e) { return; }
    if (!iw || !iw.console || iw.__bnConsoleHooked) return;
    iw.__bnConsoleHooked = true;
    function fmt(args) {
      var parts = [];
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        if (a == null)                  parts.push(String(a));
        else if (typeof a === 'string') parts.push(a);
        else if (typeof a === 'number' || typeof a === 'boolean') parts.push(String(a));
        else if (a instanceof Error)    parts.push(a.message);
        else { try { parts.push(JSON.stringify(a)); } catch (e) { parts.push(Object.prototype.toString.call(a)); } }
      }
      return parts.join(' ');
    }
    var levels = ['log', 'info', 'warn', 'error', 'debug'];
    for (var li = 0; li < levels.length; li++) {
      (function (level) {
        var orig = iw.console[level];
        iw.console[level] = function () {
          try {
            var msg = fmt(arguments);
            var bnLevel = level === 'error' ? 'err'
                        : level === 'warn'  ? 'warn'
                        : level === 'log' || level === 'info' || level === 'debug' ? 'info' : 'info';
            log(msg, bnLevel);
          } catch (e) {}
          try { return orig.apply(iw.console, arguments); } catch (e) {}
        };
      })(levels[li]);
    }
    // Also capture uncaught errors inside the iframe.
    try {
      iw.addEventListener('error', function (e) {
        log((e && e.message) || 'Uncaught error in example page', 'err');
      });
    } catch (e) {}
  }

  // Markdown-embedded runnable demos (quick-start, the mapping pages) create
  // REAL maps directly in the stage — not in an iframe — and the SPA holds no
  // handle to call map.remove() on them. Removing the DOM nodes does NOT free
  // their WebGL contexts, so browsing through several map docs (quick-start
  // alone mounts several) eventually hits the browser's live-WebGL-context cap
  // and later canvases render BLANK (this is the "quick start doesn't work"
  // report). Force-free every WebGL context still in the stage before we tear
  // it down. Library-agnostic and safe: a canvas about to be detached needs no
  // context, and querySelectorAll does not pierce iframe boundaries so this
  // never touches an example iframe's own maps (those are GC'd with the frame).
  function _loseStageWebGL() {
    var stage = shellState.stage;
    if (!stage || !stage.querySelectorAll) return;
    var canvases = stage.querySelectorAll('canvas');
    for (var i = 0; i < canvases.length; i++) {
      var gl = null;
      try { gl = canvases[i].getContext('webgl2') || canvases[i].getContext('webgl'); } catch (e) {}
      if (!gl) continue;
      try { var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) {}
    }
  }

  function disposeCurrentExample() {
    // Free any markdown-mounted maps' GPU contexts first (see _loseStageWebGL).
    _loseStageWebGL();
    if (shellState.currentExample) {
      var ex = registry[shellState.currentExample];
      if (ex && typeof ex.dispose === 'function') {
        try { ex.dispose(); } catch (e) {
          if (global.console && global.console.error) global.console.error('bn.shell: dispose() failed for ' + shellState.currentExample, e);
        }
      }
      shellState.currentExample = null;
    }
    // Drop the iframe (browser GCs the inner window, frees its maps + listeners).
    if (shellState.currentIframe && shellState.currentIframe.parentNode) {
      shellState.currentIframe.parentNode.removeChild(shellState.currentIframe);
    }
    shellState.currentIframe = null;
  }

  function navigateExample(path) {
    // Iframe reuse guard (reviewer C3): when navigating to functions.html with
    // a `?fn=…` query while functions.html is ALREADY loaded, skip the cold
    // reboot of 3 maps and just postMessage the function name to the existing
    // iframe. Same path WITHOUT a `?fn=` (just `functions.html`) also reuses.
    if (shellState.currentIframe && shellState.currentExample &&
        shellState.currentExample.split('?')[0] === path.split('?')[0]) {
      var fnQuery = path.indexOf('?fn=') > -1 ? path.substring(path.indexOf('?fn=') + 4) : '';
      if (fnQuery) {
        try {
          shellState.currentIframe.contentWindow.postMessage(
            { type: 'bemap:fn:run', name: decodeURIComponent(fnQuery) }, '*'
          );
        } catch (e) { /* ignore — fall through to full nav below */ return; }
        // Update the address bar so the deep-link survives a refresh, but
        // don't re-fire hashchange (skipNextHash flag).
        shellState.currentExample = path;
        return;
      }
      // Same page, no fn — no-op (don't reload).
      return;
    }
    disposeCurrentExample();
    var stage = shellState.stage;
    if (!stage) return;
    stage.setAttribute('data-bn-stage', 'example');
    stage.setAttribute('data-bn-example', path);
    stage.innerHTML = '';

    // Each example renders in its own iframe inside the stage. This gives the
    // example its own window (no global collisions), runs its `<head>` scripts
    // and CSS exactly as if loaded standalone, and avoids the `onload=`/DOMReady
    // fragility of a fragment-transplant approach. The dashboard's chrome is
    // SPA — only this stage area re-renders on navigation.
    var iframe = doc.createElement('iframe');
    iframe.className = 'bn-iframe';
    iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#0d1117;';
    iframe.setAttribute('src', path);
    iframe.setAttribute('title', path);
    iframe.setAttribute('loading', 'eager');
    // Forward console.* from the loaded example into the dashboard's console
    // pane. Same-origin iframes only — cross-origin throws on contentWindow
    // access and is silently ignored.
    iframe.addEventListener('load', function () { hookIframeConsole(iframe); });
    stage.appendChild(iframe);

    shellState.currentExample = path;
    shellState.currentIframe = iframe;

    // Pull the canonical source for the code panel — try the sidecar `.bn.js`
    // first, fall back to the page's primary JS file or the HTML itself. Done
    // in the background so navigation isn't blocked.
    setCodeSource('// Loading ' + path + ' …', path);
    fetchCodeSource(path);

    // Apply meta from registered example (when migrated) for top-bar title.
    var entry = registry[path] || registry[path.replace(/\.html$/i, '')];
    if (entry && entry.meta) applyMeta(entry.meta);
  }

  function fetchCodeSource(path) {
    // First fetch the page HTML — we then scan it for the real <script src=>
    // sidecar (avoids blind .js requests that 404 noisily). If no external
    // sidecar is referenced, show the page HTML itself (it usually contains
    // inline <script> blocks the customer wants to read).
    fetch(path, { method: 'GET' })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then(function (htmlText) {
        // Skip external + library scripts; only look at the example's own JS.
        var matches = htmlText.match(/<script[^>]+src=["']([^"']+)["'][^>]*>/g) || [];
        var skip = /^https?:|^\.\.\/|\/dist\/|\/lib\/|bn-2026\.js$|context\.js$|effect-bridge\.js$|bn-sidebar-manifest\.js$|active-effects-bar\.js$|bemap-provider\.js$/;
        var sidecars = [];
        for (var i = 0; i < matches.length; i++) {
          var m = /src=["']([^"']+)["']/.exec(matches[i]);
          if (!m) continue;
          if (skip.test(m[1])) continue;
          sidecars.push(m[1]);
        }
        if (sidecars.length === 0) {
          // No external sidecar — show the page HTML (includes any inline <script>).
          setCodeSource(rewriteSnippet(htmlText, path), path);
          return;
        }
        // Resolve the first sidecar relative to the page path.
        var base = path.substring(0, path.lastIndexOf('/') + 1);
        var sidecarUrl = sidecars[0].charAt(0) === '/' ? sidecars[0] : base + sidecars[0];
        fetch(sidecarUrl, { method: 'GET' })
          .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
          .then(function (text) { setCodeSource(rewriteSnippet(text, sidecars[0]), sidecars[0]); })
          .catch(function () {
            // Fallback to the HTML if the sidecar fetch fails.
            setCodeSource(rewriteSnippet(htmlText, path), path);
          });
      })
      .catch(function () {
        setCodeSource('// (No source could be loaded for ' + path + ')', path);
      });
  }

  function navigateMarkdown(file) {
    disposeCurrentExample();
    var stage = shellState.stage;
    if (!stage) return;
    stage.setAttribute('data-bn-stage', 'markdown');
    stage.innerHTML = '<div class="bn-markdown" id="bnMarkdown"></div>';
    var target = $('#bnMarkdown', stage);
    if (global.bemap && global.bemap.miniweb && typeof global.bemap.miniweb.loadMarkdownFile === 'function') {
      global.bemap.miniweb.loadMarkdownFile(target, file, {});
    } else {
      // Lightweight fallback: just fetch + showdown if present
      fetch(file).then(function (r) { return r.text(); }).then(function (md) {
        if (global.showdown) {
          var conv = new global.showdown.Converter();
          conv.setOption('tables', true);
          target.innerHTML = conv.makeHtml(md);
        } else {
          target.textContent = md;
        }
      }).catch(function (e) {
        target.innerHTML = '<div class="bn-empty">Failed to load ' + file + ' — ' + e.message + '</div>';
      });
    }
    setCodeSource('', file);
  }

  function showLanding() {
    disposeCurrentExample();
    var stage = shellState.stage;
    if (!stage) return;
    stage.setAttribute('data-bn-stage', 'landing');
    stage.innerHTML =
      '<div class="bn-landing">' +
      '  <h1 class="bn-landing__title">BeMap JS API · 2026</h1>' +
      '  <p class="bn-landing__tagline">Vector maps, BeNomad Tiles, geocoding, routing, EV — one SDK, three engines, one canonical Context.</p>' +
      '  <div class="bn-landing__cards">' +
      '    <a class="bn-landing__card" href="#nav-example-bemap-tiles.html"><h3>BeNomad Tiles</h3><p>The v2.0 default — vector PMTiles + JWT injection.</p></a>' +
      '    <a class="bn-landing__card" href="#nav-functions.html"><h3>Function Showcase</h3><p>Every map method tested on 3 engines side-by-side.</p></a>' +
      '    <a class="bn-landing__card" href="#page-quick-start.md"><h3>Quick start</h3><p>30-second guide to a working BeNomad map.</p></a>' +
      '  </div>' +
      '</div>';
    setCodeSource('', '');
  }

  function applyMeta(meta) {
    var titleEl = $('.bn-topbar__title');
    if (titleEl && meta.title) titleEl.textContent = meta.title;
    var subEl = $('.bn-topbar__subtitle');
    if (subEl && meta.subtitle) subEl.innerHTML = meta.subtitle;
    // Replace chips
    var chipBox = $('.bn-topbar__chips');
    if (chipBox && meta.chips) {
      chipBox.innerHTML = '';
      meta.chips.forEach(function (c) {
        var cls = 'bn-chip' + (c.kind ? ' bn-chip--' + c.kind : '');
        chipBox.appendChild(el('span', { class: cls, text: c.label || c }));
      });
    }
  }

  /* --------------------------------------------------
   * Public surface
   * -------------------------------------------------- */

  var bn = {
    __ready: true,
    boot: boot,
    topBar: function (opts) {
      var t = buildTopBar(opts || {});
      doc.body.insertBefore(t, doc.body.firstChild);
      return t;
    },
    log: log, clearLog: clearLog, copyLog: copyLog, toggleLog: toggleLog,
    panel: makePanel,
    onMapReady: onMapReady,
    fmtCoord: fmtCoord, fmtKm: fmtKm, fmtMs: fmtMs,
    el: el, $: $,

    // SPA shell
    shell: { boot: bootShell, navigate: function (h) { global.location.hash = '#' + h; } },
    sidebar: { render: renderSidebar, setProviderCard: setProviderCard },
    codePanel: { setSource: setCodeSource, toggle: toggleCode, copy: copyCode },
    snippet: { rewrite: rewriteSnippet },
    requestSnippet: requestSnippet,
    registerExample: registerExample,
    lookupExample: lookupExample,

    // Credentials — pure per-env storage hooks for src-test/test-env-credentials.js.
    // The DOM popover (openCredentialsPopover) and the live mutation /
    // page-reload side effects are NOT exposed here.
    creds: {
      storageKey:    function () { return global.bemapUserCredentialsKey || 'bemap.user-credentials.v1'; },
      envStorageKey: function () { return global.bemapEnvStorageKey || 'bemap-env'; },
      readMap:       _readCredsMap,
      writeMap:      _writeCredsMap,
      forEnv:        credsForEnv,
      persist:       _persistCredsForEnv,
      clearEnv:      _clearCredsForEnv,
      // Pure mirror of context.js's boot-time migration: a legacy flat
      // {login,password} becomes { <envKey>: {login,password} } (empty login →
      // no entry); an existing per-env map is returned unchanged.
      migrateLegacy: function (raw, envKey) {
        try {
          if (!raw) return {};
          var p = JSON.parse(raw);
          if (!p || typeof p !== 'object') return {};
          if (typeof p.login === 'string') {
            var m = {};
            if (p.login) m[envKey] = { login: p.login, password: p.password || '' };
            return m;
          }
          return p;
        } catch (e) { return {}; }
      }
    },

    // Search — pure-logic test hooks. The DOM-bound parts (popover render,
    // keyboard handlers) live behind `buildSearchBox` and aren't exposed
    // here. These hooks let `src-test/test-search.js` exercise the indexer
    // + scoring + parsing without a live dashboard.
    search: {
      buildBaseIndex: function (manifest) {
        // Pure variant — accepts a manifest, returns the index it would
        // build. Does NOT mutate the global searchState.
        var prevIndex = searchState.index;
        var prevSeen  = searchState.seen;
        searchState.index = [];
        searchState.seen  = {};
        var prevManifest = global.bnSidebarManifest;
        if (manifest != null) global.bnSidebarManifest = manifest;
        try { _buildBaseIndex(); }
        finally {
          if (manifest != null) global.bnSidebarManifest = prevManifest;
        }
        var built = searchState.index;
        searchState.index = prevIndex;
        searchState.seen  = prevSeen;
        return built;
      },
      score: function (item, query) {
        // Recreate the scoring logic from runSearch but for a single item.
        // Returns 0 when no match, positive otherwise.
        var q = (query || '').toLowerCase();
        if (!q) return 0;
        var hay = item._searchHaystack ||
          ((item.title || '') + ' ' + (item.subtitle || '') + ' ' +
           (item.chipText || '') + ' ' + (item.section || '') + ' ' +
           (item.heading || '') + ' ' + (item.snippet || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return 0;
        var titleLow = (item.title || '').toLowerCase();
        var s = 0;
        if (titleLow.indexOf(q) === 0)  s += 100;
        if (titleLow.indexOf(q) !== -1) s += 50;
        if ((item.snippet  || '').toLowerCase().indexOf(q) !== -1) s += 20;
        if ((item.chipText || '').toLowerCase().indexOf(q) !== -1) s += 10;
        if (item.kind === 'doc-section') s += 5;
        return s || 1;
      },
      hrefToUrl: _hrefToUrl,
      highlight: _highlight,
      escapeHtml: _escape,
      truncate:   _truncate,
      parseMarkdownSections: function (md) {
        // Extract H1 + every H2 + body snippet, mirroring _loadMarkdown's
        // parsing pass. Returns { h1, firstParagraph, sections: [{heading, snippet}] }.
        var h1Match = md.match(/^#\s+(.+?)\s*$/m);
        var firstParaMatch = md.match(/^(?!#)([^\n][^\n]*)/m);
        var sections = [];
        var h2Regex = /^##\s+(.+?)\s*$/gm;
        var m;
        while ((m = h2Regex.exec(md)) !== null) {
          var bodyStart = m.index + m[0].length;
          var nextH2 = md.indexOf('\n## ', bodyStart);
          var bodyEnd = nextH2 > -1 ? nextH2 : Math.min(md.length, bodyStart + 800);
          var snippet = md.substring(bodyStart, bodyEnd)
                          .replace(/```[\s\S]*?```/g, ' ')
                          .replace(/[*_`#>\-]+/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim()
                          .slice(0, 240);
          sections.push({ heading: m[1], snippet: snippet });
        }
        return {
          h1:             h1Match ? h1Match[1] : null,
          firstParagraph: firstParaMatch ? firstParaMatch[1] : null,
          sections:       sections
        };
      }
    }
  };
  global.bn = bn;

  // Auto-boot if the body opts in via data-bn-page
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', autoBoot);
  } else {
    autoBoot();
  }
  function autoBoot() {
    if (doc.body && doc.body.hasAttribute('data-bn-page')) boot({});
  }
})(window);
