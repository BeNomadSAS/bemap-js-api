# Keep your credentials off the browser — the `proxy` option

Normally a BeMap app puts its **login and password in the browser**:

```js
new bemap.Context({ host: '…', login: 'my-login', password: 'my-password' });
```

Anyone who opens DevTools on that page can read them. For a production app that
is usually unacceptable.

The `proxy` option removes them entirely: your app talks to **your own server**,
and that server holds the BeMap credentials and adds them to each request. The
browser never sees a credential — there is nothing to steal.

> **Why there is no copy-paste example here.** The server side is *your* server,
> and its address and rules are specific to your deployment. Publishing one
> customer's setup as "the example" would be misleading. This page gives you the
> exact contract to build against; talk to BeNomad to review your design.

---

## 1. Are you sure you need it?

There are two supported ways to keep credentials server-side. Pick the smaller
one that solves your problem:

| Pattern | What stays on your server | Good for |
| --- | --- | --- |
| **Token provider** — [integration-tiles-token-provider.md](integration-tiles-token-provider.md) | Only the **tiles** credentials. Your backend exchanges them for a short-lived token. | You only need the **map background** secured. Much less to build. |
| **Full proxy** (this page) | **Everything** — maps *and* services (routing, geocoding, EV…). | You call BeMap **services** too, or your security review forbids any credential in the browser. |

If you only display maps, the token provider is usually enough.

---

## 2. What your app looks like

```js
var ctx = new bemap.Context({
  proxy: 'https://your-proxy.example.com',   // ← YOUR server
  tilesHost: 'mptiles-api.benomad.net',      // unchanged: map tiles come direct
  bemapEnv: 'prod'                           // optional (see §4)
  // no login, no password — that is the whole point
});

var map = new bemap.MapLibreMap(ctx, 'map');   // everything else is unchanged
```

That is the only change on the client. Markers, routing, geocoding, styles —
every other call stays exactly the same.

### Writing the value

`proxy` is written like `host`: the `https://` prefix is **optional**, and when
you leave it out the protocol comes from `secure` — the same flag that already
drives `host`.

| You write | With | You get |
| --- | --- | --- |
| `'your-proxy.example.com'` | `secure: true` | `https://your-proxy.example.com` |
| `'your-proxy.example.com/bemap'` | `secure: true` | …the same, plus your path prefix |
| `'https://your-proxy.example.com'` | anything | exactly as written — an explicit scheme always wins |
| `'localhost:8787'` | `secure: false` | `http://localhost:8787` — a local dev proxy |

A trailing slash makes no difference. A `?query` or `#fragment`, or credentials
written into the URL (`https://user:pass@host`), are **dropped** with a console
notice — neither belongs in a proxy address.

Leaving `secure` off means a bare host resolves to `http://`, which a browser
blocks on an `https://` page; the SDK says so in the console instead of leaving
you with a silent wall of failed requests.

The Context **throws** only when the value names no usable host at all — a
non-`http(s)` scheme (`ftp://…`), a half-written one (`https:/host`, `https:host`),
whitespace, or a root-relative path (`/api/bemap`). That case is deliberately loud:
a typo like `https:/host` is caught here rather than being read as the host name
`https`. If a broken `proxy` were quietly
ignored, the SDK would fall back to calling BeMap **directly** and send the very
credentials this option exists to hide — and you would only find out from a 403,
much later.

> A same-origin proxy (`proxy: '/api/bemap'`, no host) is not supported. Give
> your proxy its own hostname.

---

## 3. What goes where (important)

Not everything is routed through your proxy — only what needs a credential:

| Traffic | Where it goes | Why |
| --- | --- | --- |
| Services: routing, geocoding, autocomplete, EV, isochrone | **Your proxy** | needs your BeMap credentials |
| WMS map images (Leaflet / OpenLayers) | **Your proxy** | same — but see the environment-header caveat in §4 |
| The tiles **login** (one call, gets a temporary token) | **Your proxy** | needs your BeMap credentials |
| The map **tiles themselves** (MapLibre / PMTiles) | **Direct to `tilesHost`** | public host, protected by the temporary token — no credential involved |
| Tile info calls (`/api/maps`, `/api/styles`, …) | **Direct to `tilesHost`** | same token, no credential |

So your proxy handles the credential-bearing traffic; the heavy tile traffic
keeps going straight to BeNomad (no bandwidth cost for you, no added latency).

**Guarantee:** with `proxy` set, the SDK sends **no** BeMap credential —
no `Authorization: Basic`, no `appid`/`appcode` — on any request, **even if
`login`/`password` are also present in your config** (a mistake we defend
against rather than merge with).

---

## 4. Optional: one proxy, several environments

If a single proxy serves more than one BeMap environment, set `bemapEnv` and the
SDK sends it as the **`X-BeMap-Env`** header on proxy requests, so your proxy
knows which upstream to use:

```js
new bemap.Context({ proxy: 'https://your-proxy.example.com', bemapEnv: 'prod' });
```

