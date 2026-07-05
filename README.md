# 🟢 Goop Tower

A deliberately-stupid 3D incremental game where you slap goop onto a wobbling tower and climb it
from a kitchen counter to "Past God" across 7 zones — or melt into a puddle trying. Every puddle
makes you stronger (losing grants meta-currency), so no run is wasted.

**▶ Play: https://mbaker40.github.io/Goop/**

> Status: **Milestone 0 — "playable ugly."** The game is fully playable as text (click to earn goop,
> buy producers, climb zones, win or melt, then prestige) but not yet goopy — the three.js tower,
> juice, and audio arrive in later milestones. See [`PLAN.md`](./PLAN.md) for the full design and
> [`CLAUDE.md`](./CLAUDE.md) for the dev guide.

## Play locally

```bash
npm install
npm run dev      # Vite dev server
```

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest unit + PLAN §14 balance acceptance tests |
| `npm run sim` | Headless balance-harness report (bot strategies) |
| `npm run build` | Strict typecheck + production build to `dist/` |
| `npm run lint` | ESLint (enforces the `src/sim` purity rule) |

## Deploying to GitHub Pages

This repo ships a workflow (`.github/workflows/deploy.yml`) that builds and publishes to Pages on
every push to `main`. It's a pure static SPA (state lives in `localStorage`; no backend).

**One-time setup:** in the repo, go to **Settings → Pages → Build and deployment → Source** and
select **"GitHub Actions"**. The next push to `main` will deploy to the URL above.

> Note: GitHub Pages on a **private** repository requires a paid GitHub plan. If this repo is
> free + private, make it public (or upgrade) to serve Pages.

## Architecture (one line)

`src/sim` is a pure, deterministic, `three.js`/DOM-free game core; `src/config` holds all tunable
numbers; `src/store.ts` (custom pub/sub) bridges the sim to the DOM UI in `src/ui`; the
`sim-harness/` proves the balance as math. Details in [`CLAUDE.md`](./CLAUDE.md).
