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
npm test         # rules, event deck value, hop strategies, click cap, offline, save migration
npm run sim      # balance simulation: event value, hop strategies to the universe, then Act 2 pacing
npm run icons    # redraw the app icons from the goop sprite (needs Playwright; the PNGs are committed)
```

The game is vanilla JS on one canvas, built with Vite. Pushes to `main` run the tests, build, and
deploy `dist/` to GitHub Pages.

## Where things live

- `src/econ.js`, `src/events.js`, `src/prestige.js`, `src/stats.js`, `src/achievements.js`,
  `src/save.js`: the rules. Pure, no DOM, importable from Node.
- `src/legends.js` (feeder legends: 100 and 500 of one feeder), `src/milestones.js` (named checkpoints inside each stage), `src/mood.js` (moods and one-liners),
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

## Service worker runbook

The service worker (`src/sw.js`, built to `dist/sw.js`) controls every page a player has open, so a bad
one is the hardest thing in this repo to take back. If one ever reaches players and breaks loading:

1. Replace `src/sw.js` with a kill switch and deploy it (the browser checks `sw.js` on every visit,
   past the HTTP cache after at most 24 hours, usually at once):

   ```js
   self.addEventListener('install', () => self.skipWaiting());
   self.addEventListener('activate', e => e.waitUntil((async () => {
     for (const k of await caches.keys()) if (k.startsWith('goop-')) await caches.delete(k);
     await self.registration.unregister();
     for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
   })()));
   ```

   The build plugin fills in `__VERSION__` and `__PRECACHE__` only where they appear, so the kill switch
   needs neither. Saves live in localStorage and are not touched.
2. Leave the kill switch deployed for a few weeks, then restore the real worker with the fix.

Updates in normal times: a new build installs in the background and waits. The page offers a "new
version" toast whenever a build is waiting (including one that was already waiting when the page
loaded), and Reload hands over and reloads. Install fetches with `cache: 'reload'`, so a build never
precaches the previous build's page from the HTTP cache.

## Hops, events, perks and legends (phase 4)

- **Hops pay by depth.** Each hop adds a permanent bonus to everything, and the bonuses add up: +10% for a
  hop at the Sun, rising to +50% from stage 12 and +80% from stage 17 on (a Big Bang included). Each depth
  also has a ceiling: hops from the Sun stop adding at +30%, hops from stage 12 at +200%, and from stage 17
  there is none. The bonus is stored on the save (`hopBonus`, schema 5); a save from before keeps the
  +50% per hop it had. The Act 1 card, the landing and the line under the hop button say what a hop will
  pay first, and why a ceiling trims it.
- **Eighteen kinds of event** in the same four buckets. Seven only turn up from stage 7: a comet shower,
  a black-hole hiccup (refunds your last purchase), a wormhole (your two best feeders swap rates for
  30 s), a dark-matter vial (contents unknown), a rival goop (a 15 s click-off: 30 feeds wins), a
  supernova-or-slow-burn choice and the cosmic tax collector. Early on there is also a lunch bell and a
  lab pigeon. Weights are tuned so always collecting is worth within 25% of the phase 3 deck at every stage.
- **Eight more perks** (both acts, about 350 Star Dust): Crystal Pipette (next milestone's name), Event
  Pity, Starter Kit, Quicker Fingers (hand feeds worth 5%, then 10%, more; the limit stays at 25 a second), Mutation Discount, Fourth Wall Mercy, Daily Double, Big Bang Echo.
- **Feeder legends.** At 100 of one feeder it earns a title, works twice as hard, gets a badge and a
  crowd in the scene; at 500, a second title, six times in all, and a few-second set piece of its own.
  The shop row hints at both once you pass 50.
- **Badges**: about eighty, plus two per feeder legend, on a shelf grouped into sections (collapsed on a
  phone). The notebook groups its "Fastest to" times by act; stages a Head Start skips say "skipped".

Hop strategies at 5 clicks a second, from a fresh save to the end of the universe (`npm run sim`, mean
of 3 seeds):

| Strategy | Before (flat +50%) | Now |
|---|---|---|
| 20 hops at the Sun, then the universe | 1 h 28 min | 7 h 26 min |
| 2 hops from stage 12, then the universe | 7 h 57 min | 8 h 02 min |
| 5 hops at the Sun, 2 from stage 12, then the universe | 3 h 15 min | 6 h 54 min |

## Act 2 pacing

Stage 7's door is the Sun (3e13 slop), where the old game ended: that is still the Act 1 card, and
hopping works from there on as before. The universe ends at 1e37 slop with one last purchase, Eat the
Rest, which plays the ending. Star Dust keeps the Act 1 rule (6 for the Sun, 5 more per 10x past it,
so 123 at the end of the universe), and a hop after the ending is a Big Bang worth 100 more.

The Act 1 perks cost 45 Star Dust in all. The Act 2 perks give the rest somewhere to go, 720 in all:
Crumb Hoarder (milestones x2, x3: 15, 40), Hibernation (24 h away: 25), Late Feeders (the four
last feeders x1.5, x2: 60, 150), Head Start II (start at stage 7 after a Big Bang: 80) and Cosmic Memory
(every feeder +5%, then +10%, per Big Bang: 100, 250), plus the phase 4 perks above.

`npm run sim` prints time to each stage for a first run (no perks) and for a run with every perk
maxed (Act 1 only with 5 hops of +50%, then every perk with 3 Big Bangs and 2 hops from stage 12),
clicking once a second with events on. Current numbers (4 seeds):

| # | Stage | Enters at (slop) | First run, no perks | Act 1 perks maxed, 5 hops | All perks maxed, 5 hops, 3 Big Bangs |
|---|---|---|---|---|---|
| 7 | Neighbourhood Watch | 3e13 | 11.8 min | 1.7 min | 0.0 min (Head Start II) |
| 10 | Milky Way Mukbang | 5e18 | 1 h 24 min | 12.0 min | 6.4 min |
| 15 | The Cosmic Web | 1e27 | 11 h 43 min | 1 h 30 min | 50.9 min |
| 20 | The Fourth Wall | 3e36 | 21 h 22 min | 2 h 49 min | 1 h 20 min |
| End | Eat the Rest | 1e37 | 25 h 52 min | 3 h 22 min | 1 h 27 min |

## Trying things in development

`npm run dev` exposes `window.__goop` (stripped from the production build): `__goop.jump(k, f)` jumps to
stage `k` (0-based) at progress `f`, `__goop.cut(t, true)` holds the ending at `t` seconds,
`__goop.spawn(id)` brings on an event, `__goop.own('intern', 500)` sets a feeder count (and celebrates
it), `__goop.piece('truck')` holds a legend's set piece, and
`__goop.mood('hungry', 'text')` forces a mood and a line. `__goop.away(secs)` pretends the tab was away,
`__goop.enterDaily()` / `__goop.finishDaily()` play the daily, and `__goop.share()`, `__goop.bests()`
and `__goop.settings()` open those panels.