Leave it out and no header is sent — right for a proxy that serves exactly one
environment.

> ### ⚠️ Which traffic actually carries `X-BeMap-Env`
>
> | Traffic | Header sent? |
> | --- | --- |
> | Services (routing, geocoding, EV, isochrone, autocomplete — v1 **and** v2) | ✅ yes |
> | The tiles login (`<proxy>/tiles/login`) | ✅ yes |
> | **MapLibre** map requests (style, glyphs, WMS…) | ✅ yes (via `transformRequest`) |
> | **Leaflet / OpenLayers** WMS raster tiles | ❌ **no** |
>
> Leaflet and OpenLayers load raster tiles through `<img>` elements, which cannot
> carry a custom header. (Both engines *can* be given a custom tile loader that
> fetches with headers and feeds the result in as a blob, but the SDK does not
> wire one: it would add a CORS preflight per tile and blob plumbing per engine.)
>
> **So if you use Leaflet or OpenLayers WMS behind a multi-environment proxy, give
> each environment its own proxy URL.** Your proxy will then pick the environment
> from the URL instead of the header — WMS tiles need no header at all.
> Two shapes work; pick the one your proxy actually routes:
>
> * **A separate proxy host per environment** — `https://proxy-prod.example.com`,
>   `https://proxy-preprod.example.com`. Always safe: the request path stays
>   `/bgis/wms`, so it matches a proxy that only allow-lists `/bgis/*` at the root.
> * **A path prefix** — `https://your-proxy.example.com/prod` → requests become
>   `/prod/bgis/wms`. Only works if your proxy is written to accept that prefix;
>   a proxy that allow-lists exactly `/bgis/service`, `/bgis/wms` and `/bgis/bnd`
>   **will reject it with 403**. Check before choosing this shape.
>
> Without an env selector, a multi-environment proxy uses whatever default it
> defines — so WMS imagery could come from a different environment than your
> service calls, silently and with no error. Everything else (services, the tiles
> login) is unaffected: those are `fetch`-based and do carry the header.

---

## 5. What your server has to do

Your proxy is a pass-through that adds the credentials. In outline:

| Your endpoint | Forwards to | Adds |
| --- | --- | --- |
| `<proxy>/bgis/…` (everything under `ctx.path`) | the BeMap API host for the target environment | your BeMap credentials |
| `<proxy>/tiles/login` | the tiles Worker's login endpoint | your BeMap credentials |

Notes that matter:

* The SDK sends **`X-BeMap-Tiles-Host`** on `<proxy>/tiles/login`, naming the
  tiles host the browser will read from — each tiles environment signs its
  tokens with a different key, so your proxy must mint the token for *that* one.
* The login response shape must be relayed unchanged: `{ ok, username, token }`.
* Read `X-BeMap-Env` (§4) if you serve several environments.
* Never log the credentials.
* Behind a proxy the SDK authenticates tiles with the **token header**, not a
  cookie (a cookie set by your proxy's origin could never be sent to the tiles
  host). This is automatic — you don't configure it.

### How to protect the proxy — read this before choosing

Your proxy holds real BeMap credentials, so it must not be an open relay. But
**the SDK cannot carry your app's session to a proxy on a different origin.**
Concretely, what it does on the wire:

| SDK call | Cookies sent? | Custom auth header? |
| --- | --- | --- |
| Tiles login (`fetch`, `<proxy>/tiles/login`) | `credentials: 'same-origin'` → **same-origin only** | no |
| v2 services (`fetch`) | default `same-origin` → **same-origin only** | no |
| v1 services (`XMLHttpRequest`) | `withCredentials` not set → **same-origin only** | no |
| Leaflet / OpenLayers WMS (`<img>`) | browser decides — sent when the cookie's `Domain`/`SameSite` allow it | **impossible** (an image request cannot carry headers) |

So there are two workable models, and you must pick one deliberately:

**A. Proxy on its own hostname (the usual case — a Worker, a separate service).**
Cross-origin, so a session cookie or bearer token is **not** an option. You are
left with what the browser sends by itself — and **neither header is available on
every endpoint**, so allow-list them *per endpoint*, never both everywhere:

| Endpoint | `Origin` | `Referer` | Enforce |
| --- | --- | --- | --- |
| `<proxy>/tiles/login`, `<proxy>/bgis/service/…` (`fetch`, XHR) | ✅ always sent (cross-origin request) | usually, but policy-dependent | **`Origin` allow-list** |
| `<proxy>/bgis/wms` from Leaflet / OpenLayers (`<img>`) | ❌ **not sent** — a plain image GET is not a CORS request | usually the page URL | **`Referer` allow-list only** |
| `<proxy>/bgis/wms` from MapLibre (`fetch`) | ✅ sent | usually | **`Origin` allow-list** |

Requiring **both** on the WMS endpoint breaks Leaflet/OpenLayers imagery.
Requiring **either one** everywhere is a weaker boundary than it looks. Split the
rules by endpoint as above.

