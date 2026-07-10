# Backend token provider (production auth — keep credentials server-side)

For production, **never ship the BeNomad login/password to the browser**. Your
backend exchanges its private credentials for a short-lived JWT; the browser only
ever sees the JWT and fetches tiles directly from BeNomad.

```
Browser → POST /tilesproxy/login (your app auth) → your backend
                                                    → POST {tilesBase}/api/login (Basic) → { token }
Browser ← { token } ← your backend
Browser → GET {tilesBase}/default.pmtiles (X-Session-Token / ?token=) → BeNomad
```

Credentials live in env vars (`BENOMAD_TILES_LOGIN`, `BENOMAD_TILES_PASSWORD`),
never in source or the client. Protect `/tilesproxy/login` behind your existing
app auth, or anyone can mint tokens against your quota.

## Node / Express

```js
app.post('/tilesproxy/login', async (req, res) => {
  if (!req.user) return res.status(401).end();                 // your auth gate
  const basic = Buffer.from(`${process.env.BENOMAD_TILES_LOGIN}:${process.env.BENOMAD_TILES_PASSWORD}`).toString('base64');
  const r = await fetch('https://mptiles-api-beta.benomad.net/api/login', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic, 'User-Agent': 'your-backend/1.0' } // UA avoids gateway 403
  });
  res.status(r.status).type('application/json').send(await r.text());
});
```

## Python / FastAPI

```python
import os, requests
from fastapi import Depends, HTTPException
from fastapi.responses import JSONResponse

@app.post('/tilesproxy/login')
def login(user = Depends(your_auth_dependency)):
    r = requests.post('https://mptiles-api-beta.benomad.net/api/login',
                      auth=(os.environ['BENOMAD_TILES_LOGIN'], os.environ['BENOMAD_TILES_PASSWORD']),
                      headers={'User-Agent': 'your-backend/1.0'}, timeout=10)  # UA avoids gateway 403
    return JSONResponse(r.json(), status_code=r.status_code)
```

## Frontend — with the BeMap SDK

```js
var ctx = new bemap.Context({
  host: 'bemap-beta.benomad.com', secure: true,
  tilesHost: 'mptiles-api-beta.benomad.net',
  tilesTokenProvider: function () {
    return fetch('/tilesproxy/login', { method: 'POST', credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('tilesproxy HTTP ' + r.status); return r.json(); }); // → { token }
  }
});
var map = new bemap.MapLibreMap(ctx, 'map');
```

## Checklist

- [ ] Credentials only in server env vars — never committed, never in the client.
- [ ] `/tilesproxy/login` behind your app's auth gate.
- [ ] HTTPS only.
- [ ] Same origin as your frontend (no CORS) — or set `Access-Control-Allow-Origin` + `-Credentials: true` and use `credentials:'include'`.
- [ ] Real `User-Agent` on the upstream call (gateway 403s bot-like agents).
- [ ] Never log the upstream `Authorization` header or the credentials.
- [ ] Optional: cache the JWT once per process (1 login/hour regardless of user count).
```
