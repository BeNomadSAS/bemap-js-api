# BeNomad Tiles — troubleshooting playbook

Symptom → most likely cause → fix. Ordered by how often it bites new integrations.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `new bemap.GeocoderV2 is not a constructor` (or any `*V2` except `RoutingV2`) | Followed `llms.txt`, which advertises services not in the bundle | Use the v1 class: `bemap.Geocoder`, `bemap.ReverseGeocoder`, `bemap.ChargingStations`, `bemap.EvVehicles`. Only `RoutingV2` exists. |
| Point/marker lands in the wrong place (ocean) | lat/lon order swapped | Everything is **lon then lat**: `new bemap.Coordinate(lon, lat)`, `map.move(lon, lat, zoom)`. |
| **Blank/plain map**, no tiles, but no auth error | Token OK but tiles never painted | Check `map.on('error', …)` and the Network tab. If tile requests are pending forever → connection stall (see hang row). If they 403 → tileset not entitled. If nothing is requested → style/source misconfigured. |
| Login works in browser (200) but **fails 403 from a script/mobile/server** | Gateway filtering a bot-like `User-Agent` (e.g. `Python-urllib`, default HTTP-lib UAs) | Send an explicit real `User-Agent` header on every request. If still blocked, ask BeNomad to allowlist the client. NOT a credentials problem. |
| `400 "Access Denied"` on geocoding-direct or EV | Account not provisioned for that service | Provision the role server-side (`ROLE_VEHICLE`, `ROLE_CHARGINGSTATION`, geoserver/provider ACL). Reverse-geo/routing can be granted while these are not. Not a code bug. |
| Opaque `TypeError: Failed to fetch` cross-origin (login or tiles) from a browser | Your web origin isn't CORS-allowlisted | Ask BeNomad to allowlist your site origin. Verify: a preflight `OPTIONS` should return `Access-Control-Allow-Origin: <your-origin>` + `Access-Control-Allow-Credentials: true`. |
| ZXY tile decodes to garbage / double-gunzip error (browser) | Re-decompressing an already-decompressed body | The browser auto-decompresses `Content-Encoding: gzip`. Parse the bytes directly as MVT; do NOT gunzip. |
| ZXY tile is raw gzip (`1f 8b`) in a native/server client | Client didn't negotiate encoding | gunzip the body before decoding MVT (or send `Accept-Encoding: gzip` and let your stack decode). |
| `ETag` missing in browser JS on the 200 slice | `ETag` not in `Access-Control-Expose-Headers` cross-origin | The `ETag` exists (visible server-side); it's just not exposed to browser JS. Rely on the CDN/HTTP cache, not on reading `ETag` yourself. Ask BeNomad to expose it if you truly need it. |
| `403` on `GET /default.pmtiles` | Missing `Range` header, or `Range > 10 MB`, or multi-part Range | Always send a single `Range: bytes=A-B` ≤ 10 MB. `pmtiles.js` does this for you. |
| `401` mid-session after ~1 h | Token expired | Re-`POST /api/login` and retry. Web SDK auto-refreshes ~5 min before expiry; raw/mobile must handle it (see templates). |
| `429` | Rate limit (100 req/s) exceeded | Throttle. For bulk/soak clients, cap concurrency. |
| Tile request **hangs forever** (never 200/204/error); fixed by pan/zoom | In-flight tile stalled (connection saturation / HToL, or a Worker/CDN read stall) | Reproduce & localize with the BeNomad tile-hang detector (browser vs server). If browser-only → connection layer; if server too → Worker/CDN, escalate to infra. |
| `map.setStyle(json)` wipes my markers/overlays (raw MapLibre) | Raw MapLibre drops user layers on style change | Use the SDK's `bemap.MapLibreMap.setStyle()` which replays overlays, or re-add layers on `styledata`. |

## Quick auth probe (any environment)

```bash
# 1. Login (replace env host + creds). A browser-like UA avoids gateway 403.
curl -s -X POST "https://mptiles-api-beta.benomad.net/api/login" \
  -H "Authorization: Basic $(printf '%s:%s' "$LOGIN" "$PASS" | base64)" \
  -H "User-Agent: Mozilla/5.0" | tee /tmp/login.json
TOKEN=$(python3 -c "import json,sys;print(json.load(open('/tmp/login.json'))['token'])")

# 2. Range request → expect 206 + PMTiles header
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Session-Token: $TOKEN" -H "User-Agent: Mozilla/5.0" \
  -H "Range: bytes=0-16383" "https://mptiles-api-beta.benomad.net/default.pmtiles"

# 3. A ZXY tile → expect 200 (or 204 empty)
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Session-Token: $TOKEN" -H "User-Agent: Mozilla/5.0" \
  "https://mptiles-api-beta.benomad.net/default/12/2074/1409.pbf"
```
