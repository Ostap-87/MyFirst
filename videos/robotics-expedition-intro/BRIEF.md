workflow: product-launch-video
flow: standard

## Intent

Promo/intro video for Global Tech Tour's "Robotics Expedition" program — a business-delegation
tour to China's robotics industry (Beijing → Shanghai → Shenzhen). First of a planned series of
per-program intro videos; this one is the pilot.

Sell, not show-as-is: this is a marketing intro for the tour product, not a literal site tour of
globaltechtour.ru. Capture brand tokens/assets from https://globaltechtour.ru if useful for
palette/type grounding, but the core content (itinerary, companies, stats) comes from the
structured data files below — not from the site's copy.

## Must-haves

- **angle**: itinerary/roadmap reveal — "3 cities, 12 robotics leaders, 5 days" — building
  anticipation city by city, closing on a CTA. Positioning basis: the tour's own
  `positioning_ru` — "Закрытые визиты на производства лидеров робототехники Китая. Прямой доступ
  к компаниям, куда не попасть самостоятельно."
- **length**: 60-90s (sweet spot for this route)
- **destination**: Shorts/Reels → 9:16 vertical

## Customizations

- **Presenter**: faceless — no talking-head footage, no AI avatar. Pure typography / graphics /
  brand-logo cards / kinetic captions.
- **Voiceover**: NONE — decided after discovering local Kokoro TTS has no Russian support and
  HeyGen sign-in isn't available in this session. Silent (no narration): music (BGM) + bold
  kinetic on-screen text/captions carry all information, matching the reference's own
  caption-heavy visual weight. No `SCRIPT.md`; on-screen copy is authored directly per frame in
  `STORYBOARD.md`.
- **Language**: Russian.
- **Style reference** (motion/graphic language only — do not reuse any footage or literal
  branding from it): user supplied a reference clip they like the *style* of
  (`/root/.claude/uploads/00cc9397-7991-5510-b942-c0c9e15897ba/e630d501-Ostap_Dotcenko_20260808_14.24.02.mp4`,
  a talking-head reels clip by another creator). Translate these techniques, not its literal
  look:
  - Bold, heavy kinetic captions, phrase-by-phrase, synced to narration.
  - Oversized stat/number callouts as graphic punctuation (apply to this video's real stats:
    12 companies, 3 cities, 5 days, ~86% of world robot market is China).
  - Small persistent brand watermark/wordmark in a corner (Global Tech Tour mark, not the
    reference's handle).
  - "Screen insert" motif → translated here as company brand-logo cards / device-style graphic
    cards introduced per company.
  - Closing CTA card, punchy pill-button style, in Global Tech Tour's own brand colors (not the
    reference's yellow/black).
  - Dark, moody background — translated to a dark, tech-forward treatment fitting a
    robotics/China-tech story (not a literal copy of the reference's set).
- **Logos**: OK to source official brand marks for the 12 companies from open sources
  (press kits / official sites) for this use.
- **No pricing figures** — this is an intro/trailer, not a sales sheet with numbers.

## Assets

- Tour record (source of truth for itinerary/stats/contact):
  `/workspace/ostap-87/sinotech/src/data/tours.json` → object with `"tour_id": "robotics-expedition"`
- Company records (source of truth for names/descriptions) for ids: galbot, robotera, agibot,
  kepler, droidup, fourier, seer-robotics, ubtech, leju-robotics, limx-dynamics, engineai,
  pudu-robotics — in `/workspace/ostap-87/sinotech/src/data/companies.json` (`companies` array,
  id-indexed).
- Site for brand-token capture (optional grounding only): https://globaltechtour.ru

## Run-shape

Stop at final composition preview for approval before any render. No brief questions needed —
already resolved above.
