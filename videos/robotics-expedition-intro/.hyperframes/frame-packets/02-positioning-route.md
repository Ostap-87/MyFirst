# Frame packet: 02-positioning-route

## Project inputs

- Project: /home/user/MyFirst/videos/robotics-expedition-intro
- Design tokens: /home/user/MyFirst/videos/robotics-expedition-intro/frame.md
- RULES_DIR: /root/.claude/skills/hyperframes-animation/rules

## Assigned storyboard block

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
