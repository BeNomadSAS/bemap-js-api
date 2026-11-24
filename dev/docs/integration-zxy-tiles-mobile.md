# BeNomad Tiles — ZXY vector tiles for server / mobile / fleet

The **browser** path uses **PMTiles Range requests** (the SDK's default, handled
for you by `bemap.MapLibreMap`). **Native and server-side clients** — mobile
apps, fleet backends, batch/ETL jobs — usually consume the classic **ZXY**
vector-tile endpoint instead:

```
GET https://<tilesHost>/<map>/{z}/{x}/{y}.pbf?token=<JWT>
```

- **`<map>`** resolves the same way as the PMTiles archive: `tilesFile →
  geoserver → 'default'`. The `.pbf` ZXY path is the per-tile equivalent of the
  PMTiles archive — use the exact host/map BeNomad provisioned for your account.
- **Format:** Mapbox Vector Tile (MVT, protobuf). Decode with any MVT reader
  (`@mapbox/vector-tile`, `vtzero`, Go `go-mvt`, MapLibre Native, …).
- **Auth:** query parameter `?token=<JWT>`. Obtain the JWT from
  `POST /api/login` (HTTP Basic) — see
  [integration-tiles-token-provider.md](integration-tiles-token-provider.md).
  Missing / invalid token → **401**.
- **Empty tiles:** an out-of-data area (e.g. open ocean) returns **204 No
  Content** with no body. Treat it as "nothing to draw here", not as an error.

---

## ⚠️ `Content-Encoding: gzip` — decompress **exactly once**

ZXY tiles are served **gzip-compressed** (`Content-Encoding: gzip`). Whether
*you* must gunzip depends entirely on your HTTP client — most clients do it for
you, and doing it a second time is the classic "not in gzip format" crash.

| Client | What you receive | What to do |
| --- | --- | --- |
| **Browser** (`fetch`, `XMLHttpRequest`) | Already **decompressed** — the browser handles `Content-Encoding` transparently and even hides the header from JS. | Feed the bytes straight to the MVT decoder. **Do not gunzip.** |
| **HTTP lib that manages `Accept-Encoding` itself** (Python `requests`, okhttp default, Go `net/http` default transport) | Already **decompressed** — the lib advertised gzip and transparently inflated the body. | Feed straight to the MVT decoder. **Do not gunzip.** |
| **You set `Accept-Encoding: gzip` manually**, or use a raw/low-level socket client | **Raw gzip bytes** | **Gunzip once**, then decode MVT. |

**Rule of thumb:** if you did *not* set `Accept-Encoding` yourself, your client
has already inflated the body — decode the bytes as MVT directly. If you *did*
request gzip explicitly (or you still see `Content-Encoding: gzip` while reading
the raw stream), gunzip exactly once before decoding.

### Per-client notes

- **okhttp / Retrofit (Android):** the default `OkHttpClient` adds
  `Accept-Encoding: gzip` and transparently decompresses, so
  `response.body().bytes()` is plain MVT. The moment you set your *own*
  `Accept-Encoding` header, okhttp stops auto-decompressing and hands you raw
  gzip — then you own the gunzip.
- **Go `net/http`:** with the default transport and **no** explicit
  `Accept-Encoding`, the body is transparently decompressed and
  `resp.Header.Get("Content-Encoding")` comes back empty. Set the header
  yourself → you own the gunzip.
- **Python `requests`:** `r.content` is already decompressed — use it directly.
  (Only `urllib3` in raw/streaming mode with a manual header gives you gzip.)
- **curl:** raw gzip by default; add `--compressed` to have curl inflate it:
  `curl --compressed "https://<tilesHost>/<map>/8/128/86.pbf?token=<JWT>"`.

> **Symptom cheat-sheet.** "Invalid MVT / protobuf parse error" on bytes that
> start with `1f 8b` → you're handing **gzip** to the MVT decoder (decompress
> first). "not in gzip format" / "incorrect header check" → you're gunzipping
> bytes the client **already** inflated (decode as MVT directly).

---

## Reference

- Login / JWT provider (keep credentials server-side): [integration-tiles-token-provider.md](integration-tiles-token-provider.md)
- Browser PMTiles Range + Service Worker cache: [browser-cache.md](browser-cache.md)
- Service files & wire format: `src/bemap-maplibre/bemap-tiles-auth.js`, `src/bemap-sw/sw-tiles.js`
