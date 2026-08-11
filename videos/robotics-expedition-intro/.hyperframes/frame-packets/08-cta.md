# Frame packet: 08-cta

## Project inputs

- Project: /home/user/MyFirst/videos/robotics-expedition-intro
- Design tokens: /home/user/MyFirst/videos/robotics-expedition-intro/frame.md
- RULES_DIR: /root/.claude/skills/hyperframes-animation/rules

## Assigned storyboard block

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
