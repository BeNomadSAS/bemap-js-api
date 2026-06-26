# Style customisation — BeNomad Tiles

`bemap.MapLibreMap` takes the style in four shapes. All flow through
`bemap.TilesStyle.fetch()` → `resolvePlaceholders()` →
`hardenSymbolCollisions()` before MapLibre renders them.

| `style` option | Behaviour |
| --- | --- |
| *omitted* or `'default'` | **tiny fallback → live server default.** Paints the tiny font-free `bemap.fallbackStyle` instantly, then — once login completes — fetches the Worker's default style (`/api/default-style` → `/styles/<name>`) and swaps it in. No first-paint cost; the charte stays current with **no library rebuild**. |
| `'<name>'` (bare, e.g. `'style_liberty'`) | tiny fallback, then loads that named style from `<tilesHost>/styles/<name>`. Names come from `map.fetchAvailableStyles()`. |
| `'<url>'` | fetches that URL (the `X-Session-Token` is injected for `ctx.tilesHost` URLs). |
| `{ …json… }` | uses the inline object directly. |

## 1. The default — server-loaded after login

```js
var map = new bemap.MapLibreMap(ctx, 'map');   // (equivalently: { style: 'default' })
```

The map paints a **tiny fallback** immediately (land/water/roads, no labels),
then loads the **live** default style from the Worker once login completes
(`fetchDefaultStyle()` → `/styles/<name>` → overlay-preserving `setStyle`). So
the default always tracks what the server publishes — change the charte on the
Worker and every app picks it up on next load. The swap is skipped if you call
`setStyle()` yourself during the brief async gap.

