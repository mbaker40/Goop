# The Feed the Goop Worker (not deployed)

This folder is the backend for usernames, leaderboards, profiles, link previews and the daily seed, as
planned in the design doc ("Usernames, leaderboards and shared profiles"). **Nothing here is deployed.**
The game does not call it: the cloud providers in `src/platform/` are off unless a build flag or a URL
flag turns them on, and every route below answers with `stub: true`.

Two pieces are already real, because they are the game's own code:

- **The plausibility check** (`src/plausible.js`) replays a greedy-buyer run with the game's economy,
  event deck, perks and simulator (`../src/sim.js`), from the start the submission claims, at the
  submitted feeding rate. A run more than 35% faster than the best of three simulated seeds, or with more
  paid feeds than the click cap allows, or more caught events than can turn up, is flagged for the
  Suspicious Goop board. Claims longer than 36 hours are refused (they would never place on a
  "fastest" board), and one check simulates at most 56 hours of play: seeds after the first run only
  while the claim still looks too fast. That is a few seconds of CPU in the worst case, so run the check
  from a Queue consumer or `ctx.waitUntil` (store the run as pending, rank it when the check returns)
  rather than inside the request. It is tested in Node from the game's test suite (`test/worker.test.js`), no
  Miniflare needed.
- **The daily rule** behind `GET /daily` is `localDaily()` from `../src/daily.js`, the same function the
  game falls back to offline, so the two always agree.

## Routes

| Route | Does (when deployed) | Today |
|---|---|---|
| `POST /claim` `{ name }` | Reserve a name (3 to 16 characters, the game's `validateName`, a number added if taken). Returns a token, kept beside the save, and a recovery phrase like `salty-pipette-42`. | Validates the name, returns `token: null` |
| `POST /submit` run summary + `Authorization: Bearer <token>` | Plausibility check, store the run in `runs`, return the rank (or the Suspicious Goop board). | Runs the real check, stores nothing |
| `GET /board/:kind?key=` | Top 100 for `sun`, `universe`, `week`, `daily`, `bigbangs`, cached 60 s at the edge. | Empty list |
| `GET /profile/:name` | Badges, lifetime stats and ranks for `#u/name`. | Empty profile, 404 |
| `GET /daily` | Today's `{ date, seed, mutator }`; a row in `daily` can pin a day. | The real date rule |
| `GET /og/:name.png` | A 1200x630 preview image (the share card model in `../src/share.js`). | 501 |

## Deploying it later

1. `cd worker && npm install` (installs Wrangler here only; the game's `package.json` never depends on it).
2. `npx wrangler login`.
3. `npx wrangler d1 create goop` and `npx wrangler kv namespace create GOOP_KV`; paste the two ids
   they print into `wrangler.toml` (the placeholders say where). No account ids go in the repo.
4. `npm run db:init:remote` to create the tables from `schema.sql`.
5. Fill in the stubs in `src/index.js`: hash tokens with SHA-256 (Web Crypto), insert and query D1, rate
   limit per token and per IP in KV, and draw the preview image.
6. `npm run deploy`. Set `ALLOWED_ORIGIN` in `wrangler.toml` to the game's origin.
7. Build the game with `VITE_GOOP_CLOUD=1 VITE_GOOP_API=https://<worker>.workers.dev npm run build` to
   turn on the cloud providers (scores, identity, daily). Or try a deployed Worker against the live game
   with `?cloud=1&api=https://<worker>.workers.dev`.

**CPU time.** A Sun run replays in tens of milliseconds, a run through the universe in a few hundred
(three seeds of a few hours each, in one-second steps). That is over the free plan's 10 ms per request.
Either use the paid plan's limit, or cache the floor in KV by start (hops, perks, Big Bangs) and feeding
rate rounded to a bucket, so each distinct start is simulated once.

The check catches impossible runs, not merely fast ones: the economy runs in the browser, so a board can
never be cheat-proof. Treat the boards as a social feature.
