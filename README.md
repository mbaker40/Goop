# Feed the Goop

You are the scientist. It is hungry. Click the goop to feed it, spend the slop it burps up, and see
how far this goes: six stages from a lab table to eating the Sun.

**▶ Play: https://mbaker40.github.io/Goop/**

## Develop

```sh
npm install      # once
npm run dev      # play locally with hot reload
npm run build    # static build in dist/
npm test         # rules, event deck value, click cap, offline, save migration
npm run sim      # balance simulation: time to the Sun with and without events
```

The game is vanilla JS on one canvas, built with Vite. Pushes to `main` run the tests, build, and
deploy `dist/` to GitHub Pages.

## Where things live

- `src/econ.js`, `src/events.js`, `src/prestige.js`, `src/stats.js`, `src/achievements.js`,
  `src/save.js`: the rules. Pure, no DOM, importable from Node.
- `src/scenes/`: one file per stage diorama. `src/sprites/`: the scientist, the goop, snacks, event props.
- `src/render.js`, `src/ui.js`, `src/audio.js`, `src/main.js`: the browser game.
- `src/platform/`: storage, achievements, scores and identity adapters. Local providers only for now.
