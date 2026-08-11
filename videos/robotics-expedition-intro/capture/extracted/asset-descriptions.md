# Asset inventory

No live site capture was possible (network blocked `globaltechtour.ru` in this environment) — this
is the no-capture path. No screenshots or DOM assets were captured.

UPDATE (Step 5 prep): real brand logo files are NOT reachable from this sandbox — the
environment's outbound proxy allowlists only npm/pypi/git-clone traffic; every logo source
(svgl.app, simpleicons CDN, GitHub avatars, favicons) returns a hard 403 at the proxy, not a
licensing issue. Confirmed via `$HTTPS_PROXY/__agentproxy/status` (`recentRelayFailures`) and
direct `media-use resolve --type logo` misses on well-known brands (even "github" itself fails).

Fallback (told to the user, not silent): the 12 companies render as TYPOGRAPHIC wordmark cards
(bold Barlow 900 name, no image asset) — this matches the `broadside` preset's own signature
("massive Barlow... treated as graphic primitive"), not a downgrade from the plan.

- Company names for ids: galbot, robotera, agibot, kepler, droidup, fourier, seer-robotics,
  ubtech, leju-robotics, limx-dynamics, engineai, pudu-robotics — set in type, no logo files.
- No Global Tech Tour logo file was supplied and none could be captured — the wordmark on screen
  will be typographic (the brand name set in the chosen frame preset's type), not an image logo.
- Background/BGM: instrumental, driving, tech-forward mood track resolved via `/media-use` — no
  narration to match, so pacing is cut-driven.
