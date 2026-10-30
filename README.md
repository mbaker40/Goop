# Feed the Goop

You are the scientist. It is hungry. Click the goop to feed it, spend the slop it burps up, and see
how far this goes: twenty stages from a lab table, past the Sun (the end of Act 1), to the edge of
the universe.

**▶ Play: https://mbaker40.github.io/Goop/**

## Develop

```sh
npm install      # once
npm run dev      # play locally with hot reload
npm run build    # static build in dist/
npm test         # rules, event deck value, click cap, offline, save migration
npm run sim      # balance simulation: time to the Sun with and without events, then Act 2 pacing to the end
npm run icons    # redraw the app icons from the goop sprite (needs Playwright; the PNGs are committed)
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
- `src/daily.js` (the daily goop: seed, mutators, its save slot), `src/away.js` (the away card and the
  burp), `src/share.js` (what the share card says): pure and tested. `src/sharecard.js` draws the card,
  `src/panels.js` the settings drawer, name chooser, personal bests and daily sheet, `src/pwa.js` and
  `src/sw.js` install and update, `src/haptics.js` the buzz.
- `src/platform/`: storage, achievements, scores, identity and daily adapters. The default build uses
  the local providers and works fully offline. Cloud providers (`*.cloud.js`, the Worker's API) switch
  on only with a build flag (`VITE_GOOP_CLOUD=1` and `VITE_GOOP_API=https://…`) or `?cloud=1&api=…`
  in the URL; Steam providers (`*.steam.js`) only inside the desktop wrapper. See `src/platform/index.js`.
- `worker/`: the leaderboard Worker for Cloudflare. Scaffolding, not deployed (see `worker/README.md`).
  Its plausibility check (`worker/src/plausible.js`) replays a greedy buyer with the game's own rules and
  is tested from the main suite.
- `desktop/`: an Electron wrapper for a later Steam build. Scaffolding, not built by CI (see
  `desktop/README.md`). Electron and steamworks.js live only in `desktop/package.json`.

## Daily goop

One shared run a day: the seed comes from the UTC date, and so does the twist, one of seven mutators
(Feeders Cost Double, Hands On, Quiet Lab, Rush Hour, Inspector Hour, Light Sleeper, Gambler's Night).
The goal is the Sun, as fast as possible. The daily has its own save slot, so the main goop keeps
eating meanwhile and is paid for the time away when you go back. Retries are allowed and reshuffle the
events. Daily bests are kept per date; "time to beat" is your own best until online boards arrive.

## Coming back

After more than a minute away, a card says what the goop ate (with a joke for the scene it is in) and
offers one tap to watch the goop burp, which doubles that payout once per return. The first minute away
pays full rate and the rest half rate, with no cliff at 60 s; a boost or an inspector freeze running when
you left is paid for the part of the absence it covered.

## Install, settings, sharing

- The game is an installable web app: a manifest, icons drawn from the goop, and a service worker that
  precaches the build so it plays offline. A new deploy never swaps code under a running game: a small
  "new version" toast offers Reload, and the next visit picks it up anyway.
- Settings (the button at the top): sound, haptics (a buzz on catches and new stages, where the device
  can), number style (1.50M or 1.50e6), a motion override, your display name, Copy save, Load save,
  Start over, and the save's schema and backup state.
- Share (from the Act 1 card, the landing and the trophy shelf) draws a picture of your goop at its
  furthest stage, with your name, best times, hops and badges. Copy it, or share it straight to an app.
- Bests: your own records on the five boards the online version will have (fastest to the Sun, fastest
  to the universe, most slop this week, today's daily, most Big Bangs). They are labelled as your own
  until the Worker exists; a server-backed list drops into the same panel.

## Act 2 pacing

Stage 7's door is the Sun (3e13 slop), where the old game ended: that is still the Act 1 card, and
hopping works from there on as before. The universe ends at 1e37 slop with one last purchase, Eat the
Rest, which plays the ending. Star Dust keeps the Act 1 rule (6 for the Sun, 5 more per 10x past it,
so 123 at the end of the universe), and a hop after the ending is a Big Bang worth 100 more.

The Act 1 perks cost 45 Star Dust in all. The Act 2 perks give the rest somewhere to go, 720 in all:
Crumb Hoarder (milestones x2, x3: 15, 40), Hibernation (24 h away: 25), Late Feeders (the four
last feeders x1.5, x2: 60, 150), Head Start II (start at stage 7 after a Big Bang: 80) and Cosmic Memory
(every feeder +5%, then +10%, per Big Bang: 100, 250).

`npm run sim` prints time to each stage for a first run (no perks) and for a run with every perk
maxed (Act 1 only, then every perk after three Big Bangs), clicking once a second with events on.
Current numbers (4 seeds):

| # | Stage | Enters at (slop) | First run, no perks | Act 1 perks maxed, 5 hops | All perks maxed, 5 hops, 3 Big Bangs |
|---|---|---|---|---|---|
| 7 | Neighbourhood Watch | 3e13 | 12.1 min | 1.5 min | 0.0 min (Head Start II) |
| 10 | Milky Way Mukbang | 5e18 | 1 h 26 min | 11.2 min | 7.7 min |
| 15 | The Cosmic Web | 1e27 | 10 h 58 min | 1 h 24 min | 1 h 01 min |
| 20 | The Fourth Wall | 3e36 | 20 h 38 min | 2 h 36 min | 1 h 38 min |
| End | Eat the Rest | 1e37 | 24 h 24 min | 3 h 05 min | 1 h 46 min |

## Trying things in development

`npm run dev` exposes `window.__goop` (stripped from the production build): `__goop.jump(k, f)` jumps to
stage `k` (0-based) at progress `f`, `__goop.cut(t, true)` holds the ending at `t` seconds, and
`__goop.mood('hungry', 'text')` forces a mood and a line. `__goop.away(secs)` pretends the tab was away,
`__goop.enterDaily()` / `__goop.finishDaily()` play the daily, and `__goop.share()`, `__goop.bests()`
and `__goop.settings()` open those panels.