> **The bundled style is a tiny fallback, not the source of truth.**
> `bemap.fallbackStyle` (`src/bemap-maplibre/bemap-default-style.js`) is a
> deliberately minimal **fill/line-only** style — background, land, water,
> landcover and major roads, **no labels and no `glyphs`, so it ships no fonts**.
> It exists only as the instant first paint and the offline/error fallback (if
> the server style can't be fetched, the basic map stays — never a blank). It
> carries the `TILES_SOURCE` placeholder. `bemap.defaultStyle` is kept as a
> back-compat alias of it. Because the real charte lives on the Worker, you
> never rebuild the library to update it.

## 1b. Pick a style by name

```js
map.fetchAvailableStyles().then(function (cfg) {
  // cfg.styles → ['style_liberty', 'charte_2026', …]   cfg.defaultStyle → the default
});
map.setStyle('style_liberty');   // bare name → <tilesHost>/styles/style_liberty
```

`setStyle()` accepts a **name**, a **URL**, or an **inline object** — all
overlay-preserving. See the runnable **Style picker** example
(`examples/services-v2/style-picker.html`). Fonts (glyphs) are covered below.

## 2. A customer-hosted style URL

Pass the URL on the constructor:

```js
var map = new bemap.MapLibreMap(ctx, 'map', {
  style: 'https://mptiles-api-beta.benomad.net/styles/style_charte_single.json'
});
```

URLs that match `ctx.tilesHost` go through the same auth path (the
`X-Session-Token` header is injected by `transformRequest`).

## 3. An inline style object

```js
var map = new bemap.MapLibreMap(ctx, 'map', {
  style: {
    version: 8,
    sources: { 'TILES_SOURCE': { type: 'vector', url: '' } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#fff' } }
    ]
  }
});
```

## Placeholders

Two placeholders make a style portable across customers and languages:

- `TILES_SOURCE` — the source key. `bemap.TilesStyle.resolvePlaceholders`
  replaces it with the real `pmtiles://https://{tilesHost}/{tilesFile}` URL
  and renames the source to `tiles`. Every layer with
  `source: 'TILES_SOURCE'` is rewritten accordingly. Override the
  placeholder name in `metadata.source_placeholder`.

- `__BILINGUAL_PLACE__` — the `text-field` value. Replaced with a
  MapLibre `format` expression that picks the browser-language name first
  and falls back to the local name on a smaller second line. Override the
  placeholder name in `metadata.place_label_placeholder`.

## Fonts (glyphs)

**The library ships no fonts** — there is no `dist/fonts/` to deliver. Labels
come from the **Worker**, not the bundle:

- The **tiny fallback** (`bemap.fallbackStyle`, the instant first paint) has no
  label layers and no `glyphs`, so it never requests a font.
- The **server styles** (the live charte and any named style) ship their own
  `glyphs`. A root-relative one (e.g. the charte's `/fonts/{fontstack}/{range}.pbf`)
  is **absolutised against the tilesHost** by `resolvePlaceholders` →
  `<tilesHost>/fonts/{fontstack}/{range}.pbf`, and the fetch interceptor attaches
  the `X-Session-Token`. So the Worker serves the fonts, gated and cached.

To point glyphs somewhere else, set **`ctx.glyphsUrl`** — it overrides every
style's `glyphs`:

```js
new bemap.Context({ glyphsUrl: 'https://my-host/fonts/{fontstack}/{range}.pbf' });
```

> **Deployment:** ship just `bemap-js-api.js` (+ css) — no fonts folder. Fonts
> are served by the Worker with the style. (Earlier versions bundled fonts in
> `dist/fonts/`; that's gone.)

Custom styles (URL or inline object) keep their own `glyphs` unless you set
`ctx.glyphsUrl`.

## Runtime style swap

```js
// Inline object — applied synchronously, returns `this` for chaining
map.setStyle({ version: 8, sources: {}, layers: [] });

// URL — fetched + resolved asynchronously, still returns `this`
map.setStyle('https://mptiles-api-beta.benomad.net/styles/style_apple.json');
```

`setStyle` is **overlay-preserving** — every marker, polyline, polygon,
cluster layer and 3D-buildings layer registered through the public API is
captured by `bemap.TilesOverlayCatalog` and replayed onto the new style.
That includes the `401 → refresh → setStyle` path used internally for
token renewal, so a session timeout will not destroy a customer's
overlays.

## Surgical edits

For one-off paint / layout tweaks, use the direct MapLibre passthroughs:

```js
map.setPaintProperty('road_motorway', 'line-color', '#e94560');
map.setLayoutProperty('place_city', 'visibility', 'none');
map.setFilter('road_minor', ['<=', ['zoom'], 14]);
map.setLayerZoomRange('building', 13, 22);
```

All four are no-ops on Leaflet and OpenLayers (warn-once, no throw).

## Engine-agnostic styling (Leaflet / OpenLayers)

`setStyle()` and the style/discovery fetchers exist on **all three engines**, so
switching engine via `bemap.createMap` never breaks a style call. They aren't
identical — Leaflet/OL render **WMS raster** (geoserver-styled), not MapLibre
vector styles:

| Call | MapLibre | Leaflet / OpenLayers (WMS) |
| --- | --- | --- |
| `setStyle('<name>')` | fetch `/styles/<name>` vector style | re-apply `<name>` as the WMS `STYLES` on the BeNomad layer(s) — the dark/light theme switch (`'benomadGrayLevel'` / `'benomadLight'`) |
| `setStyle('<url>')` | fetch the vector style URL | swap the raster tile-source URL (XYZ) |
| `setStyle({json})` | apply the vector style | no-op (warn once) — vector styles are MapLibre-only |
| `fetchAvailableStyles()` / `fetchDefaultStyle()` / `fetchAvailableMaps()` / `fetchDefaultMap()` | resolve from the Worker | reject `bemap.Error.MAPLIBRE_ONLY` |

A theme toggle stays portable — the app picks the right name per engine (vector
style names ≠ WMS style names):

```js
map.setStyle(theme === 'dark' ? darkName : lightName);
// MapLibre → vector dark/light style;  Leaflet/OL → WMS STYLES benomadGrayLevel / benomadLight
```
