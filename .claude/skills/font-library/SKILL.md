---
name: font-library
description: Show and pick creative fonts from the local free-font library for GTT/Aura/ostapdotcenko creatives. Use this whenever the user asks about fonts/шрифты — "покажи шрифты", "какой шрифт использовать для...", "найди креативный шрифт", "добавь новый шрифт" — instead of searching the web from scratch or guessing font names from memory. The library and its metadata live in /home/user/MyFirst/font-library (catalog.json + rendered Cyrillic previews per font); this skill exists so font selection is a fast lookup, not a fresh research task each time.
---

# Font library

`/home/user/MyFirst/font-library/` is a curated set of free (OFL-1.1 /
Apache-2.0) creative fonts with Cyrillic support, downloaded from Google
Fonts and rendered as visual specimens on real Russian sample text — so a
font can be chosen by how it actually looks, not by name. Full explanation
of the structure and rationale is in `font-library/README.md` — read it
once if this is your first time touching the library this session.

## Showing fonts to the user

1. Read `font-library/catalog.json`. Filter by `category` or `mood` to
   match what the user is asking for (a "элегантный" ask → editorial/display
   serifs; "техно" → monospace/geometric-sans; etc.) — don't just dump all
   16.
2. One or two candidates → `SendUserFile` the matching
   `font-library/previews/<slug>.png` directly.
3. A shortlist of several → build a filtered contact sheet instead of
   sending many small files:
   ```bash
   node font-library/scripts/build-gallery.mjs <category-or-slug> [more...]
   ```
   This writes `previews/gallery-filtered.png` — send that one file.
4. "Show me everything" → send the existing `previews/gallery.png` as-is
   (only regenerate it if the catalog changed since it was last built).

## Adding a new font

Don't hand-search font foundries — Google Fonts' CSS API gives a direct,
license-clean `.ttf` link for any family:

```bash
curl -s -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=<Family+Name>:wght@400;700&subset=cyrillic,latin" \
  | grep -oE 'https://fonts.gstatic.com/[^)]+\.ttf'
```

Download to `font-library/fonts/<slug>/<Family>-<Weight>.ttf`, add an entry
to `catalog.json` (copy the shape of an existing entry — `slug`, `family`,
`category`, `mood`, `cyrillic`, `weights`, `source`, `source_url`,
`license`), then regenerate previews:

```bash
node font-library/scripts/render-previews.mjs   # previews/<slug>.png
node font-library/scripts/build-gallery.mjs      # previews/gallery.png
```

`render-previews.mjs`/`build-gallery.mjs` use Playwright's chromium at
`/opt/pw-browsers/chromium` and the globally-installed `playwright` package
at `/opt/node22/lib/node_modules/playwright` (there's no local
`node_modules/playwright` in this repo — the scripts resolve it by absolute
path on purpose, don't "fix" that import back to a bare `require('playwright')`
or it'll fail to resolve).

## Gotcha

`@font-face { src: url('file://...') }` only loads when the page itself was
navigated to via `file://` (`page.goto`) — Chromium blocks local font files
from an opaque `about:blank`/`data:` origin, which is why both scripts write
a temp HTML file to disk and `page.goto` it rather than using
`page.setContent`. If you ever see every font in a rendered preview
collapse to the same generic serif, this is why — check the script still
navigates to a real `file://` URL instead of `setContent`.
