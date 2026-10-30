# Feed the Goop

You are the scientist. It is hungry. Click the goop to feed it, spend the slop it burps up, and see
how far this goes: twenty stages from a lab table to eating the Sun (Act 1), and then the rest of the
universe (Act 2).

**▶ Play: https://mbaker40.github.io/Goop/**

## Develop

```sh
npm install      # once
npm run dev      # play locally with hot reload
npm run build    # static build in dist/
npm test         # rules, event deck value, click cap, offline, save migration
npm run sim      # balance simulation: time to the Sun with and without events, then Act 2 pacing to the end
```

The game is vanilla JS on one canvas, built with Vite. Pushes to `main` run the tests, build, and
deploy `dist/` to GitHub Pages.

## Where things live

- `src/econ.js`, `src/events.js`, `src/prestige.js`, `src/stats.js`, `src/achievements.js`,
  `src/save.js`: the rules. Pure, no DOM, importable from Node.
- `src/milestones.js` (named checkpoints inside each stage), `src/mood.js` (moods and one-liners),
  `src/fourthwall.js` (what stage 20 eats of the interface), `src/cutscene.js` (the ending's timeline),
  `src/fmt.js` (number names and goop units): more rules, also pure and tested.
- `src/scenes/`: one file per stage diorama (twenty). `src/sprites/`: the scientist, the goop, snacks,
  event props, and the Act 2 cast (the Judgmental Toaster, the goop scientist, the tiny human).
- `src/render.js`, `src/ui.js`, `src/audio.js`, `src/main.js`, `src/ending.js`: the browser game.
- `src/platform/`: storage, achievements, scores and identity adapters. Local providers only for now.

## Act 2 pacing

Stage 7's door is the Sun (3e13 slop), where the old game ended: that is still the Act 1 card, and
hopping works from there on as before. The universe ends at 1e37 slop with one last purchase, Eat the
Rest, which plays the ending. Star Dust keeps the Act 1 rule (6 for the Sun, 5 more per 10x past it,
so 123 at the end of the universe), and a hop after the ending is a Big Bang worth 100 more.

`npm run sim` prints time to each stage for a first run (no perks) and for a run with every perk
maxed after five hops, both clicking once a second with events on. Current numbers (4 seeds):

| # | Stage | Enters at (slop) | First run, no perks | All perks maxed, 5 hops |
|---|---|---|---|---|
| 7 | Neighbourhood Watch | 3e13 | 12.1 min | 1.5 min |
| 10 | Milky Way Mukbang | 5e18 | 1 h 26 min | 11.2 min |
| 15 | The Cosmic Web | 1e27 | 10 h 58 min | 1 h 24 min |
| 20 | The Fourth Wall | 3e36 | 20 h 38 min | 2 h 36 min |
| End | Eat the Rest | 1e37 | 24 h 24 min | 3 h 05 min |

## Trying things in development

`npm run dev` exposes `window.__goop` (stripped from the production build): `__goop.jump(k, f)` jumps to
stage `k` (0-based) at progress `f`, `__goop.cut(t, true)` holds the ending at `t` seconds, and
`__goop.mood('hungry', 'text')` forces a mood and a line.
