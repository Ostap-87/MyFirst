# Frame packet: 01-hook

## Project inputs

- Project: /home/user/MyFirst/videos/robotics-expedition-intro
- Design tokens: /home/user/MyFirst/videos/robotics-expedition-intro/frame.md
- RULES_DIR: /root/.claude/skills/hyperframes-animation/rules

## Assigned storyboard block

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
