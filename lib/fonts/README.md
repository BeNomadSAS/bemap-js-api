# Default-style fonts (MapLibre glyphs)

The bundled default style (`bemap.defaultStyle`, the BeNomad charte 2026) needs
**two fontstacks**: `Noto Sans Regular` and `Noto Sans Bold`.

## Where these fonts come from

The glyph `.pbf` ranges are **Google's Noto Sans**, distributed under the
**SIL Open Font License 1.1** (the licence text ships here as `OFL.txt` and is
copied into `dist/fonts/`). They're the same two stacks the charte style's
`text-font` declarations request.

`lib/` is gitignored, so the `.pbf` files are **not in source control**. They
are reproducible via:

```
npm run fonts      # or:  grunt fonts   (→ tools/fetch-fonts.js)
```

which mirrors the full Noto Sans Regular/Bold range set (256 ranges each, the
Basic Multilingual Plane) from the public MapLibre demo glyph server into this
folder. Set `FONT_BASE_URL` to mirror from your own host instead. Run it once
after cloning (or in CI), then `grunt` copies them to `dist/fonts/`.

## Layout

Folder names keep their spaces (MapLibre URL-encodes them as `%20` at request
time, which static servers map back to the space):

```
lib/fonts/
  Noto Sans Regular/
    0-255.pbf
    256-511.pbf
    ...            (one .pbf per Unicode range you need; 0-255 covers Latin)
  Noto Sans Bold/
    0-255.pbf
    256-511.pbf
    ...
```

## How they get delivered

`npx grunt` copies `lib/fonts/**/*.pbf` → `dist/fonts/**`. Any app that vendors
the whole `dist/` (e.g. evmove5 copies it to `/bemap-js-api/`) therefore serves
the fonts at `…/bemap-js-api/fonts/{fontstack}/{range}.pbf`.

## How the style finds them

At load, `bemap.TilesStyle._assetsBaseUrl` detects the directory
`bemap-js-api(.min).js` was loaded from, and the default style's `glyphs` is set
to `<that dir>/fonts/{fontstack}/{range}.pbf` automatically. Precedence:

1. `new bemap.Context({ glyphsUrl: '…/{fontstack}/{range}.pbf' })` — explicit override
2. the bundled fonts above (auto-detected) — **the default**
3. the public `demotiles.maplibre.org` server — fallback only when the bundle
   directory can't be detected

> So: once these `.pbf` files are present and you rebuild, MapLibre labels render
> from your own host with no third-party dependency. **Until the files are here,
> `dist/fonts/` is empty and the auto-detected glyphs URL will 404** — drop the
> fonts in, then `npx grunt`.
