# Horseshoe Toss 🐴

A single-file, mobile-friendly horseshoe-tossing game. No libraries, no build
step, no network calls — just open `index.html` in any modern browser and play.

## Play

Live version (auto-deployed from `main`):
**https://xdsliperz1830-eng.github.io/Slingshotmobile/**

Or open `index.html` directly on your phone (iOS Safari / Android Chrome) or on
desktop. Tap **Play**, then **drag back and release** to toss a horseshoe:

- The **length** of your drag sets the **power** (shown on the power meter).
- The **direction** of your drag aims the throw (the yellow arrow points where
  it will go — opposite the way you pull, like a slingshot).

## Scoring (standard horseshoe rules)

| Result  | When                                   | Points |
|---------|----------------------------------------|--------|
| Ringer  | Horseshoe encircles the stake          | 3      |
| Leaner  | Touching the stake but not ringing it  | 2      |
| Close   | Within ~one shoe-width of the stake    | 1      |

You get **2 throws per round**, then a results overlay shows your round score.
The game tracks your **best round** and **session total** in memory.

## Tweaking

All visuals and difficulty live in two objects at the top of the inline script:

- `COLORS` — every color used by the canvas art.
- `CONFIG` — gravity, max power, stake distance, scoring radii, throws per
  round, spin speed, and more.

## Code layout

The inline `<script>` is organized into clearly commented sections:
config/constants, state, canvas/layout + perspective projection, input
handling, physics/update, rendering, screen management, the main loop, and
utilities.
