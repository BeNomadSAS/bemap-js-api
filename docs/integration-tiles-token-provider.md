# BeNomad Tiles — backend token provider integration

This guide shows how to integrate **BeNomad Tiles** (PMTiles via
`mptiles-api-beta.benomad.net`) into your application **without ever shipping
your BeNomad credentials to the browser**.

The library supports two auth modes — pick the one that matches your
trust model:

| Mode | Credentials live in | When to use |
| --- | --- | --- |
| **Direct** | The browser (`Context.login` + `Context.password`) | Public-facing demos, single-page sites, or any case where the credentials are effectively a public API key |
| **Provider** (this guide) | **Your backend only** | Production apps where credentials must stay server-side |

In provider mode, your backend exposes a tiny endpoint that exchanges your
private credentials for a short-lived JWT (1 h). The browser never sees
the password, only the JWT it uses to fetch tiles directly from BeNomad.

```
Browser                 Your backend             BeNomad Tiles Worker
   │                          │                          │
   │  POST /tilesproxy/login  │                          │
   │ ────────────────────────►│                          │
   │                          │  POST /api/login         │
   │                          │  Authorization: Basic …  │
   │                          │ ────────────────────────►│
   │                          │  ◄──────────────────────│
   │                          │  { token, exp }          │
   │  { token, exp }          │                          │
   │ ◄────────────────────────│                          │
   │                          │                          │
   │  GET /…/world.pmtiles   X-Session-Token: <JWT>      │
   │ ────────────────────────────────────────────────────►
   │                          │                          │
   │  ◄────────────────────────────────────────────────────
```

After the login, the browser talks directly to BeNomad for tiles — your
backend is out of the loop, so you pay no bandwidth and add no latency.

---

## Backend — pick your language

The endpoint is a **pure HTTP passthrough**: receive a POST from your
authenticated frontend, attach `Authorization: Basic base64(login:password)`,
forward it to `https://mptiles-api-beta.benomad.net/api/login`, return the JSON
response as-is.

No BeNomad SDK to install. No state. Just one HTTP call.

> **Always protect this endpoint behind your app's existing auth gate** —
> otherwise anonymous visitors can mint JWTs against your account.

### Node.js / Express

```js
const fetch = require('node-fetch'); // or global fetch on Node 18+

app.post('/tilesproxy/login', async (req, res) => {
  // Replace this check with whatever auth your app uses
  if (!req.user) return res.status(401).end();

  const basic = Buffer.from(
    process.env.BENOMAD_TILES_LOGIN + ':' + process.env.BENOMAD_TILES_PASSWORD
  ).toString('base64');

  const r = await fetch('https://mptiles-api-beta.benomad.net/api/login', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic }
  });
  res.status(r.status).type('application/json').send(await r.text());
});
```

### Python / FastAPI

```python
import os, requests
from fastapi import Depends, HTTPException
from fastapi.responses import JSONResponse

LOGIN = os.environ['BENOMAD_TILES_LOGIN']
PWD = os.environ['BENOMAD_TILES_PASSWORD']

@app.post('/tilesproxy/login')
def login(user = Depends(your_auth_dependency)):
    r = requests.post(
        'https://mptiles-api-beta.benomad.net/api/login',
        auth=(LOGIN, PWD),
        timeout=10
    )
    return JSONResponse(r.json(), status_code=r.status_code)
```

### Python / Flask

```python
import os, requests
from flask import abort, jsonify

@app.route('/tilesproxy/login', methods=['POST'])
@require_login  # your existing decorator
def tiles_login():
    r = requests.post(
        'https://mptiles-api-beta.benomad.net/api/login',
        auth=(os.environ['BENOMAD_TILES_LOGIN'],
              os.environ['BENOMAD_TILES_PASSWORD']),
        timeout=10
    )
    return jsonify(r.json()), r.status_code
```

### PHP

```php
<?php
// Your existing auth gate, e.g.:
session_start();
if (!isset($_SESSION['user'])) { http_response_code(401); exit; }

$ch = curl_init('https://mptiles-api-beta.benomad.net/api/login');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_USERPWD => getenv('BENOMAD_TILES_LOGIN') . ':' . getenv('BENOMAD_TILES_PASSWORD'),
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 10,
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($status);
header('Content-Type: application/json');
echo $body;
```

### Java / Spring Boot

```java
@RestController
@RequestMapping("/tilesproxy")
public class TilesProxyController {

    @Value("${benomad.tiles.login}")    private String login;
    @Value("${benomad.tiles.password}") private String password;

    private static final String UPSTREAM = "https://mptiles-api-beta.benomad.net/api/login";
    private final RestTemplate rt = new RestTemplate();

    @PostMapping("/login")
    public ResponseEntity<Map> login() {
        // Spring Security / your filter chain enforces auth before this point.
        HttpHeaders h = new HttpHeaders();
        h.setBasicAuth(login, password);
        h.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        return rt.exchange(UPSTREAM, HttpMethod.POST, new HttpEntity<>(h), Map.class);
    }
}
```

### .NET / ASP.NET Core

```csharp
[Authorize]
[ApiController]
public class TilesProxyController : ControllerBase {
    private static readonly HttpClient http = new HttpClient();

    [HttpPost("/tilesproxy/login")]
    public async Task<IActionResult> Login() {
        var creds = Environment.GetEnvironmentVariable("BENOMAD_TILES_LOGIN")
                  + ":" + Environment.GetEnvironmentVariable("BENOMAD_TILES_PASSWORD");
        var req = new HttpRequestMessage(HttpMethod.Post, "https://mptiles-api-beta.benomad.net/api/login");
        req.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(creds)));
        var r = await http.SendAsync(req);
        return new ContentResult {
            Content     = await r.Content.ReadAsStringAsync(),
            ContentType = "application/json",
            StatusCode  = (int) r.StatusCode
        };
    }
}
```

