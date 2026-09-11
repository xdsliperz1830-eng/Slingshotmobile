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
- A **dotted arc** previews exactly where the shoe will land, wind included.

## Wind

Each round rolls a light crosswind, shown in the HUD (`wind → ##`). It nudges
the shoe sideways during flight, so aim into it — the trajectory preview
already accounts for the drift, so it shifts *where* you aim rather than making
the game a guess.

## Sound

Throw, landing, and ringer sounds are synthesized with WebAudio — no audio
files. Tap the speaker in the HUD corner to mute. Devices that support it also
get a short vibration on landing.

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
  round, spin speed, wind strength, trajectory preview, sound and haptics.

## Code layout

The inline `<script>` is organized into clearly commented sections:
config/constants, state, canvas/layout + perspective projection, sound, input
handling, physics/update, rendering, screen management, the main loop, and
utilities.

`stepShoe()` is the single source of truth for flight: both the live throw and
the dotted aim preview run through it, so the preview can never disagree with
what actually happens.

## Verifying

`index.html` has no build step and no test framework, so the game logic is
checked by driving the **real** event handlers and physics against a stubbed
DOM/canvas. No dependencies — just Node:

```bash
node tools/verify.js
```

42 checks cover boot, the three screens, input, the trajectory preview
(asserted to match the actual flight exactly), all four scoring tiers, wind,
round flow, the mute toggle, and responsive/landscape layout.

Note that this covers logic, physics, and state flow — canvas drawing calls are
stubbed, so it does not confirm visual rendering or touch feel on a real
device.
