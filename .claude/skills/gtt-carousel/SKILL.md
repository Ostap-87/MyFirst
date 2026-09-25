---
name: gtt-carousel
description: Produce a complete GlobalTechTour (GTT) Instagram carousel end-to-end — from an expedition page on globaltechtour.ru to rendered slides, sent to the user, saved as a draft, and committed. Use this whenever the user asks to "make a carousel", "сделай карусель", or names a GTT expedition/tour (by title or /expeditions/<slug> URL) for Instagram content in the /home/user/MyFirst/remotion-video-tools repo. Also use it when asked to redo/fix an existing GTT carousel, or to check which expeditions still need carousels. Covers the fixed visual style "GTT Horizon" (framed photos, blue accent, adaptive corner badge) and the 0.5-credit-per-photo Higgsfield cap the user enforces — do not skip this skill and improvise the pipeline from scratch, the steps and conventions below are load-bearing (wrong image params silently blow the credit budget, wrong paths silently break the site's build).
---

# GTT Instagram Carousel Production

End-to-end pipeline for turning one GlobalTechTour expedition into a finished,
reviewed, saved Instagram carousel in the "GTT Horizon" style. This has been
run by hand ~19 times this way — follow it instead of re-deriving the
approach, because several steps have non-obvious failure modes (see
"Gotchas" at the end).

Read `/home/user/MyFirst/remotion-video-tools/CLAUDE.md` once at the start of
a session that uses this skill — it has the authoritative command list and
project-wide structural rules (brand folders, effect conventions, when to
ask before structural changes). This file only covers the carousel-specific
parts in depth.

## When the user gives you an expedition

They'll usually name a tour ("сделай карусель по <name>") or paste a
`globaltechtour.ru/expeditions/<slug>` URL. If they instead ask "what's
left" — fetch `https://globaltechtour.ru/expeditions` (or the sitemap, see
below) and diff against `content/instagram/globaltechtour/photo/` to see
which ones don't have a folder yet.

If several expeditions are requested at once, it's fine to work through them
one at a time in the same turn — that's exactly how this has been done
before (up to 6 in one session).

## Step 1 — Get the real facts

Never invent companies, cities, prices, or day counts. Fetch the page:

```
WebFetch: https://globaltechtour.ru/expeditions/<slug>
```

**This site is JS-rendered.** WebFetch sometimes only sees the navigation
shell and reports "no expedition data on this page" — that's not a sign the
page is empty, it's a sign WebFetch didn't wait for the JS. When that
happens, retry with Firecrawl instead of concluding the data doesn't exist:

```
mcp__Fireclaw__firecrawl_scrape
  url: https://globaltechtour.ru/expeditions/<slug>
  formats: ["markdown"]
  waitFor: 3000
  maxAge: 0
```

Pull out: title, kicker line (company names), city/day count, per-day
company visits, "что входит", and price. Price is very often "стоимость
уточняется" / "по запросу" — if a real number IS published (it happens,
e.g. "510 000 ₽"), use it verbatim in the CTA slide instead of the generic
line; don't downgrade a real number to "по запросу" and don't invent one
where the site has none.

To find the full list of expeditions (including ones not shown on the
default `/expeditions` listing, which can be filtered to one country), use
the sitemap:

```
Fireclaw scrape https://globaltechtour.ru/sitemap.xml, then
grep -oiE 'https://globaltechtour\.ru/expeditions/[a-z0-9-]+' on the result
```

## Step 2 — Write the carousel JSON

