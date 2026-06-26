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
  var USER_CREDS_KEY  = 'bemap.user-credentials.v1';
  var ENV_STORAGE_KEY = 'bemap-env';

  // ── BeMap environments ────────────────────────────────────────────────
  // Each env pairs its OWN API host AND tiles host — they must never drift.
  // Credentials are stored PER ENV (you can hold a different BeMap account on
  // beta vs prod), so the env must be resolved BEFORE we read creds. The
  // topbar Credentials popover — where you ALSO pick the env — persists the
  // active env under `bemap-env`. Precedence: saved selection >
  // window.bemapEnv (set in the gitignored context.local.js) > beta.
  // (The shipped LIBRARY default, RuntimeConfig.DEFAULTS.tilesHost, is PROD —
  // examples override it here; real apps build their own Context.)
  var ENVIRONMENTS = {
    beta:    { label: 'Beta',    host: 'bemap-beta.benomad.com',    tilesHost: 'mptiles-api-beta.benomad.net' },
    preprod: { label: 'Preprod', host: 'bemap-preprod.benomad.com', tilesHost: 'mptiles-api-preprod.benomad.net' },
    prod:    { label: 'Prod',    host: 'bemap.benomad.com',         tilesHost: 'mptiles-api.benomad.net' }
  };
  var savedEnv = (function () {
    try { return (typeof localStorage !== 'undefined') ? localStorage.getItem(ENV_STORAGE_KEY) : null; }
    catch (e) { return null; }
  })();
  var envKey = (savedEnv && ENVIRONMENTS[savedEnv]) ? savedEnv
             : (window.bemapEnv && ENVIRONMENTS[window.bemapEnv]) ? window.bemapEnv
             : 'beta';
  var ENV = ENVIRONMENTS[envKey];
  window.bemapEnvironments  = ENVIRONMENTS;   // consumed by the Credentials popover
  window.bemapActiveEnv     = ENV;
  window.bemapActiveEnvKey  = envKey;
  window.bemapEnvStorageKey = ENV_STORAGE_KEY;

  // ── Credentials (PER ENVIRONMENT) ──────────────────────────────────────
  // No credentials are bundled — enter them via the topbar Credentials
  // popover, which stores them per-env under USER_CREDS_KEY as a map:
  //   { beta: {login,password}, preprod: {...}, prod: {...} }
  // A legacy flat {login,password} from older builds is migrated under the
  // active env (and the storage rewritten) so the popover always sees a map.
  // Local-dev shortcut: examples/context.local.js may set
  //   window.bemapDemoCreds = { login, password }   (gitignored, never shipped)
  // used as a fallback when the active env has no saved creds.
  var DEMO = (typeof window.bemapDemoCreds === 'object' && window.bemapDemoCreds)
    ? { login: window.bemapDemoCreds.login || '', password: window.bemapDemoCreds.password || '' }
    : { login: '', password: '' };

  function readUserCredsMap() {
    try {
      if (typeof localStorage === 'undefined') return {};
      var raw = localStorage.getItem(USER_CREDS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      // Legacy flat {login,password} → migrate under the active env + rewrite.
      if (typeof parsed.login === 'string') {
        var migrated = {};
        if (parsed.login) migrated[envKey] = { login: parsed.login, password: parsed.password || '' };
        try { localStorage.setItem(USER_CREDS_KEY, JSON.stringify(migrated)); } catch (e) { /* ignore */ }
        return migrated;
      }
      return parsed;
    } catch (e) { return {}; }
  }

  var entry  = readUserCredsMap()[envKey];
  var stored = (entry && typeof entry.login === 'string' && entry.login.length
                && typeof entry.password === 'string' && entry.password.length)
             ? { login: entry.login, password: entry.password } : null;
  var creds  = stored || DEMO;

  // Three-state credential signal (per active env) for the topbar badge:
  //   user → saved creds for THIS env (green); demo → context.local.js fallback
  //   (yellow); empty → nothing for this env, calls 401 (red, with banner).
  var hasUserCreds = !!stored;
  var hasDemoCreds = !!(DEMO.login && DEMO.password);
  window.bemapCredentialsAreDemo  = !hasUserCreds && hasDemoCreds;
  window.bemapCredentialsAreEmpty = !hasUserCreds && !hasDemoCreds;
  window.bemapDemoCredentials     = DEMO;
  window.bemapUserCredentialsKey  = USER_CREDS_KEY;

  if (window.bemapCredentialsAreEmpty && typeof console !== 'undefined' && console.warn) {
    console.warn(
      '[bemap] No credentials configured for env "' + envKey + '".\n' +
      '   The dashboard topbar shows a red [Not set] badge and a banner with the fix.\n' +
      '   Click "Credentials" in the topbar, pick the environment, and enter your\n' +
      '   BeMap account login + password (stored per-env under "' + USER_CREDS_KEY + '").'
    );
  }

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
