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

**`proxy` accepts** an origin (`https://host`) or an origin plus a path prefix
(`https://host/bemap`), with or without a trailing slash. A URL with a `?query`
or `#fragment`, a relative path, or a non-`http(s)` scheme is **rejected
immediately** (the Context throws) rather than failing later as a puzzling 404.

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
* **Protect your proxy** behind your app's existing auth, restrict the origins
  allowed to call it, and never log the credentials.
* Behind a proxy the SDK authenticates tiles with the **token header**, not a
  cookie (a cookie set by your proxy's origin could never be sent to the tiles
  host). This is automatic — you don't configure it.

---

## 6. Not supported behind a proxy

`map.loadBeMapTiles(...)` — a **deprecated** helper from before `ctx.tilesHost`
existed — sends `Authorization: Basic` straight from the browser by design, which
is precisely what `proxy` prevents. Use `ctx.tilesHost` (with `proxy`) instead.

## 7. Checklist before you ship

- [ ] Client config has **no** `login`/`password`, and `proxy` is set.
- [ ] Your proxy endpoint is behind your own authentication.
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
