# GOOP TOWER - Master Design & Development Plan

> A deliberately stupid 3D incremental game where you stack a wobbling tower of sentient goop
> from a kitchen counter past the edge of the universe - or melt into a puddle trying.
>
> This document is the single source of truth for all future Claude sessions developing this game.
> Read it fully before writing code. Section 15 explains how to set up CLAUDE.md and agent tooling.

---

## 1. Vision & Pillars

**Elevator pitch:** Cookie Clicker meets Jenga meets a lava lamp. You slap goop onto a physically
simulated, jiggling 3D tower. The tower IS the score - number scaling is *visible*, not just a
counter. If you goop too slowly, the tower melts from the bottom and you lose everything except
meta-progression. Beat the final zone ("Past God") in a run and you unlock Endless Mode, where
exponential growth continues toward a near-impossible score cap.

**Design pillars (test every feature against these):**
1. **The number must be felt, not read.** Every order of magnitude of growth should change what
   the player *sees*: tower scale, camera distance, environment, particle density, audio pitch.
2. **Stupid on purpose.** Flavor text, upgrade names, and events should make a streamer laugh
   out loud. If an upgrade name could appear in a serious game, rename it.
3. **Tension without punishment-spam.** The melt threat creates stakes; meta-progression
   (Goop Essence) ensures no run is wasted.
4. **Juice over fidelity.** Goopy shaders, squash-and-stretch, screen shake, chromatic pops.
   NOT low-poly minimalism - we want wet, glossy, jiggly maximalism.
5. **Streamable.** Big readable moments, chat-friendly chaos events, shareable win screens.

**Target audience:** Streamers (itswill-tier silliness) and their chats; incremental-game fans.

**Target run length:** First win (beat final zone) in **45-60 minutes** for a skilled/attentive
player on a second-or-third prestige. First-ever run is *expected to fail* around zone 3-4.

---

## 2. Core Loop

```
CLICK/TAP tower → goop splats on → tower grows & jiggles
      ↓
Earn GOOP (currency) from clicks + Goop-Per-Second (GPS) from workers
      ↓
Buy upgrades & producers → GPS grows exponentially
      ↓
MELT RATE rises with height/zone → tower loses mass per second
      ↓
IF growth > melt: climb zones → beat Zone 7 → WIN → Endless Mode unlocked
IF melt > growth for too long: tower collapses → PUDDLE SCREEN → prestige
```

**Attention model (per user requirement "somewhat active"):**
- Passive GPS alone can sustain the tower through mid-zones if upgrades are well-chosen.
- **Active mechanics (clicking, event responses, combo bar) grant multiplicative bonuses**
  required for fast climbs and Endless exponential play. AFK = slow decay into melt danger.
- Late-game automation ("Unionized Goop Workers", "Goop Autopilot") reduces required APM but
  never fully removes the melt threat.

### 2.1 The Click
- Tap/click anywhere on the tower → a goop blob launches from off-screen and SPLATS on,
  adding `clickPower` goop with squash-and-stretch impact, ripple through the metaball surface,
  and a pitched squelch.
- **Combo bar ("Goop Momentum"):** consecutive clicks within 0.8s build a meter (max ×3
  click multiplier at full). Decays when idle. Fuels active play without raw CPS requirements.
- **Golden Goobers:** rare shimmering blobs orbit the tower (~every 90-180s, Cookie Clicker
  golden-cookie style). Clicking one grants a random buff (see §8 Chaos Events, positive pool).

---

## 3. Zones (Environment Progression)

The tower climbs through 7 zones. Zone transitions are the game's biggest dopamine moments:
camera pull-back, environment crossfade, ceiling-shatter particle burst, musical sting.
Zone is determined by **tower height**, which is a log-scale function of lifetime run goop
(see §5 scaling).

