---
format: 1080x1920
duration: 50s
message: "Закрытые визиты к 12 лидерам робототехники Китая — за 5 дней, в одном туре."
arc: Hook (stat) → Positioning+Route → Beijing → Shanghai → Shenzhen → What's included → Climax stat → CTA
audience: "Российские предприниматели, инвесторы и закупщики, интересующиеся робототехникой и производством в Китае"
music: none
silent_reason: "HeyGen (no credential), Lyria (no API key), and local MusicGen (huggingface.co blocked by sandbox proxy) all unavailable -- confirmed silent, no BGM possible in this environment"
mode: collaborative
---

## Video direction

- **Palette system** (from `frame.md`, `broadside` preset): two registers only, one per frame.
  Default register **dark** (ground `colors.ink-black`, text `colors.cream`, accent
  `colors.fire-orange`) for Frames 1–6. Register flips to **orange** (ground
  `colors.fire-orange`, text `colors.ink-black`) for Frame 7 (the climax stat) to punch the
  rhythm right before the CTA, then Frame 8 (CTA) returns to **dark** so the fire-orange pill
  reads as the one hot accent against black. Never invent a third register or an off-palette hue.
- **Motion grammar + reveal model**: long-tail eases, `power3` default (smooth, no bounce except
  the named spring-pop moments the blueprints call for). No spoken VO exists, so "pace to the
  voiceover" becomes **pace to the on-screen text cue / beat** — nothing appears before its own
  cue's moment; each further piece (a line, a card, a stat) reveals on its own beat, never all at
  once. Reveals spread across the back ~50% of every frame, never front-loaded.
