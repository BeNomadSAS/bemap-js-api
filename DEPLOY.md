# Running & deploying BeMap JS API

Three questions, three short answers.

---

## 1 · Run it on my machine

**You downloaded the package (zip / public repo):**

| Platform | Do this |
|---|---|
| Windows | double-click **`start.bat`** |
| macOS / Linux | run **`./start.sh`** |
| VS Code (any OS) | right-click `examples/index.html` → **Open with Live Server** |
| Anything with Node | `npx http-server -p 8080` |
| Anything with Python | `python -m http.server 8080` |

Then open **<http://localhost:8080/examples/>**.

**You cloned the source repo (has `package.json` / `Gruntfile.js`):**

```bash
npm install
npm start          # = npx grunt dev → build + serve + open + LIVE-RELOAD on changes
```

> With `npm start` / `npx grunt dev` running, editing `examples/` refreshes the page
> automatically; editing `src/` rebuilds the bundle, then refreshes. (`grunt` alone
> only builds — it does not serve or reload.)

> ⚠️ **Never** just double-click `index.html`. Opened as `file://`, browsers block the
> `fetch()` the doc pages use, the Service-Worker tile cache, and MapLibre map tiles.
> A local server (any of the above) fixes it — `localhost` is a secure context.

---

## 2 · Put it online

The dashboard (and your own app) is **static files** — host them anywhere: GitHub Pages, Netlify, Vercel, S3, your own web server. Just serve the folder over HTTPS.

### GitHub Pages (one command + push)

```bash
npx grunt github                 # build + copy the whole site into ./github/
cd github
git add -A && git commit -m "publish" && git push
```

Then in that repo: **Settings → Pages →** serve from the branch root. Done — the root URL
opens the dashboard (a redirect + `.nojekyll` are published for you).

### Any other static host

Upload the contents of `dist/`, `examples/`, `docs/`, and `lib/` (keep the relative
layout). Point visitors at `…/examples/`.

---

## 3 · Make the maps actually load (the one rule: CORS)

The page, navigation, docs, and the test suite work on any host immediately. The **live
maps and service calls** need two things:

1. **Credentials** — each visitor enters their BeMap login via the **Credentials** button
   (top-right of the dashboard). Nothing is bundled. Credentials are stored **per
   environment**, so Beta / Preprod / Prod can use different accounts.

2. **CORS allow-list** — your **BeMap API host** (`bemap-*.benomad.com`) **and** your
   **tiles host** (`mptiles-api-*.benomad.net`) must allow your site's origin
   (e.g. `https://your-name.github.io`). This is a **server / Worker setting**, not a
   library setting. Until the origin is allow-listed, the browser blocks the requests
   and maps stay blank.

> In your own production app you usually serve from your own domain and add that one
> origin to the allow-list once.

---

## Cheat sheet

| I want to… | Command / action |
|---|---|
| See the demo (downloaded) | double-click `start.bat` / `start.sh` |
| See the demo (source repo) | `npm start` |
| Run the test suite | open `test-runner.html`, or `npm test` |
| Build the library | `npm run build` (`npx grunt`) |
| Publish to GitHub Pages | `npx grunt github` → commit & push `github/` |
