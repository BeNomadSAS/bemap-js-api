/* ============================================================
 * context.local.js — LOCAL-DEV ONLY (this file is gitignored)
 *
 * Copy this file to `examples/context.local.js` and fill in your
 * BeMap dev account credentials so the dashboard's runnable demos
 * work out of the box on `npm run start` without having to type
 * them into the topbar Credentials popover every fresh-cache visit.
 *
 *   cp examples/context.local.example.js examples/context.local.js
 *   # then edit context.local.js with your real values
 *
 * This file MUST be loaded BEFORE examples/context.js (see how
 * examples/index.html wires it via a try/catch script tag — the load
 * is optional, so a missing file does NOT break the dashboard).
 *
 * The customer-facing zip does NOT include context.local.js. Demo
 * credentials never leave your machine. End users always enter their
 * own credentials via the topbar Credentials popover, which persists
 * them in localStorage under `bemap.user-credentials.v1`.
 * ============================================================ */

window.bemapDemoCreds = {
  login:    'your-dev-account-login',
  password: 'your-dev-account-password'
};
