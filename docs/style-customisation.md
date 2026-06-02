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

The shipped default is the BeNomad gray-level style — minimal earth,
water, land-use, roads, buildings and bilingual place labels.

## 2. A customer-hosted style URL

Pass the URL on the constructor:

```js
var map = new bemap.MapLibreMap(ctx, 'map', {
  style: 'https://mptiles-api.benomad.net/styles/style_charte_single.json'
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

## Runtime style swap

```js
// Inline object — applied synchronously, returns `this` for chaining
map.setStyle({ version: 8, sources: {}, layers: [] });

// URL — fetched + resolved asynchronously, still returns `this`
map.setStyle('https://mptiles-api.benomad.net/styles/style_apple.json');
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