### Go / net/http

```go
func tilesLogin(w http.ResponseWriter, r *http.Request) {
    // require your usual session/auth here
    req, _ := http.NewRequest("POST", "https://mptiles-api-beta.benomad.net/api/login", nil)
    req.SetBasicAuth(os.Getenv("BENOMAD_TILES_LOGIN"), os.Getenv("BENOMAD_TILES_PASSWORD"))
    resp, err := http.DefaultClient.Do(req)
    if err != nil { http.Error(w, err.Error(), 502); return }
    defer resp.Body.Close()
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(resp.StatusCode)
    io.Copy(w, resp.Body)
}
```

---

## Frontend — identical for every backend

```js
new bemap.Context({
  tilesHost: 'mptiles-api-beta.benomad.net',
  tilesTokenProvider: function () {
    return fetch('/tilesproxy/login', {
      method: 'POST',
      credentials: 'same-origin' // send session cookie / auth header
    }).then(function (r) {
      if (!r.ok) throw new Error('tilesproxy/login HTTP ' + r.status);
      return r.json();          // must resolve to { token: '<JWT>' [, exp: number] }
    });
  }
});

var map = new bemap.MapLibreMap(ctx, 'map');
```

If your backend returns `exp` (seconds-since-epoch), the library uses it
to schedule proactive renewal. If it's omitted, the lib parses `exp`
directly from the JWT.

---

## Checklist (do this before you ship)

- [ ] **Env vars set** — `BENOMAD_TILES_LOGIN` and `BENOMAD_TILES_PASSWORD` in your deployment, **never** committed to source.
- [ ] **Auth gate** — endpoint requires your existing session/JWT/OAuth. An open `/tilesproxy/login` lets anyone mint tokens against your quota.
- [ ] **HTTPS only** — never deploy the endpoint over plain HTTP.
- [ ] **Same origin** — easiest setup: serve the endpoint from the same origin as your frontend (no CORS needed). If cross-origin is required, set `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials: true` and use `credentials: 'include'` on the frontend `fetch`.
- [ ] **Logs** — never log the upstream `Authorization` header or the request body. The returned JWT itself can be logged for debugging if needed (it's short-lived).
- [ ] **Error handling** — non-2xx from upstream should propagate as 502 from your endpoint. The library surfaces this through `map.on('error', …)` with `code: UNAUTHORIZED`.
- [ ] **Token TTL** — BeNomad JWTs last ~1 h. The library auto-renews 5 min before expiry; nothing extra to do on your side.
- [ ] **Rate** — one token call per browser tab per hour with default settings. No caching needed for most apps; add server-side caching only if your quota is tight.

---

## Optional: server-side JWT cache

For high-traffic apps, cache the JWT once per process and share it across
all browsers — turns *N logins/hour* into *1 login/hour* regardless of
user count. Sketch (Node.js):

```js
let cached = null; // { token, exp }
async function getCachedToken() {
  const nowSec = Date.now() / 1000;
  if (cached && cached.exp - nowSec > 60) return cached;
  const r = await fetch('https://mptiles-api-beta.benomad.net/api/login', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(LOGIN + ':' + PWD).toString('base64') }
  });
  const body = await r.json();
  // Parse exp from JWT payload (middle segment, base64url JSON)
  const exp = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64url')).exp;
  cached = { token: body.token, exp };
  return cached;
}

app.post('/tilesproxy/login', async (req, res) => {
  if (!req.user) return res.status(401).end();
  res.json(await getCachedToken());
});
```

The same shape works in any language — store `{token, exp}` in a
module-level variable (single instance) or Redis (multi-instance).

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `POST /tilesproxy/login` returns 401 from your endpoint | Your app's auth gate rejected the request — check session/cookie/CORS |
| `POST /tilesproxy/login` returns 502 | Upstream rejected your credentials — check the env vars match what BeNomad gave you |
| Network panel shows `POST mptiles-api-beta.benomad.net/api/login` from the browser | `tilesTokenProvider` is not configured — the lib fell back to direct mode. Verify the Context option is set and the provider is a function, not a string |
| `GET …/world.pmtiles` returns 401 | The token reached the browser but isn't being attached. Open DevTools → check the `X-Session-Token` header on tile requests. If missing, file an issue. |
| Frontend throws "tilesTokenProvider returned no token" | Your endpoint returned 200 but the JSON shape is wrong — must be `{ token: '<JWT>' }` (or `{ jwt }` / `{ accessToken }`) |
| 60 min after page load, tiles fail | Token renewal failed. Check `map.on('error', …)` for the cause; usually a transient network error during the proactive refresh — reload the page to recover |

---

## Reference

- BeNomad Tiles login endpoint: `POST https://mptiles-api-beta.benomad.net/api/login` (HTTP Basic Auth → returns `{ token: '<JWT, 1h exp>' }`)
- Library auth module: [src/bemap-maplibre/bemap-tiles-auth.js](../src/bemap-maplibre/bemap-tiles-auth.js)
- Direct-mode walkthrough: [docs/migration-wms-to-tiles.md](migration-wms-to-tiles.md)
- Service Worker cache: [docs/browser-cache.md](browser-cache.md)
- Style customisation: [docs/style-customisation.md](style-customisation.md)