Create `remotion-video-tools/data/carousel-<slug>.json`. Standard shape,
10 slides (9 is fine when the program naturally has fewer clusters —
several past carousels shipped at 8-9 slides, don't force a 5th point that
doesn't exist):

```json
{
  "name": "<slug>",
  "brand": "gtt",
  "footer": "globaltechtour.ru",
  "slides": [
    { "type": "cover", "kicker": "...", "title": "...", "subtitle": "...", "image": "generated/<slug>/cover.png" },
    { "type": "metric", "value": N, "prefix": "", "suffix": "", "compact": false, "label": "...", "source": "...", "image": "generated/<slug>/metric.png" },
    { "type": "point", "index": 1, "title": "...", "text": "...", "image": "generated/<slug>/<name>.png" },
    ... 3-5 point slides, one per program day or day-cluster ...,
    { "type": "point", "index": N, "title": "Не простая экскурсия, а **полноценные переговоры**", "text": "...", "image": "generated/<slug>/negotiations.png" },
    { "type": "point", "index": N+1, "title": "Что входит", "text": "...", "image": "generated/tea-coffee-retail/hotel.png" },
    { "type": "cta", "title": "...", "text": "Оставьте заявку — пришлём точную программу по дням и стоимость участия.", "keyword": "", "handle": "globaltechtour.ru", "image": "generated/<slug>/cta.png" }
  ]
}
```

Notes on content:
- Cover title format: `"**<most recognizable brand>**, <brand>, <brand> — <theme> не в презентации, а **вживую**"` — the `**bold**` spans render in the accent blue via the shared `renderRich()` helper. Use this on cover/cta titles and metric label/source; 1-2 spans per line reads best.
- Point slides map to actual program days/cities. Where the source page groups two companies into one day, put both companies in one point slide rather than inventing a split.
- The "что входит" slide **always reuses** the existing asset
  `generated/tea-coffee-retail/hotel.png` — do not generate a new hotel
  photo, it's a shared cross-carousel asset, not a real place.
- If the tour naturally covers one distinctive extra element that doesn't
  fit a normal point (e.g. a tech-center visit, a roundtable, a closed
  session), it's a judgment call whether to give it its own point slide
  (accurate but +1 image/credit) or fold it into the negotiations slide
  (cheaper, still faithful) — ask the user if it's ambiguous which they'd
  prefer, default to folding it in to keep costs down per the credit rule.

## Step 3 — Generate the photos (0.5-credit cap, hard rule)

The user enforces a hard cap: **no more than 0.5 Higgsfield credits per
photo.** `gpt_image_2` defaults to `resolution: "1k"`, `quality: "low"`,
which is exactly 0.5 credits — this only holds if you leave `resolution`
and `quality` **unset**. Do not pass an explicit resolution/quality "to get
a nicer image" — that silently breaks the budget the user cares about.
Every `generate_image`/`generate_image_batch` call's response echoes the
resolved `resolution`/`quality` under `adjustments` — glance at it to
confirm it's still 1k/low before moving on, especially early in a session.

Batch requests 3-4 at a time via `generate_image_batch` (the account has a
4-concurrent-job ceiling on the starter plan; more than that in one call
partially fails with a rate-limit error, which is recoverable — just submit
the failed ones in the next batch). Poll with `jobs_wait`, then download
each `result_url` straight to
`remotion-video-tools/public/generated/<slug>/<name>.png`.

Prompt pattern that has worked consistently for the "point" photos (real
company visit, logo visible):

> Photorealistic wide shot at `<Company>` `<what it is>` in `<City>`, China,
> day `<N>` of a business expedition. `<scene description>`, business
> delegation of 4-5 people in business casual attire (mixed gender, Russian
> and Chinese) touring the facility, Chinese host gesturing. `<COMPANY>`
> logo clearly visible on wall signage in upper third of frame with plenty
> of empty space below, single clean wordmark, no extra text. Ultra
> realistic photography, bright lighting, 16:9 wide composition,
> documentary business photography style.

For cover/metric/negotiations/cta, drop the logo requirement and keep it
generic (mall interior, airport departure, negotiation room, etc.) — these
don't need a specific company's signage and a real logo would misattribute
a specific company to a generic scene.

## Step 4 — Render

```bash
cd remotion-video-tools
npm run carousel -- --input data/carousel-<slug>.json --no-hint --out out/<slug>
```

`--no-hint` drops the "листай →" badge — GTT carousels have used this
consistently. Check the script cleared old files from a previous partial
run of the same slug (it does this automatically, but if you renamed a
slug mid-session, stray files from the old name won't be cleaned up — use
`--keep` only if you deliberately want to preserve unrelated prior output
in the same folder).

## Step 5 — Send to the user for review

`SendUserFile` all slides from `out/<slug>/` in one call, with a caption
naming the carousel and slide count. If you're doing several carousels in
one turn, send each one right after it renders rather than batching all of
them to the end — the user has asked to see progress as it happens in past
sessions like this.

## Step 6 — Save as a draft

Copy the rendered PNGs into
`content/instagram/globaltechtour/photo/<Human Readable Folder Name>/`
(title case, spaces, no slug dashes — e.g. `China Beauty Anti-Age`, not
`china-beauty-antiage`). Add two files alongside the PNGs:

`meta.json`:
```json
{
  "channel": "instagram",
  "brand": "globaltechtour",
  "slug": "<slug>",
  "type": "carousel",
  "folder": "<Human Readable Folder Name>",
  "publishAt": null,
  "status": "saved",
  "files": ["01-cover.png", "02-metric.png", "...", "10-cta.png"],
  "createdAt": "<ISO 8601 now>",
  "kind": "photo",
  "note": "Готовая карусель, дата публикации ещё не назначена — не добавлена в queue.json. Источник текста: data/carousel-<slug>.json в remotion-video-tools."
}
```

`caption.txt` — a real Instagram caption in Russian: hook line, expedition
name + city/day/company count + full company list, "что входит" summary,
price line (or "Стоимость — по запросу"/"уточняется" matching what the
source page actually said), then 4-5 hashtags (`#GTT #GlobalTechTour` style
plus 2-3 topical ones).

**Do not add the carousel to `content/instagram/globaltechtour/queue.json`**
— "saved" drafts are deliberately unscheduled. Only add to the queue if the
user explicitly gives a publish date.

## Step 7 — Commit and push

```bash
git add remotion-video-tools/data/carousel-<slug>.json \
        remotion-video-tools/public/generated/<slug>/ \
        "content/instagram/globaltechtour/photo/<Human Readable Folder Name>"
git commit -m "Add <Human Readable Name> carousel (<key companies>)

Real facts from globaltechtour.ru/expeditions/<slug>. Saved as draft,
not queued."
git push origin <current branch>
```

Commit as soon as the carousel is done rather than batching multiple
carousels into one commit — if the session gets interrupted mid-batch,
finished carousels shouldn't be sitting uncommitted.

## The GTT Horizon visual style, briefly

Full spec (colors, fonts, corner-badge rules) lives in
`remotion-video-tools/docs/gtt-horizon-style.md` — read it in full if you
need to touch `CarouselSlide.tsx`'s `framed` branch or explain the style to
the user. Quick reference:

| Role | Hex | Use |
|---|---|---|
| primary | `#eeeef2` | scene background |
| accent | `#2563eb` | `**bold**` spans, links, "swipe" badge |
| text | `#17171d` | body text |
| muted | `#6b6b76` | captions, sources |
| surface | `#ffffff` | cards/badges |
| line | `#d5d5dd` | photo-card border |

This is a **locked style** — approved 2026-09-21, changed only on an
explicit new request from the user, not as a "nice idea while I'm in
there". Point-edits (one color, one size, one slide's text) are fine to do
directly per `CLAUDE.md` §5; a different composition concept (`overlay`
instead of `framed`, a new font pairing) is a new style, not a Horizon
edit — ask first.

## Gotchas (read before you hit these)

- **WebFetch "no data" ≠ page is empty.** See Step 1 — several expedition
  pages returned nothing until re-fetched with Firecrawl. Try Firecrawl
  before telling the user the page has no information.
- **Never set `resolution`/`quality` on `gpt_image_2` calls.** Leaving them
  unset is what makes each photo 0.5 credits; setting either explicitly
  (even to what looks like the same value) can resolve differently and
  blow the cap silently. Check `adjustments` in the response.
- **4-concurrent-job ceiling.** Batches of 5+ partially fail with a rate
  limit error on the starter plan — not a real error, just resubmit the
  failed indices in the next batch of ≤4.
- **`generated/tea-coffee-retail/hotel.png` is a shared asset**, reused by
  every carousel's "Что входит" slide. Don't regenerate it per-carousel.
- **Folder naming mismatch is a real failure mode**: the data file uses a
  dash-slug (`carousel-china-beauty-antiage.json`), but the content draft
  folder uses a human-readable Title Case name (`China Beauty Anti-Age`).
  Keep the mapping straight so `meta.json`'s `note` field and the actual
  folder path agree.
