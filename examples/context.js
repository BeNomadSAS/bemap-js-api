/* ============================================================
 * context.js — credentials gateway for the BeMap dashboard.
 *
 * Two-tier credentials:
 *   1. User credentials   — persisted in localStorage under
 *                           `bemap.user-credentials.v1` by the
 *                           topbar Credentials panel.
 *   2. Demo credentials   — hardcoded fallback used when no user
 *                           credentials have been entered. Shared
 *                           example account — DO NOT use in production.
 *
 * `bemapMainCtx` is a stable singleton Proxy:
 *   - Reading any RuntimeConfig field (geoserver, tilesHost, …)
 *     returns the live value.
 *   - Reading any Context method (getBaseUrl, getAuthUrlParams,
 *     isSecure, …) passes through to the underlying instance.
 *   - Writing a RuntimeConfig key (e.g. `ctx.geoserver = 'osm'`)
 *     persists, broadcasts to other tabs, and notifies in-tab
 *     subscribers — no page reload required.
 *
 * Snippet substitution in `bn-2026.js` reads `login`/`password`
 * via `RuntimeConfig.toJSON()` (which merges state + ctxBridge),
 * so user credentials automatically appear in copied code.
 * ============================================================ */

(function () {
  var USER_CREDS_KEY = 'bemap.user-credentials.v1';

  // No credentials are bundled with the distribution — customers (and new
  // devs) enter their own via the topbar Credentials popover, which writes
  // them to localStorage under USER_CREDS_KEY. The popover is the single
  // source of truth; this file only reads from storage and exposes
  // window.bemapCredentialsAreDemo to the dashboard for the topbar badge.
  //
  // Local-dev shortcut: drop a file at `examples/context.local.js` that
  // sets `window.bemapDemoCreds = { login, password }` BEFORE this script
  // runs (added to index.html with a try/catch). That file is gitignored
  // and never enters the zip. Without it, you set creds via the popover.
  var DEMO = (typeof window.bemapDemoCreds === 'object' && window.bemapDemoCreds)
    ? { login: window.bemapDemoCreds.login || '', password: window.bemapDemoCreds.password || '' }
    : { login: '', password: '' };

  function readUserCreds() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(USER_CREDS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed.login === 'string' && parsed.login.length
                 && typeof parsed.password === 'string' && parsed.password.length) {
        return { login: parsed.login, password: parsed.password };
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  var stored = readUserCreds();
  var creds = stored || DEMO;

  // Three-state credential signal for the topbar badge + warning banner:
  //   - user  → user has saved creds via the Credentials popover (green)
  //   - demo  → window.bemapDemoCreds was set by context.local.js (yellow)
  //   - empty → no creds at all; service calls will 401 (red, with banner)
  var hasUserCreds = !!stored;
  var hasDemoCreds = !!(DEMO.login && DEMO.password);
  window.bemapCredentialsAreDemo  = !hasUserCreds && hasDemoCreds;
  window.bemapCredentialsAreEmpty = !hasUserCreds && !hasDemoCreds;
  window.bemapDemoCredentials     = DEMO;
  window.bemapUserCredentialsKey  = USER_CREDS_KEY;

  if (window.bemapCredentialsAreEmpty && typeof console !== 'undefined' && console.warn) {
    console.warn(
      '[bemap] No credentials configured.\n' +
      '   The dashboard topbar shows a red [Not set] badge and a banner with the fix.\n' +
      '   Click "Credentials" in the topbar and enter your BeMap account login + password.\n' +
      '   They will be persisted in localStorage under "' + USER_CREDS_KEY + '".'
    );
  }

  // ── BeMap environments ────────────────────────────────────────────────
  // Each BeMap env has its OWN API host AND tiles host — they must stay
  // paired. Defining them together here means selecting an env sets both at
  // once, so the WMS/services host can never drift from the PMTiles host.
  //
  // The dashboard examples run against BETA. To point them at preprod/prod,
  // set `window.bemapEnv = 'preprod'` (or 'prod') BEFORE this script runs —
  // e.g. in the gitignored examples/context.local.js, next to your creds.
  // (The shipped LIBRARY default, RuntimeConfig.DEFAULTS.tilesHost, is PROD —
  // examples override it to beta here; real apps build their own Context.)
  var ENVIRONMENTS = {
    beta:    { label: 'Beta',    host: 'bemap-beta.benomad.com',    tilesHost: 'mptiles-api-beta.benomad.net' },
    preprod: { label: 'Preprod', host: 'bemap-preprod.benomad.com', tilesHost: 'mptiles-api-preprod.benomad.net' },
    prod:    { label: 'Prod',    host: 'bemap.benomad.com',         tilesHost: 'mptiles-api.benomad.net' }
  };
  var ENV = ENVIRONMENTS[window.bemapEnv] || ENVIRONMENTS.beta;
  window.bemapEnvironments = ENVIRONMENTS;   // exposed for a future env switcher
  window.bemapActiveEnv    = ENV;

  // Pair the tiles host with the chosen env BEFORE bind so the Context is
  // built consistent in one shot (tilesHost is a RuntimeConfig field, so it
  // travels via state, not via the bind() Context-native fields).
  bemap.RuntimeConfig.set({ tilesHost: ENV.tilesHost });

  window.bemapMainCtx = bemap.RuntimeConfig.bind({
    login:      creds.login,
    password:   creds.password,
    secure:     true,
    host:       ENV.host,
    authInPost: false
  });
  // RuntimeConfig-owned fields (geoserver, chargingStationProvider,
  // serviceVersion, mapProvider, tilesHost, tilesFile, style) come from
  // localStorage when present, otherwise from RuntimeConfig.DEFAULTS.
})();