`Referer` is also not yours to assume: any `Referrer-Policy: no-referrer` — set by
your own page, your CDN, or a wrapping iframe — strips it. The SDK never sets
`referrerPolicy` itself, but that is not a guarantee about your app. If you rely on
`Referer` (and BeMap's own filter does), your site must run a policy that still
sends it — the browser default `strict-origin-when-cross-origin` is fine,
`no-referrer` is not.

Always add, on every endpoint:

* **rate limiting** per IP/origin, tightest on `/tiles/login`;
* a network-level control where you have one (WAF, Cloudflare Access, mTLS, IP
  allow-list) — the only item on this list that is not browser-controlled.

> **Neither `Origin` nor `Referer` is authentication.** Both are set by the
> browser, and anything that is not a browser can send whatever it likes. Model A
> makes the proxy a *credential hider* with abuse controls, not an authorisation
> boundary. If you need real authorisation, use model B.

**B. Proxy on the same origin as your app.** Then cookies flow on every call above
and your existing session really does protect it. This needs the proxy to answer
on your app's own scheme + host + port — for example a reverse-proxy route on the
same server. Note `proxy` still requires a **host**, not a bare path: give the
route a hostname (`proxy: 'app.example.com/bemap'` when the app is served from
`https://app.example.com`), not `proxy: '/bemap'`.

> "Same **site**" is not enough. `proxy.example.com` and `app.example.com` are
> same-site but *cross-origin*: `SameSite` cookies would be allowed, yet the SDK's
> `fetch`/XHR calls still send none, because they do not opt in with
> `credentials: 'include'`. Only same-**origin** gives you the cookie.

---

## 6. Limits worth knowing

**`map.loadBeMapTiles(...)`** — a **deprecated** helper from before `ctx.tilesHost`
existed — sends `Authorization: Basic` straight from the browser by design, which
is precisely what `proxy` prevents. It refuses to run in proxy mode. Use
`ctx.tilesHost` (with `proxy`) instead.

**Set `proxy` before you build a map.** `ctx.setProxy(…)` exists for config layers
that mutate a live Context. What follows immediately: service calls, WMS URLs built
from that point on, and the tiles login. What does **not**:

* **No URL already inside a live map is rewritten.** A MapLibre WMS/raster source
  in the current style, and every Leaflet/OpenLayers layer, keep the URL they were
  created with — so their requests keep going to the **old** proxy. Only the
  environment header follows the new one. Rebuild the source/layer, or re-apply the
  style, to move that traffic.
* A `bemap.MapLibreMap` created on a Context that had *no* proxy never installs the
  proxy request hook at all, so it will never send `X-BeMap-Env` (its tile auth is
  untouched, and service calls do switch).
* A tiles token already minted for the previous proxy stays in use until it expires
  or `logout()` clears it.

The SDK logs a one-off console notice when you change an already-set `proxy`, for
exactly this reason. Treat a proxy switch as "rebuild the map", not "flip a flag".

**Legacy browsers.** Proxy mode parses its URL with the standard `URL` API and
falls back to a built-in ES5 parser when the browser has none (IE11 exposes
`window.URL` but no working constructor). So the `proxy` option itself works even
on legacy engines — including the Leaflet/OpenLayers + v1-services combination,
which needs no `fetch` or `Promise`. BeNomad Tiles (MapLibre/PMTiles) does require
a modern browser regardless of `proxy`.

On that fallback the proxy host must be an **ASCII** DNS name, an IPv4 literal, or
a bracketed IPv6 literal (`https://[::1]:8787`). A Unicode host is rejected with a
message telling you to write the punycode form (`xn--bcher-kva.example`), because
IDNA cannot be done in ES5 — better a clear error than an origin that differs from
the one a modern browser computes. Two shorthands are passed through as written
instead of expanded, which affects only the stored string, not where the request
goes: an abbreviated IPv4 (`127.1`, which a browser reads as `127.0.0.1`) and a
non-canonical IPv6 literal. Write the full form if you want the two identical.

## 7. Checklist before you ship

- [ ] Client config has **no** `login`/`password`, and `proxy` is set.
- [ ] The proxy is protected by model **A** or **B** of §5 — decided, not assumed.
- [ ] `/tiles/login` is rate-limited.
- [ ] `<proxy>/tiles/login` relays `{ ok, username, token }` unchanged and honours `X-BeMap-Tiles-Host`.
- [ ] HTTPS everywhere; your site's origin is allow-listed where required.
- [ ] DevTools check: no `appid`, no `appcode`, no `Authorization: Basic` on any request.
- [ ] Tiles still render (they come direct from `tilesHost`, authenticated by the token).
- [ ] BeNomad has reviewed your proxy design.

---

## Reference

* Tiles-only alternative: [integration-tiles-token-provider.md](integration-tiles-token-provider.md)
* Tile auth wires + caching: [browser-cache.md](browser-cache.md)
* Environments (prod / preprod / beta): [../INSTALL.md](../INSTALL.md)
* Questions on the server side: contact your BeNomad account manager.
