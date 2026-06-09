# Style customisation — BeNomad Tiles

`bemap.MapLibreMap` accepts a customer-supplied style in three shapes.
All three flow through `bemap.TilesStyle.fetch()` →
`resolvePlaceholders()` → `hardenSymbolCollisions()` before being handed
to MapLibre.

## 1. The bundled default

Omit `style` and let the library use `bemap.defaultStyle`:

```js
var map = new bemap.MapLibreMap(ctx, 'map');
```

The shipped default is the BeNomad **charte 2026** gray-level style — a single
PMTiles vector source rendering water, land-use, roads, boundaries, buildings
and bilingual place labels.

**Provenance.** It's a snapshot of the charte style the BeNomad Tiles Worker
serves at `<tilesHost>/styles/` (the same style you'd fetch with
`map.fetchAvailableStyles()`), captured into `src/bemap-maplibre/bemap-default-style.js`
from `styles_charte_2026.json` so the first frame renders without a Worker
round-trip for the style. To refresh it, re-export the Worker's style JSON over
`styles_charte_2026.json` and regenerate (keep the `TILES_SOURCE` /
`__BILINGUAL_PLACE__` placeholders). Fonts (glyphs) are covered in the **Fonts
(glyphs)** section below.

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

MapLibre needs a `glyphs` URL to render text labels. The library ships the two
fontstacks the default style uses — **`Noto Sans Regular`** and **`Noto Sans
Bold`** — in `dist/fonts/`, and wires them up automatically. The `glyphs` URL is
resolved in this precedence:

1. **`ctx.glyphsUrl`** — an explicit override, e.g.
   `new bemap.Context({ glyphsUrl: 'https://my-host/fonts/{fontstack}/{range}.pbf' })`.
   Wins over everything and is applied to custom styles too.
2. **Bundled fonts (the default).** At load, the bundle detects the directory
   `bemap-js-api(.min).js` was served from and points the default style's
   `glyphs` at `<that dir>/fonts/{fontstack}/{range}.pbf` — exposed as
   `bemap.TilesStyle.bundledGlyphsUrl()`. Zero config.
3. **Public fallback** — `demotiles.maplibre.org`, used only when the bundle
   directory can't be detected (SSR / exotic loaders).

> **Deployment:** the one requirement is that `dist/fonts/` is served next to
> `bemap-js-api.js`. It ships inside `dist/`, so vendoring the whole `dist/`
> folder is enough — but copying *only* the `.js` (without the `fonts/` folder)
> makes the auto-detected glyphs URL **404**. To self-host the glyph `.pbf`
> ranges, drop them under `lib/fonts/<fontstack>/<range>.pbf` and run
> `npx grunt` (see `lib/fonts/README.md`).

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
