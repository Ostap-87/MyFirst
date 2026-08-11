---
format: 1080x1920
duration: 82s
message: "Закрытые визиты к 12 лидерам робототехники Китая — за 5 дней, в одном туре."
arc: Hook (stat) → Positioning → Route reveal → Beijing → Shanghai → Shenzhen → What's included → Climax stat → CTA
audience: "Российские предприниматели, инвесторы и закупщики, интересующиеся робототехникой и производством в Китае"
music: driving instrumental, tech-forward, mid-tempo build, no lyrics — cut-driven pacing (no narration)
mode: collaborative
---

## Frame 1 — Hook: China owns robotics

- status: outline
- duration: 7s
- transition_in: cut
- scene: Cold open, black canvas. Giant "86%" count-up fills the frame. Below it, the claim lands.
- blueprint: dataviz-countup

No narration — the stat IS the hook. On-screen: oversized "86%" counts up from 0 (matches the
reference's oversized-number-as-punctuation technique), then a line locks under it: "мирового
рынка роботов — в Китае" (source: tours.json `market_note_ru`, real figure — do not alter).

## Frame 2 — Positioning

- status: outline
- duration: 7s
- transition_in: crossfade
- scene: Kinetic type, phrase by phrase, dark canvas. Global Tech Tour wordmark appears bottom-corner and persists from here on (the reference's persistent-handle technique, translated to our brand).
- blueprint: kinetic-type-beats

On-screen text cues (phrase-by-phrase, matching real positioning copy from tours.json
`positioning_ru`): "Закрытые визиты" → "на производства лидеров робототехники Китая" → "Прямой
доступ. / Куда не попасть самостоятельно." Small persistent mark: "GLOBAL TECH TOUR" bottom-left,
low-opacity, stays through remaining frames.

## Frame 3 — Route reveal

- status: outline
- duration: 8s
- transition_in: crossfade
- scene: A route line draws itself north to south — Beijing → Shanghai → Shenzhen — with three stat chips punching in beside it.
- blueprint: spatial-pan-stations

On-screen: "ROBOTICS EXPEDITION" title card, then the route draws (real cities from tours.json
`route_cities`). Three stat chips land in sequence: "3 ГОРОДА" · "5 ДНЕЙ" · "12 КОМПАНИЙ" (real
`stats` object — cities:3, days:5, companies:12).

## Frame 4 — Beijing (Day 1)

- status: outline
- duration: 9s
- transition_in: cut
- scene: City label "ПЕКИН · ДЕНЬ 1" locks in, then two company cards enter in sequence (logo mark + one-line real descriptor each), reference's screen-insert-card motif translated to brand-card motif.
- blueprint: logo-assemble-lockup

Real content only (tours.json itinerary day 1 + companies.json): Galbot — "колёсные гуманоиды,
демо на CCTV 2026"; Robotera — "человекоподобный робот L7, 55 степеней свободы". Area note:
"Хайдянь / PKU Lab".

## Frame 5 — Shanghai (Days 2–3, Robot Valley)

- status: outline
- duration: 12s
- transition_in: cut
- scene: City label "ШАНХАЙ · ROBOT VALLEY" locks in, five company cards cascade faster than Frame 4 (more names, same card language, tighter rhythm) — waterfall entry.
- blueprint: logo-assemble-lockup

Real content only: AgiBot — "рекорд Гиннесса по дальности ходьбы гуманоида"; Kepler — "работает на
конвейере SAIC-GM"; DroidUp — "3-е место на первом в мире полумарафоне роботов"; Fourier —
"2000+ больниц в 40+ странах"; Seer Robotics — "AMR-контроллеры для складской логистики". Area
note: "Zhangjiang Hi-Tech Park".

## Frame 6 — Shenzhen (Days 4–5, finale)

- status: outline
- duration: 12s
- transition_in: cut
- scene: City label "ШЭНЬЧЖЭНЬ · ФИНАЛ" locks in, five company cards cascade, same rhythm as Frame 5.
- blueprint: logo-assemble-lockup

Real content only: UBTech — "крупнейший производитель гуманоидов в Китае, HKEX"; Leju Robotics —
"робот Kuavo нёс олимпийский огонь в -20°C"; LimX Dynamics — "pre-IPO раунд $200M в июле 2026";
EngineAI — "первое сальто среди гуманоидов, дек. 2024"; Pudu Robotics — "поставки в 60+ стран".

## Frame 7 — What's included

- status: outline
- duration: 8s
- transition_in: crossfade
- scene: Four short phrases punch in rapid-fire, one per beat, each with a small icon-like glyph.
- blueprint: kinetic-type-beats

Real content only (tours.json `includes`): "Живые демо гуманоидов" · "Переговоры с
топ-менеджментом" · "Техническая экспертиза" · "Перевод и сопровождение".

## Frame 8 — Climax stat

- status: outline
- duration: 7s
- transition_in: cut
- scene: Oversized "12" fills the frame again (echoes Frame 1's number technique — the film's visual rhyme), locks under it a closing line.
- blueprint: dataviz-countup

On-screen: giant "12" → "лидеров индустрии. / Один маршрут." (real `stats.companies`, no invented
number).

## Frame 9 — CTA

- status: outline
- duration: 12s
- transition_in: crossfade
- scene: Global Tech Tour wordmark centers, "ROBOTICS EXPEDITION" locks under it, then a pill-style CTA button in the frame's fire-orange accent with the real contact.
- blueprint: cta-morph-press

Real content only (tours.json `contact`): "Global Tech Tour" · "Robotics Expedition" · CTA pill:
"Telegram · @ostapdotcenko". This is the reference's CTA-pill technique, in our own brand color
(fire-orange from the `broadside` preset), not the reference's yellow/black.