- **Rhythm / held-frame allocation**: Frame 1 and Frame 7 are the two deliberate **held
  beats** — the numbers land, then the frame goes still to let the stat read (a held read beats
  bad motion). Frames 3–5 (city cascades) are the busiest, highest-density frames — that
  density is the point (12 real brands, fast). Frame 8 ends on a genuine held final hold (no
  exit — it's the last frame).
- **Negative list**: no off-brand hues (only ink-black / cream / fire-orange), no purple-blue
  "AI" gradient clichés, no floating bokeh, no browser chrome / cursors except the one
  intentional CTA-click cursor in Frame 8, no front-loaded-then-frozen frames, no aimless
  screensaver drift — every move serves a specific reveal.
- **Persistent brand mark**: "GLOBAL TECH TOUR" wordmark (IBM Plex Mono, `label` role, low
  opacity ~35%) enters bottom-left in Frame 2 and stays mounted through Frame 7 (it resolves
  into the full lockup in Frame 8, so it doesn't duplicate itself there).
- **Caption band**: captions are disabled (no narration — see BRIEF.md), but the bottom ~17% stays
  clear of primary content regardless, for bottom-edge consistency with the persistent wordmark.

## Frame 1 — Hook: China owns robotics

- status: outline
- duration: 5s
- transition_in: cut
- scene: Cold open, black canvas. Giant "86%" count-up fills the frame, locks under a one-line claim.
- blueprint: dataviz-countup (Adapt — hook-counter-burst variant)
- src: compositions/frames/01-hook.html
- focal: stat-86
- roles: stat-86 = cutout (hero number) · robot-icon-cluster = supporting (small glyph accents only, no stock icon packs) · backdrop = background (flat ink-black, no gradient)
- sfx: riser-soft, impact-hit-on-lock

Adapt (from hook-counter-burst): keep the "opens dark/empty → number explodes upward in size,
closing on stillness" signature; drop the 3–5 icon cluster (no stock icons available/needed for
one clean stat) — the number carries the beat alone against the flat register.

Scene 1 (0.0–0.6s): pure `colors.ink-black` field, nothing on screen — the held silence before
the number.
Scene 2 (0.6–3.2s): "86" explodes up from small-and-centered to full `stat-value`/`display` size
in `colors.fire-orange`, counting 0→86 on the same beat (number and scale grow together, one
spring-pop ease); a `%` glyph locks beside it at final size. Centered, ~55% of frame, dead center.
Scene 3 (3.2–5.0s): number holds fully still (deliberate held beat — no breathing, no drift); one
line locks in `colors.cream` `lead` weight directly under it: "мирового рынка роботов — в Китае"
— fades up once, does not move again. Frame holds to the cut.

## Frame 2 — Positioning + route reveal

- status: outline
- duration: 7s
- transition_in: crossfade
- scene: Kinetic type lands the thesis in 2 quick phrases, Global Tech Tour wordmark appears bottom-corner (persists from here on), then a route line draws Beijing → Shanghai → Shenzhen with 3 stat chips punching in beside it — all in one compressed beat.
- blueprint: kinetic-type-beats (Adapt — multi-beat statement build, sub-shape B)
- src: compositions/frames/02-positioning-route.html
- focal: route-line
- roles: positioning-line = cutout (beat 1) · route-map = cutout (beat 2) · stat-chips = supporting · wordmark = supporting (persistent, low-opacity)
- sfx: whoosh-short (route draw), tick x3 (chip land)

Adapt: keep sub-shape B's hard-cut full-screen beat replacement, compressed to 2 text beats + 1
map beat instead of a longer relay (this frame carries 3 distinct pieces of real information in
7s, so pacing is tight by design).

Scene 1 (0.0–2.2s): dark register holds from Frame 1. `colors.cream` `h2` text flash-cuts in
dead-center, no slide/fade — hard cut: "закрытые визиты" (line 1 of real `positioning_ru`).
Scene 2 (2.2–4.0s): hard cut replaces it with the second clause, same treatment: "на производства
лидеров робототехники китая" — as it lands, the "GLOBAL TECH TOUR" wordmark fades up bottom-left
at low opacity and holds (persists from here to Frame 7).
Scene 3 (4.0–6.0s): positioning text clears; a thin `colors.fire-orange` route line self-draws
left→right across the lower-third — three labeled points light up in sequence as the line reaches
them: "ПЕКИН" → "ШАНХАЙ" → "ШЭНЬЧЖЭНЬ" (real `route_cities`, north-to-south per
`route_strategy`). Asymmetric layout, route occupies the lower 40%.
Scene 4 (6.0–7.0s): three stat chips punch in fast left-to-right beside the completed route, one
per ~0.3s: "3 ГОРОДА" · "5 ДНЕЙ" · "12 КОМПАНИЙ" (real `stats`) — spring-pop entrance each, then
hold to the cut.

## Frame 3 — Beijing (Day 1)

- status: outline
- duration: 6s
- transition_in: cut
- scene: City label "ПЕКИН" locks in, two company cards enter fast (brand mark + name only — no
  descriptor sentence, to hold the 50s cut) — reference's screen-insert-card motif as brand cards.
- blueprint: logo-assemble-lockup (Adapt — CTA-push assembly language, product posture)
- src: compositions/frames/03-beijing.html
- focal: city-label-beijing
- roles: city-label-beijing = cutout · card-galbot = cutout · card-robotera = cutout · backdrop = background (flat ink-black)
- sfx: card-pop x2

Adapt: keep the "wordmark cascades into a lockup" signature, but the "wordmark" here is each
company's brand card, not our own — two cards, not a full lockup relay.

Scene 1 (0.0–1.2s): city label "ПЕКИН" hard-cuts in upper-third, `h3` weight, `colors.cream`, with
a thin `colors.fire-orange` underline draw left→right beneath it.
Scene 2 (1.2–3.4s): first brand card (Galbot — typographic name card, bold Barlow 900, no logo image) cascades in from the
left edge with overshoot, settling centered-left, ~35% of frame — cutout on flat ground, no
descriptor text (name-density is the proof at this pace).
Scene 3 (3.4–5.6s): second brand card (Robotera — same typographic treatment) cascades in from the right edge, settling beside
the first — both cards now visible side by side, asymmetric 55/45.
Scene 4 (5.6–6.0s): both cards hold still together — brief settle before the cut.

## Frame 4 — Shanghai (Robot Valley)

- status: outline
- duration: 8s
- transition_in: cut
- scene: City label "ШАНХАЙ" locks in, five company cards cascade fast (waterfall entry, brand
  mark + name only, no descriptor sentences — the density of names IS the proof at this pace).
- blueprint: logo-assemble-lockup (Adapt — waterfall cascade, 5 cards)
- src: compositions/frames/04-shanghai.html
- focal: city-label-shanghai
- roles: city-label-shanghai = cutout · card-agibot = cutout · card-kepler = cutout · card-droidup = cutout · card-fourier = cutout · card-seer = cutout · backdrop = background (flat ink-black)
- sfx: card-pop x5 (accelerating)

Adapt: same cascade signature as Frame 3, extended to 5 cards in a tighter waterfall (each card's
entrance overlaps the previous one's settle, rather than fully sequential) — the accelerating
rhythm itself communicates "more, faster" at this stop.

Scene 1 (0.0–1.0s): city label "ШАНХАЙ" hard-cuts in upper-third, same treatment as Frame 3
(continuity of the city-label device across the film).
Scene 2 (1.0–6.5s): five brand cards (AgiBot, Kepler, DroidUp, Fourier, Seer Robotics — real
names, typographic treatment, no logo images) cascade into a 2-row grid, waterfall entry top-left → bottom-right, each card
landing roughly every ~0.9s with a spring-pop settle; grid density ≥40% of frame, 3 depth layers
(grid, city label, backdrop).
Scene 3 (6.5–8.0s): full grid holds still, settled — a beat to register all five names before the
cut.

## Frame 5 — Shenzhen (finale)

- status: outline
- duration: 8s
- transition_in: cut
- scene: City label "ШЭНЬЧЖЭНЬ" locks in, five company cards cascade at the same fast rhythm as
  Frame 4.
- blueprint: logo-assemble-lockup (Adapt — waterfall cascade, 5 cards; same shape as Frame 4)
- src: compositions/frames/05-shenzhen.html
- focal: city-label-shenzhen
- roles: city-label-shenzhen = cutout · card-ubtech = cutout · card-leju = cutout · card-limx = cutout · card-engineai = cutout · card-pudu = cutout · backdrop = background (flat ink-black)
- sfx: card-pop x5 (accelerating)

Reproduce: identical shot language to Frame 4 (same blueprint instantiation, new content) — the
repetition itself is the rhythm device that says "same proof, third and final city."

Scene 1 (0.0–1.0s): city label "ШЭНЬЧЖЭНЬ" hard-cuts in upper-third, same treatment as Frames 3–4.
Scene 2 (1.0–6.5s): five brand cards (UBTech, Leju Robotics, LimX Dynamics, EngineAI, Pudu
Robotics — real names, typographic treatment, no logo images) cascade into the same 2-row grid pattern as Frame 4.
Scene 3 (6.5–8.0s): grid holds; on the final ~0.5s a small "12" ghost-counter briefly ticks up in
the corner (12 cards seen across Frames 3–5 combined) — subtle, not a full stat card, a bridge
into Frame 7's climax number.

## Frame 6 — What's included

- status: outline
- duration: 4s
- transition_in: crossfade
- scene: Two short phrases punch in rapid-fire, one per beat — trimmed from 4 items to the 2 with
  the highest proof value for a 50s cut.
- blueprint: kinetic-type-beats (Reproduce — staccato montage, 2 beats)
- src: compositions/frames/06-included.html
- focal: phrase-1
- roles: phrase-1 = cutout · phrase-2 = cutout · backdrop = background (flat ink-black)
- sfx: whip-cut x2

Reproduce: the rapid-fire staccato phrase relay, compressed to exactly 2 beats (the blueprint's
own guidance — as many or as few as the line calls for).

Scene 1 (0.0–2.0s): "живые демо гуманоидов" hard-cuts in centered, `h2` weight, `colors.cream`,
holds ~1.6s.
Scene 2 (2.0–4.0s): hard-cut replacement: "переговоры с топ-менеджментом" — same treatment, holds
to the cut.

## Frame 7 — Climax stat

- status: outline
- duration: 5s
- transition_in: cut
- scene: Oversized "12" fills the frame again (visual rhyme with Frame 1's number technique),
  locks under it a closing line.
- blueprint: dataviz-countup (Reproduce — hook-counter-burst variant, register flipped to orange)
- src: compositions/frames/07-climax.html
- focal: stat-12
- roles: stat-12 = cutout (hero number) · backdrop = background (flat fire-orange, register flip)
- sfx: impact-hit-on-lock (heavier than Frame 1's — this is the film's peak)

Reproduce: same shot language as Frame 1 (the deliberate visual rhyme — "we opened on one huge
number, we close the proof section on another") but on the **orange register** (ground
`colors.fire-orange`, text `colors.ink-black`) so the climax reads as the film's brightest,
loudest beat.

Scene 1 (0.0–0.4s): hard cut to full `colors.fire-orange` field, empty — the register flip itself
is a jolt after six frames of dark register.
Scene 2 (0.4–2.8s): "12" explodes up to full size in `colors.ink-black`, counting 0→12 fast on one
spring-pop beat — dead center, ~55% of frame.
Scene 3 (2.8–5.0s): number holds (deliberate held beat, mirrors Frame 1's stillness); two short
lines lock underneath in `colors.ink-black` `lead` weight: "лидеров индустрии." / "один маршрут."
(real `stats.companies`) — fade up once, hold to the cut.

## Frame 8 — CTA

- status: outline
- duration: 7s
- transition_in: crossfade
- scene: Global Tech Tour wordmark centers, "ROBOTICS EXPEDITION" locks under it, then a
  pill-style CTA button in the frame's fire-orange accent with the real contact.
- blueprint: cta-morph-press (Reproduce)
- src: compositions/frames/08-cta.html
- focal: cta-pill
- roles: wordmark-lockup = cutout · cta-pill = cutout · backdrop = background (flat ink-black, register returns to dark)
- sfx: morph-whoosh, click-soft, glow-bloom

Reproduce: the canonical presence → morph → approach → press sequence, register back to **dark**
(ink-black ground) so the fire-orange CTA pill is the one hot element on screen — the film's
final and only literal button-press moment.

Scene 1 (0.0–1.4s): hard cut from Frame 7's orange back to `colors.ink-black`. "GLOBAL TECH TOUR"
wordmark (the same persistent mark from Frame 2, now promoted to full size) holds dead-center,
alive but resting — faint rotational breath only.
Scene 2 (1.4–2.6s): the wordmark CONDENSES at the same center into "ROBOTICS EXPEDITION" locking
underneath it in `label` weight — one continuous transform, not a swap (shared transform-origin).
Scene 3 (2.6–4.0s): a small `colors.fire-orange` pill CTA scales up from the same center, holding
the real contact: "TELEGRAM · @OSTAPDOTCENKO" (real `contact.telegram`). A cursor arrives from
off-stage on a decelerating path, landing a few px off the pill's geometric center (reads human,
not scripted).
Scene 4 (4.0–7.0s): cursor lands a physical click — pill and cursor compress together, then
release with a soft glow-bloom; the pill holds in its clicked state, wordmark + tagline + pill all
static and legible together, to the final frame (no exit — this is the last frame, it holds to
black).
