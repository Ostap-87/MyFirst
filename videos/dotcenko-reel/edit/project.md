# dotcenko-reel — edit project

## Session 1 — 2026-08-11

**Strategy:** Single continuous talking-head take (32.8s, vertical 720x1280).
No ElevenLabs/Scribe access in this sandbox (network blocked), so transcript
was read by eye from a user-supplied reference copy with burned-in captions
(source_with_subs.mp4), frame-sampled at 2fps. Cross-checked cut points
against the real audio waveform via timeline_view before cutting.

**Decisions:**
- Kept the take whole — no bad takes to select between, only trimmed the
  ~1s of pre-speech silence into a hook treatment.
- Hook (0.0–1.02s): PIL-rendered per-frame zoom+blur pull, 1.28x→1.00x scale
  with ease-out-cubic, 16px→0px Gaussian blur, landing sharp/normal exactly
  as the first word lands. Built as its own tiny render (edit/hook_frames/),
  not a compositor overlay — it replaces the source's own opening frames.
- 4 main segments, each a static punch-in crop (1.00 / 1.04 / 1.08 / 1.12x)
  cut at silence/pause zones identified from the waveform (6.05s, 13.9s,
  23.4s) — classic "invisible cut" texture on a single continuous take.
- Grade: neutral_punch (contrast 1.06 + gentle S-curve, no hue shift) —
  corrective only, skin tones checked at cut boundaries.
- Subtitles: hand-authored master.ass (14 cues), Rubik ExtraBold (real
  Google Fonts TTF pulled via sparse git clone + fontTools instancer to a
  static weight, since Fontsource only ships woff2), white on soft dark
  outline, MarginV=190/1920 safe zone, per-line fscx/fscy pop-in (82%→100%
  over 140ms) + fad(120,90). Cue timing = original source timeline directly
  (segments cover the source 1:1, no time removed, so no offset math needed).
- Loudness normalized to -14 LUFS / -1 dBTP / LRA 11 (two-pass).

**Reasoning log:**
- No mid-word cuts: all 3 internal cut points landed in confirmed low-energy
  waveform zones, verified via timeline_view before AND after render.
- Chose static punch-ins over animated zoompan for the body segments —
  simpler, reliably artifact-free, and the standard technique for adding
  cut energy to a single continuous talking-head take.
- Self-eval: sampled all 3 cut boundaries + hook + final hold frame — no
  visual flash, no audio pop, subtitles never occluded (no overlays used).

**Outstanding:**
- No word-level ASR available in this sandbox — if the user runs this
  skill locally (own machine, unrestricted network), re-transcribing with
  real Scribe timestamps would tighten caption sync further.
- Font: Rubik ExtraBold chosen to match the earlier robotics-expedition
  project's established Cyrillic-safe brand font. Open to swapping per
  user taste.