| # | Zone | Height range | Environment & set dressing | Melt flavor |
|---|------|-------------|----------------------------|-------------|
| 1 | The Kitchen Counter | 0 - 3 m | Tile counter, giant salt shaker, judgmental toaster | Warm stove air |
| 2 | Through the Ceiling | 3 - 30 m | Splintered ceiling, attic junk, confused cat photos | Attic heat |
| 3 | Suburban Skyline | 30 - 500 m | Rooftops, water towers, one (1) blimp that reads "WHY" | Sun exposure |
| 4 | Cloud Layer | 500 m - 10 km | Volumetric-ish clouds, passing jet that honks | Jet-stream shear |
| 5 | Low Orbit | 10 - 400 km | Satellites, floating astronaut giving thumbs-up | Solar radiation |
| 6 | Deep Space | 400 km - 1 AU | Nebulae, planets with faces, cosmic goop whales | Vacuum sublimation |
| 7 | **PAST GOD** (final) | 1 AU - ??? | Blinding gradient void; enormous marble hand descends and tries to flick the tower | Divine disapproval |

**Zone 7 - the Final Zone boss:** "The Flick." A giant hand winds up over ~120 seconds while a
"Divine Disapproval" meter fills (melt rate ×5 during this phase). The player must out-goop the
meter. Success = the hand gives a slow thumbs-up, tower pierces the skybox, **WIN screen**,
Endless Mode unlocks permanently. Failure = the flick, an extremely dramatic slow-mo collapse.

**Endless Mode:** After winning once, a run that beats Zone 7 continues into "The Goopiverse" -
procedurally tinted void layers every ×1000 height, escalating melt, escalating chaos events.
See §6 for the cap.

---

## 4. Currencies

| Currency | Earned by | Spent on | Persists? |
|----------|-----------|----------|-----------|
| **Goop** | Clicks, GPS producers | Upgrades, producers | No - reset on run end |
| **Goop Essence (GE)** | Run end (win OR melt), scaled by peak height | Permanent meta upgrades | **Yes** |
| **Goobers** (premium-feel, not paid) | Achievements, chaos-event perfection, collectables | Cosmetics, tower skins, click-splat effects | **Yes** |

**Goop Essence formula (prestige):**
```
GE_earned = floor( (peakHeightMeters ^ 0.5) / 10 ) * winMultiplier
winMultiplier = 3 if run beat Zone 7, else 1
```
- A first failed run that reaches Zone 3 (~200 m) grants ~1 GE. A Zone 5 melt grants ~60 GE.
  A win grants hundreds. Losing always progresses you; winning progresses you much faster.
- **Design intent:** the first 1-3 runs are "tutorial deaths." GE meta upgrades (§7) are what
  bring the win inside the 45-60 min target.

---

## 5. Scaling Math (the important part)

All balance constants live in one file: `src/config/balance.ts`. Never hardcode numbers in
gameplay logic. Numbers below are **starting values for tuning**, validated by the simulation
harness (§14).

