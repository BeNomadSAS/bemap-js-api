# BeNomad Tiles — troubleshooting playbook

Symptom → most likely cause → fix. Ordered by how often it bites new integrations.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `new bemap.GeocoderV2 is not a constructor` (or any `*V2` except `RoutingV2`) | Guessed a `V2` suffix — only `RoutingV2` has one | Drop the suffix: `bemap.Geocoder`, `bemap.ReverseGeocoder`, `bemap.ChargingStations`, `bemap.EvVehicles`. Only `RoutingV2` carries a `V2` — but most un-suffixed classes are still the modern Promise API (see the contract). |
| Point/marker lands in the wrong place (ocean) | lat/lon order swapped | Everything is **lon then lat**: `new bemap.Coordinate(lon, lat)`, `map.move(lon, lat, zoom)`. |
| **Blank/plain map**, no tiles, but no auth error | Token OK but tiles never painted | Check `map.on('error', …)` and the Network tab. If tile requests are pending forever → connection stall (see hang row). If they 403 → tileset not entitled. If nothing is requested → style/source misconfigured. |
| Login works in browser (200) but **fails 403 from a script/mobile/server** | Gateway blocklisting a bot-like `User-Agent` | Send a plausible `User-Agent` on every request. Measured on beta: `Python-urllib/3.11` → **403**, empty UA → **200** — it is a blocklist, not a required header, so never ship a default library UA. If still blocked, ask BeNomad to allowlist the client. NOT a credentials problem. |
| `400 "Access Denied"` on geocoding-direct or EV | Account not provisioned for that service | Confirm with `bemap.AclService` (`GET service/acl/1.0/user/details`) — it lists the account's roles, geoservers and charging providers. Then provision the role server-side (`ROLE_VEHICLE`, `ROLE_CHARGINGSTATION`, …). Tiles need `ROLE_MAPPING` **and** `ROLE_MAPPING_MPTILES`. Not a code bug. |
| Opaque `TypeError: Failed to fetch` cross-origin (login or tiles) from a browser | Your web origin isn't CORS-allowlisted | Ask BeNomad to allowlist your site origin. Verify: a preflight `OPTIONS` should return `Access-Control-Allow-Origin: <your-origin>` + `Access-Control-Allow-Credentials: true`. |
| ZXY tile decodes to garbage / double-gunzip error (browser) | Re-decompressing an already-decompressed body | The browser auto-decompresses `Content-Encoding: gzip`. Parse the bytes directly as MVT; do NOT gunzip. |
| ZXY tile is raw gzip (`1f 8b`) in a native/server client | Client didn't negotiate encoding | gunzip the body before decoding MVT (or send `Accept-Encoding: gzip` and let your stack decode). |
| `ETag` missing in browser JS on the 200 slice | `ETag` not in `Access-Control-Expose-Headers` cross-origin | The `ETag` exists (visible server-side); it's just not exposed to browser JS. Rely on the CDN/HTTP cache, not on reading `ETag` yourself. Ask BeNomad to expose it if you truly need it. |
| `403` on `GET /default.pmtiles` | Missing `Range` header, or `Range > 10 MB`, or multi-part Range | Read the JSON body, it names the cause: `"Range header required for PMTiles files"` or `"Range too large (…). Max: 10485760 bytes"`. Always send a single `Range: bytes=A-B` ≤ 10 MB. `pmtiles.js` does this for you. |
| `401` mid-session after exactly 3600 s | Token expired | Re-`POST /api/login` and retry. Web SDK auto-refreshes ~5 min before expiry; raw/mobile must handle it (see templates). |
| `429` | Rate limit (100 req/s) exceeded | Throttle. For bulk/soak clients, cap concurrency. |
| **Blank map after BeNomad rebuilt an archive**, fixed by clearing the browser cache | Stale PMTiles slices cached under an unchanged URL | Fixed in **2.0.1** — upgrade. The SDK now reads `versions`/`aliasVersions` from `/api/maps` and appends `?v=<token>`, so a rebuild is a new immutable URL. On an older bundle, or a Worker with no token, the ETag self-heal needs one reload. |
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

# 3. Slice 200 — what the SDK actually does by default. Same bytes as step 2.
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Session-Token: $TOKEN" -H "User-Agent: Mozilla/5.0" \
  "https://mptiles-api-beta.benomad.net/default?r=0-16383"

# 4. A ZXY tile → expect 200. An empty tile is a small 200 payload, not a 204:
#    204 is documented but did not reproduce on beta (2026-08-26).
curl -s -o /dev/null -w "%{http_code} %{size_download}o\n" \
  -H "X-Session-Token: $TOKEN" -H "User-Agent: Mozilla/5.0" \
  "https://mptiles-api-beta.benomad.net/default/12/2074/1409.pbf"
```
