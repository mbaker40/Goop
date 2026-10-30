# Feed the Goop for desktop (Steam): scaffolding

An Electron shell around the same game the web plays. Not built by CI and not shipped: this is where the
Steam phase (phase 5 in the design doc) starts. Electron and steamworks.js are listed in this folder's
`package.json` only; the game's own `package.json` never depends on them.

## Run it

```sh
npm install && npm run build      # at the repo root: builds dist/, which the shell loads
cd desktop
npm install                       # Electron (and steamworks.js, optional)
npm start                         # plays without Steam: saves go to files, achievements and boards are no-ops
GOOP_STEAM=1 npm start            # with Steam running: initialises steamworks.js (app id 480, Valve's test app, unless GOOP_STEAM_APP_ID is set)
```

## How it fits

- `main.js` opens `../dist/index.html` in a window and answers the bridge: saves are one file per
  storage key in Electron's `userData/saves` folder, written atomically. Steam Auto-Cloud syncs that
  folder with no code (set it up in the Steamworks partner site).
- `preload.js` exposes `window.goopDesktop` (read and write a save, unlock an achievement, post a score)
  and sets `window.goopHost = 'steam'`.
- `src/platform/index.js` sees the bridge and picks `storage.steam.js`, `achievements.steam.js` and
  `scores.steam.js`. Each wraps the local provider and calls the bridge; with no bridge they behave like
  the web build, and they are unit tested with a fake bridge in `test/platform.test.js`.

## Where steamworks.js plugs in

- `initSteam()` in `main.js`: `require('steamworks.js').init(appId)`.
- Achievements: `client.achievement.activate(id)` in the `goop:achievement` handler. Badge ids in
  `src/achievements.js` are permanent and map one to one onto Steam achievement API names.
- Leaderboards: the `goop:score` handler, using the board names in `src/platform/scores.steam.js`.
  Once the Worker exists it stays the source of truth and Steam's boards mirror it.

## Not here yet

Gamepad support (feeding and the shop for Steam Deck Verified), packaging (electron-builder or Forge),
store capsules rendered from the game, and the Steamworks account itself.