### 5.1 Height from goop
Tower height is logarithmic in lifetime run goop so exponential goop growth = steady visual climb:
```
height_m = 0.5 * (log10(lifetimeGoop + 1)) ^ 2.2
```
This yields: 1e3 goop ≈ 5.6 m (Zone 2), 1e6 ≈ 26 m, 1e9 ≈ 63 m... tune exponent so a
45-60 min optimized run reaches Zone 7 threshold (1 AU ≈ 1.5e11 m) at roughly 1e40-1e50 goop.
(Exact exponent/coefficients are the simulator's first job - see §14.)

### 5.2 Producers (GPS buildings)
Classic incremental cost curve:
```
cost(n) = baseCost * 1.15 ^ n        // n = number owned
```
| Producer | Base cost | Base GPS | Flavor |
|----------|----------|----------|--------|
| Goop Dripper | 15 | 0.1 | A leaky faucet, but goop |
| Goop Intern | 100 | 1 | Unpaid. Sighs audibly. |
| Goop Cannon | 1,100 | 8 | Fires goop at the tower. Sometimes misses (visual only) |
| Unionized Goop Workers | 12,000 | 47 | Tiny goop guys climbing the tower. Demand breaks. |
| Goopcopter | 130,000 | 260 | Helicopter made of goop. Physically upsetting. |
| Goop Reactor | 1.4e6 | 1,400 | Do not ask what it fissions |
| Goop Singularity | 2e7 | 7,800 | A small black hole that emits goop, against all physics |
| The Goop Mother | 3.3e8 | 44,000 | She loves you. She produces goop. |
| Interdimensional Goop Pipeline | 5.1e9 | 260,000 | Steals goop from timelines where you already won |
| God's Own Squeeze Bottle | 7.5e10 | 1.6e6 | Foreshadows Zone 7 |

Each producer has 3-4 tiered multiplier upgrades (×2 each) unlocking at 10/25/50/100 owned,
plus synergy upgrades (Cookie Clicker style). Click power upgrades scale as % of GPS
("Slap Harder": clicks gain +1% of GPS each, stacking) to keep clicking relevant late-game.

### 5.3 Melt (the fail mechanic)
Melt removes goop per second from the tower's *mass pool* (lifetime goop is untouched for
height calc; instead melt drains a separate **Structural Goop** buffer):
```
structuralGoop += goopEarned * 0.1          // 10% of income shores up the tower
meltRate = baseMelt(zone) * (1 + endlessDepth * 0.5) * eventModifiers
structuralGoop -= meltRate * dt
```
- **Melt warning states:** buffer < 30s of current melt → tower base glows orange, drips
  accelerate, low warning tone. Buffer < 10s → red pulsing, screen edges droop (shader),
  klaxon-squelch. Buffer hits 0 → **collapse sequence** (unskippable ~8s of glorious slow-mo
  physics failure) → Puddle Screen → GE payout → prestige menu.
- `baseMelt(zone)` scales so that a player who stops buying upgrades stalls and dies within
  ~3-5 minutes in any zone. Progress = safety; idling = danger. Tune in simulator.
- Meta upgrades and some run upgrades add melt resistance (multiplicative reductions, capped
  at 75% reduction so melt never becomes irrelevant).

### 5.4 Endless Mode scaling & THE CAP
- Post-Zone 7, melt scales super-linearly with depth; income scales with continued purchases +
  active combo play. Serious attention required (per requirement #2): Golden Goobers and chaos
  events become the dominant income source, and they require clicks/decisions.
- **Score = peak height.** Numbers use break_infinity.js (see §9) so goop can exceed 1e308.
- **THE CAP: height 1e100 meters ("One Googol Meters").** Reaching it triggers the master
  achievement **"GOOP TRANSCENDENT"**, a bespoke ending cutscene (the tower ties itself into a
  bow), and a permanent golden tower skin. This should require deep meta-progression, near-
  perfect event play, and multiple hours in a single endless run - the simulator must confirm
  it is *possible* but brutal. All leaderboard-style bragging is the peak-height stat + skin.

---

## 6. Run Structure & Prestige Flow

```
MAIN MENU → (meta shop: spend GE / Goobers) → START RUN
  → play zones 1-7 → WIN → choose: [Enter Endless] or [Bank it: prestige with ×3 GE]
  → or MELT anywhere → Puddle Screen → GE payout (×1) → back to MAIN MENU
```
- **First-run guardrails:** Zone 1 has no melt for the first 90 seconds; a tutorial toast
  ("your goop is getting warm...") introduces melt gently.
- **Prestige meta shop (GE):** permanent upgrades, e.g. Start With N Drippers, +X% all GPS,
  −X% melt, +combo duration, unlock "Goop Autopilot" (auto-buys cheapest producer, late meta),
  chaos-event luck, GE gain +%. Costs scale ×2.5 per tier.

---

## 7. Achievements, Unlockables, Collectables (all persist through melts)

### Achievements (~60 at launch; examples)
- *First Splat* - click once. | *Puddle Person* - lose your first run.
- *Ceiling? Never Met Her* - reach Zone 2. (one per zone)
- *Ignored By God* - survive 60s in Zone 7. | *FLICKED* - lose to The Flick specifically.
- *Union Strong* - own 100 Unionized Goop Workers. (tiered per producer)
- *Do Not Lick* - click the tower 1,000 / 10,000 / 100,000 times (lifetime).
- *Speedgoop* - win in under 45:00. | *No-Click Run* - reach Zone 4 without clicking.
- **GOOP TRANSCENDENT** - reach 1e100 m in Endless. (master achievement)
- Achievements grant Goobers and small permanent GPS bonuses (+1% each, Cookie Clicker style).

### Unlockables (Goober shop; cosmetic + minor QoL)
Tower skins (Lava Goop, Slime-Cola, RGB Gamer Goop, Gold - win-only), click-splat effects
(confetti, frogs, tiny screaming faces), UI themes, squelch packs (alternate audio sets),
puddle-screen epitaphs.

### Collectables - "Goop Fossils"
Rare (~5% per zone visit) shimmering objects embedded in the tower surface; click to extract.
27 total (e.g., "Fossilized Wednesday", "The Concept of Soup", "A Perfectly Normal Rock (Lying)").
Displayed in a 3D trophy shelf on the main menu - the show-off room. Each fossil = +0.5% GE gain.
Win screens stamp a trophy per victory with date + time; Endless bests display peak height.

---

## 8. Chaos Events

Random events every 2-4 min (zone-gated pools). Each has a 3D visual, ~10-20s duration,
and a player decision or reaction. Never two at once; 45s minimum gap; pause during Zone 7 boss.

**Positive / mixed:**
- *Goop Meteor* - incoming blob; click it 10 times mid-air to absorb (+30s of GPS instantly) or
  let it hit (tower wobbles, small structural loss, but +temporary click power "anger goop").
- *Loose Cannon* - a Goop Cannon overcharges: GPS ×5 for 20s but melt ×2. Ride it or vent it.
- *Golden Goober Swarm* - 8 goobers at once. Clicking spree.
- *The Investor* - a suited blob offers ×10 goop now for +25% melt for 90s. Deal button.

**Negative (counterplay always exists):**
- *Health Inspector* - a clipboard guy rappels down; click him off within 8s or GPS −50% for 30s.
- *Pigeon Uprising* - pigeons peck the tower (structural drain); each click swats one.
- *Heat Wave / Solar Flare / Divine Side-Eye* (zone-themed) - melt ×3 for 15s; hiding under the
  "Goop Umbrella" (buyable consumable) negates it.
- *The Barber* (crossover joke) - appears, is confused this is not the hair game, leaves. (0 effect;
  pure bit.)

Endless Mode adds escalated variants and stacking frequency - this is the "serious attention"
tax for exponential scores.

---

## 9. Technology Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Build | **Vite + TypeScript** | Fast HMR, proper repo per user requirement |
| 3D | **three.js** (latest stable at dev time - verify with a docs check) | Requirement |
| Big numbers | **break_infinity.js** | Handles >1e308 for the cap chase; standard in incrementals |
| State | Plain TS store (custom pub/sub) or **zustand** | Keep UI (DOM) and sim decoupled |
| UI overlay | **HTML/CSS DOM layer** over the canvas (not three.js text) | Crisp text, easy responsive, accessibility |
| Audio | **Web Audio API** directly (or howler.js) | Pitch variance + pooling for anti-spam (§11) |
| Physics feel | **Custom spring/verlet wobble** - NOT a full physics engine | We need jiggle, not accuracy; cheaper & tunable |
| Persistence | **localStorage** with versioned, migratable JSON save (see §12) | User requirement |
| Testing | **Vitest** for sim/balance; headless sim harness (§14) | Balance is math; test it as math |

### 9.1 Graphics approach (riskier/juicier - per user)
- **Tower rendering: raymarched metaball column in a fragment shader** (SDF smooth-min blobs)
  on a bounding-cylinder billboard, OR **marching-cubes mesh (three.js `MarchingCubes` addon)**
  as fallback. Build the fallback FIRST (it's proven and shippable), then attempt the raymarch
  upgrade behind a quality toggle. Never let the fancy path block a playable build.
- **Wobble:** vertex/SDF domain warping driven by a spring value that clicks and events kick.
  Tower lean: cumulative noise-driven sway that worsens with melt-warning state.
- **Material:** glossy subsurface-fake goop - fresnel rim, animated internal noise ("things
  moving inside the goop"), env-map reflections, drip particles (instanced meshes).
- **Post-processing (three.js EffectComposer):** bloom (goop glows in later zones), subtle
  chromatic aberration pulses on big purchases, vignette that "droops" during melt warning.
- **Camera:** smooth dolly that keeps the tower top in frame; zone transitions do a pull-back +
  environment crossfade. Occasional slow orbit while idle.
- **Environment:** skybox gradients + a small set of instanced set-dressing meshes per zone
  (procedural/primitive-built where possible: a toaster is boxes, the blimp is a capsule).
  Quirky > detailed. Every zone needs ≥3 sight gags.
- **Quality tiers:** auto-detect (devicePixelRatio, GPU timing) → Low/Med/High. Mobile defaults
  Med. All juice must degrade gracefully (fewer metaballs, no post-fx on Low).

### 9.2 Responsive layout (desktop horizontal + mobile vertical)
- Canvas is always full-viewport; **the tower is vertical, so portrait is naturally friendly.**
- **Landscape:** upgrade/producer panel docked right (collapsible), stats top-left, event
  banners top-center.
- **Portrait:** bottom sheet UI (swipe up for shop), stats as a slim top bar, tap targets ≥44px,
  combo bar above the sheet. Test at 390×844 and 1920×1080 minimum.
- Input: pointer events unify mouse/touch. No hover-dependent mechanics.

---

## 10. Repo Structure

```
goop-tower/
├── CLAUDE.md                  # AI development guide (see §15 - create FIRST)
├── PLAN.md                    # this document, checked in
├── docs/
│   ├── decisions/             # ADRs: one .md per significant tech/design decision
│   ├── balance-notes.md       # running log of tuning changes + simulator results
│   └── research/              # research agent outputs (see §16)
├── index.html
├── package.json / vite.config.ts / tsconfig.json
├── src/
│   ├── main.ts                # boot: sim + renderer + UI wiring
│   ├── config/
│   │   ├── balance.ts         # ALL tunable numbers. Single source of truth.
│   │   ├── producers.ts       # producer defs (data-driven)
│   │   ├── upgrades.ts        # run upgrades + meta upgrades (data-driven)
│   │   ├── zones.ts           # zone thresholds, palettes, set-dressing manifests
│   │   ├── events.ts          # chaos event definitions
│   │   └── achievements.ts
│   ├── sim/                   # PURE game logic. Zero three.js imports. Fully testable.
│   │   ├── game.ts            # tick(dt), purchase logic, melt, combo
│   │   ├── prestige.ts        # GE math
│   │   ├── events.ts          # event scheduler/resolver
│   │   └── numbers.ts         # break_infinity wrappers + formatting (1.23 Qa, etc.)
│   ├── render/                # three.js only. Reads sim state, never mutates it.
│   │   ├── scene.ts / camera.ts / postfx.ts
│   │   ├── tower/             # metaball/marching-cubes tower, wobble springs, drips
│   │   ├── zones/             # per-zone environments
│   │   └── vfx/               # splats, particles, transitions
│   ├── ui/                    # DOM overlay: shop, stats, event banners, menus
│   ├── audio/                 # engine + squelch synthesis/pools (§11)
│   └── save/                  # serialize, migrate, autosave
├── sim-harness/               # headless balance simulator (§14) - runs in Node/Vitest
│   ├── strategies/            # bot players: greedy, optimal-ish, idle, chaotic
│   └── report.ts              # outputs run-length / fail-point tables
└── tests/                     # Vitest unit tests for sim/
```

**Architecture rule #1: `sim/` is pure and deterministic** (seeded RNG). The renderer and UI are
observers. This is what makes the balance simulator, tests, and AI-driven tuning possible.

---

## 11. Audio (dopamine without annoyance)

- **Squelch pool:** ~6 base squelch samples (or synthesized noise-burst + lowpass) with random
  pitch ±20% and volume jitter. **Rate limiting:** max 8 squelches/sec; beyond that, clicks
  coalesce into a single fatter "mega-squelch" every 4th click (this sounds intentional and
  rewards spam instead of ear-blasting).
- **GPS ambience:** producers add layers to a quiet ambient goop-bubble loop, capped in volume;
  more producers = denser texture, never louder than a fixed ceiling.
- **Event stingers:** short, distinct, never looping. Melt warning = escalating low pulse, not
  a constant alarm. Zone transitions get the biggest musical moments.
- Master/SFX/Music sliders + mute persist in save. Start muted until first user gesture
  (browser autoplay policy) with a friendly "🔊?" prompt.

---

## 12. Persistence (localStorage)

- Key: `goopTower.save.v{N}`. JSON: `{ version, meta: {GE, goobers, achievements, fossils,
  unlocks, stats, bestHeight}, run: {…} | null, settings }`.
- Autosave every 15s + on visibility change. Export/import save as base64 string (streamers
  swap machines; also the answer to "how do Steam/iOS handle this" - a platform wrapper later
  (Electron/Tauri/Capacitor) would sync this same JSON to Steam Cloud / iCloud; the save layer
  is already abstracted behind `save/` so only the storage backend changes).
- Migrations: `migrate(vOld → vNew)` chain; never delete a save that fails to parse - stash it
  under `goopTower.save.corrupt.{timestamp}` and start fresh.
- Offline progress: **intentionally minimal** (this is an active game): cap offline GPS credit
  at 10 minutes, melt paused offline. Flavor: "your goop napped."

---

## 13. Performance Budgets

- 60 fps on a mid-range laptop at High; 60 fps at Med on a 2021-era phone; never below 30 on Low.
- Sim tick: fixed 10 Hz logic (interpolated rendering); render decoupled.
- Draw calls < 150; metaball field ≤ 64 active blobs (older goop "freezes" into cheaper static
  segments - this is also a nice visual: the tower's lower body is cured goop).
- All numbers formatted via `numbers.ts` (no raw exponents in UI until >1e33, then scientific,
  with a "silly names" toggle: Quintillion → "Goopillion").

---

## 14. Testing & Balance Validation

**The simulator is not optional. Build it in Milestone 1.**

- `sim-harness/` runs the pure sim at 1000× speed with bot strategies:
  - **GreedyBot** (always buys best GPS/cost), **IdleBot** (buys rarely, never clicks),
    **ClickerBot** (max active play), **ChaoticBot** (random purchases, misses events).
- **Acceptance criteria to enforce with every balance change (Vitest assertions):**
  1. ClickerBot with ~median meta upgrades wins in 45-60 min.
  2. GreedyBot with zero meta upgrades melts in zone 3-5 between 15-30 min (first-run experience).
  3. IdleBot melts within 5 min of stalling in any zone.
  4. GE from a 20-min failed run funds ≥1 meaningful meta upgrade.
  5. Endless: ClickerBot + maxed meta reaches 1e100 m in a 3-8 hour simulated session; any
     lesser configuration cannot (cap must be brutal but reachable).
- Log every tuning change + simulator table to `docs/balance-notes.md`.
- Manual playtest checklist per milestone: portrait + landscape, touch + mouse, refresh-restore
  mid-run, tab-background for 20 min, audio spam test (mash 20 cps).

---

## 15. CLAUDE.md - instructions for creating it (do this before writing code)

Create `CLAUDE.md` at repo root. It is the standing context for every Claude Code session.
It must contain, concisely (target < 150 lines):

1. **One-paragraph game summary** + pointer to `PLAN.md` for full design.
2. **Architecture invariants:**
   - `sim/` is pure TS, deterministic, seeded RNG, no three.js/DOM imports - enforced by an
     ESLint import rule; never break it.
   - All tunables live in `src/config/`; never hardcode balance numbers in logic.
   - Renderer/UI read sim state via the store; they never mutate sim state directly.
   - Big numbers always via `numbers.ts` (break_infinity) - never raw JS numbers for goop.
3. **Commands:** `npm run dev`, `npm test`, `npm run sim` (balance harness), `npm run build`,
   `npm run lint`.
4. **Definition of done for any gameplay PR:** unit tests pass, `npm run sim` acceptance
   criteria (§14) pass, tested in portrait AND landscape, no console errors, balance changes
   logged in `docs/balance-notes.md`.
5. **Style rules:** TypeScript strict; data-driven content (new producers/upgrades/events are
   config entries, not new code paths); flavor text must be funny - when adding content, match
   the established tone (cite 2-3 examples in CLAUDE.md).
6. **Current milestone + next tasks** (keep this section updated at the end of every session -
   this is the handoff mechanism between Claude sessions).
7. **Known footguns:** browser autoplay policy (audio after gesture), localStorage quota,
   mobile devicePixelRatio memory, marching-cubes resolution vs. perf.

---

## 16. AI Tooling: Research Agents & Session Workflow

### 16.1 Research agents (run these as separate/parallel Claude sessions or subagents; save each output to `docs/research/`)
1. **three.js techniques scout** - verify current three.js version + addon import paths;
  gather working examples of MarchingCubes addon, EffectComposer bloom, and raymarched SDF
  metaballs; note WebGL2 vs WebGPU renderer status. Output: `docs/research/threejs.md` with
  runnable snippets.
2. **Incremental balance researcher** - summarize cost-curve and prestige-curve conventions
  (Cookie Clicker 1.15 growth, AdCap milestones, prestige-formula patterns) and pitfalls
  (dead zones, hard walls). Output: `docs/research/balance.md`.
3. **Juice/game-feel researcher** - catalog concrete squash-stretch, screen-shake, particle,
  and audio-feedback techniques with parameter ranges. Output: `docs/research/juice.md`.
4. **Mobile web perf researcher** - canvas sizing/DPR strategy, touch-input gotchas, iOS Safari
  audio + memory limits. Output: `docs/research/mobile.md`.

### 16.2 Suggested session/subagent roles during development
- **Sim engineer** (owns `sim/`, `config/`, `sim-harness/`, tests) - can work headless, fastest
  iteration; balance changes must ship with updated harness assertions.
- **Render engineer** (owns `render/`) - works against a mock sim-state fixture so it never
  blocks on sim work.
- **UI/UX session** (owns `ui/`, responsive layouts, menus).
- **Content writer pass** - dedicated session for flavor text/achievement names once systems
  exist (comedy is better in batch).
- Keep sessions scoped to one directory where possible; CLAUDE.md §6 is the handoff log.

### 16.3 Guidance for future Claude sessions
- Read `CLAUDE.md`, then relevant sections of this plan, before coding. Don't re-decide
  decided things; if a decision must change, write an ADR in `docs/decisions/`.
- Prefer the shippable path first (marching cubes before raymarching; DOM UI before fancy).
- After any balance-affecting change: run `npm run sim`, paste the report table into
  `docs/balance-notes.md` with a one-line rationale.
- When adding art: primitives + shaders + wit beat imported assets. No external asset
  dependencies without an ADR.

---

## 17. Milestones (build order)

1. **M0 - Skeleton (playable ugly):** Vite+TS repo, pure sim with producers/costs/melt,
   DOM-only UI (no 3D yet), save/load, **sim-harness with acceptance tests**. The game must be
   winnable as text before it's goopy.
2. **M1 - The Tower:** three.js scene, marching-cubes tower grows with height, click splats,
   wobble springs, camera dolly, Zone 1 environment. Portrait + landscape layouts.
3. **M2 - The Run:** all 7 zones + transitions, melt warning states + collapse sequence,
   prestige loop + GE shop, first audio pass.
4. **M3 - The Chaos:** chaos events, Golden Goobers, combo bar, achievements + toasts.
5. **M4 - The Win:** Zone 7 boss ("The Flick"), win screen, Endless Mode + cap + GOOP
   TRANSCENDENT, fossils + trophy shelf.
6. **M5 - The Juice:** post-fx, quality tiers, raymarch tower upgrade attempt, squelch polish,
   cosmetics shop, balance hardening via simulator, streamer-mode toggle (bigger UI text).

---

*End of plan. First action for the next session: initialize the repo, write CLAUDE.md per §15,
then start Milestone 0.*
