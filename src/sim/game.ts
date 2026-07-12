/**
 * game.ts - the PURE, deterministic game simulation (PLAN §10 architecture rule #1).
 * Zero three.js/DOM imports. Fixed-timestep tick() at balance.tickHz. Fully testable;
 * the sim-harness (§14) and Vitest drive this exact code.
 */

import { balance } from '../config/balance';
import { PRODUCERS, PRODUCER_BY_ID } from '../config/producers';
import {
  PRODUCER_TIER_UPGRADES,
  RUN_UPGRADES,
  META_UPGRADES,
  META_BY_ID,
  type RunUpgrade,
  type ProducerTierUpgrade,
} from '../config/upgrades';
import { ZONES, WIN_HEIGHT, zoneForHeight, type ZoneDef } from '../config/zones';
import { Decimal, D, ZERO } from './numbers';
import { Rng } from './rng';
import { checkAchievements } from './achievements';
import {
  tickEvents,
  clickEventTarget,
  decideEvent,
  initialEventCooldown,
  eventGpsMult,
  eventMeltMult,
  eventClickMult,
  type ActiveEventState,
  type EventEffectState,
} from './events';

export type RunStatus = 'grace' | 'active' | 'won' | 'collapsing' | 'dead';

/** Persistent meta progression carried between runs (PLAN §4, §6). Owned by save/. */
export interface MetaState {
  ge: number;
  goobers: number;
  metaLevels: Record<string, number>;
  bestHeightRaw: number;
  totalClicks: number;
  wins: number;
  /** Lost (melted) run count - several achievements celebrate failure (PLAN §7). */
  puddles: number;
  /** Total GE ever banked (spending doesn't reduce it). */
  lifetimeGe: number;
  /** Unlocked achievement ids, in unlock order (config/achievements.ts). */
  achievements: string[];
}

export function createMetaState(): MetaState {
  return {
    ge: 0,
    goobers: 0,
    metaLevels: {},
    bestHeightRaw: 0,
    totalClicks: 0,
    wins: 0,
    puddles: 0,
    lifetimeGe: 0,
    achievements: [],
  };
}

/** Precomputed run-invariant bonuses from meta levels (they don't change mid-run). */
interface MetaBonuses {
  startProducers: Record<string, number>;
  globalGpsMult: number;
  meltResistFrac: number;
  comboDurationMult: number;
  clickPowerMult: number;
  geGainMult: number;
}

export function computeMetaBonuses(levels: Record<string, number>): MetaBonuses {
  const b: MetaBonuses = {
    startProducers: {},
    globalGpsMult: 1,
    meltResistFrac: 0,
    comboDurationMult: 1,
    clickPowerMult: 1,
    geGainMult: 1,
  };
  for (const m of META_UPGRADES) {
    const lvl = levels[m.id] ?? 0;
    if (lvl <= 0) continue;
    const e = m.effect;
    switch (e.kind) {
      case 'startProducers':
        b.startProducers[e.producerId] = (b.startProducers[e.producerId] ?? 0) + e.perLevel * lvl;
        break;
      case 'globalGpsPct':
        b.globalGpsMult *= 1 + e.perLevel * lvl;
        break;
      case 'meltResistPct':
        // multiplicative combine
        b.meltResistFrac = 1 - (1 - b.meltResistFrac) * Math.pow(1 - e.perLevel, lvl);
        break;
      case 'comboDurationPct':
        b.comboDurationMult *= 1 + e.perLevel * lvl;
        break;
      case 'clickPowerMult':
        b.clickPowerMult *= 1 + e.perLevel * lvl;
        break;
      case 'geGainPct':
        b.geGainMult *= 1 + e.perLevel * lvl;
        break;
    }
  }
  return b;
}

/** Serializable run state (PLAN §12 save format's `run`). */
export interface RunState {
  goop: Decimal;
  lifetimeGoop: Decimal;
  structuralGoop: Decimal;
  /** Lagged moving average of GPS that melt trails behind (see balance.melt). */
  emaIncome: Decimal;
  producersOwned: Record<string, number>;
  runUpgrades: string[];
  tierUpgrades: string[];
  combo: number;
  timeSinceClick: number;
  peakHeightRaw: number;
  runTime: number;
  clicks: number;
  status: RunStatus;
  collapseTimer: number;
  endlessDepth: number;
  /** Chaos events (PLAN §8) - plain JSON so saves carry it for free (sim/events.ts). */
  eventCooldown: number;
  activeEvent: ActiveEventState | null;
  eventEffects: EventEffectState[];
}

export class Game {
  readonly meta: MetaState;
  private bonuses: MetaBonuses;
  run: RunState;
  readonly rng: Rng;
  /** Seconds since the last achievements sweep (~1 Hz; see tick()). */
  private achAcc = 0;

  constructor(meta: MetaState, seed = 1) {
    this.meta = meta;
    this.bonuses = computeMetaBonuses(meta.metaLevels);
    this.rng = new Rng(seed);
    this.run = this.freshRun();
  }

  /** Start a new run, applying meta "start with N producers" bonuses (PLAN §6). */
  freshRun(): RunState {
    const producersOwned: Record<string, number> = {};
    for (const p of PRODUCERS) producersOwned[p.id] = Math.floor(this.bonuses.startProducers[p.id] ?? 0);
    const run: RunState = {
      goop: ZERO,
      lifetimeGoop: ZERO,
      structuralGoop: ZERO,
      emaIncome: ZERO,
      producersOwned,
      runUpgrades: [],
      tierUpgrades: [],
      combo: 1,
      timeSinceClick: 999,
      peakHeightRaw: 0,
      runTime: 0,
      clicks: 0,
      status: 'grace',
      collapseTimer: 0,
      endlessDepth: 0,
      eventCooldown: initialEventCooldown(this.rng),
      activeEvent: null,
      eventEffects: [],
    };
    this.run = run;
    return run;
  }

  // ---- Derived values (read-only; UI/harness call these) ----

  /** Total GPS across all producers with tier + global multipliers. */
  gps(): Decimal {
    const r = this.run;
    let sum = ZERO;
    for (const p of PRODUCERS) {
      const owned = r.producersOwned[p.id] ?? 0;
      if (owned <= 0) continue;
      const tierMult = Math.pow(2, this.tierCountFor(p.id));
      sum = sum.add(D(p.baseGps).mul(owned).mul(tierMult));
    }
    return sum.mul(this.globalGpsMult());
  }

  private tierCountFor(producerId: string): number {
    let c = 0;
    for (const id of this.run.tierUpgrades) {
      const u = PRODUCER_TIER_UPGRADES.find((t) => t.id === id);
      if (u && u.producerId === producerId) c++;
    }
    return c;
  }

  globalGpsMult(): number {
    let m = this.bonuses.globalGpsMult;
    for (const id of this.run.runUpgrades) {
      const u = RUN_UPGRADES.find((x) => x.id === id);
      if (u?.effect.kind === 'globalGps') m *= u.effect.mult;
    }
    // Achievements: small permanent goop/sec bonus per unlock (PLAN §7).
    m *= 1 + this.meta.achievements.length * balance.achievements.gpsPctEach;
    // Chaos events: auras + lingering buffs/debuffs (PLAN §8).
    m *= eventGpsMult(this);
    return m;
  }

  private clickPctOfGps(): number {
    let pct = 0;
    for (const id of this.run.runUpgrades) {
      const u = RUN_UPGRADES.find((x) => x.id === id);
      if (u?.effect.kind === 'clickPctOfGps') pct += u.effect.addPct;
    }
    return pct;
  }

  /** Goop gained by one click at the current combo (PLAN §2.1, §5.2). */
  clickGain(): Decimal {
    const base = balance.click.basePower * this.bonuses.clickPowerMult;
    const fromGps = this.gps().mul(this.clickPctOfGps());
    return D(base).add(fromGps).mul(this.run.combo).mul(eventClickMult(this));
  }

  meltResistFrac(): number {
    let kept = 1 - this.bonuses.meltResistFrac;
    for (const id of this.run.runUpgrades) {
      const u = RUN_UPGRADES.find((x) => x.id === id);
      if (u?.effect.kind === 'meltResist') kept *= 1 - u.effect.frac;
    }
    const resist = 1 - kept;
    return Math.min(resist, balance.melt.maxResistance);
  }

  heightRaw(): number {
    const logG = this.run.lifetimeGoop.add(1).log10();
    return balance.height.coeff * Math.pow(Math.max(0, logG), balance.height.exp);
  }

  currentZone(): ZoneDef {
    return zoneForHeight(this.heightRaw());
  }

  /** Melt rate in goop/second (PLAN §5.3). Tracks LAGGED GPS (emaIncome), so out-growing the
   *  lag is safety and stalling is death. Zero during the start-of-run grace period, then ramps
   *  in over balance.melt.rampSeconds so new players meet the mechanic as a slope, not a wall. */
  meltRate(): number {
    const r = this.run;
    if (r.status === 'grace') return 0;
    const zone = this.currentZone();
    const zoneMult = balance.melt.zoneMeltMult[zone.index] ?? 1;
    const endless = 1 + r.endlessDepth * balance.melt.endlessPerDepth;
    const sinceGrace = Math.max(0, r.runTime - balance.melt.graceSeconds);
    const ramp = Math.min(1, sinceGrace / balance.melt.rampSeconds);
    return (
      r.emaIncome.toNumber() *
      balance.melt.meltFracBase *
      zoneMult *
      endless *
      ramp *
      eventMeltMult(this) *
      (1 - this.meltResistFrac())
    );
  }

  /** Seconds of structural buffer left at the current melt rate (Infinity if not melting). */
  bufferSeconds(): number {
    const rate = this.meltRate();
    if (rate <= 0) return Infinity;
    return Math.max(0, this.run.structuralGoop.toNumber()) / rate;
  }

  // ---- Purchases ----

  producerCost(id: string, count = 1): Decimal {
    const def = PRODUCER_BY_ID[id];
    if (!def) return new Decimal(Infinity);
    const owned = this.run.producersOwned[id] ?? 0;
    const g = balance.producerCostGrowth;
    // Geometric sum for bulk: baseCost * g^owned * (g^count - 1) / (g - 1).
    const first = D(def.baseCost).mul(Decimal.pow(g, owned));
    if (count === 1) return first;
    return first.mul(Decimal.pow(g, count).sub(1)).div(g - 1);
  }

  canAfford(cost: Decimal): boolean {
    return this.run.goop.gte(cost);
  }

  /** Largest `count` of a producer the current goop balance affords (closed-form geometric sum). */
  maxAffordableProducer(id: string): number {
    const def = PRODUCER_BY_ID[id];
    if (!def) return 0;
    const owned = this.run.producersOwned[id] ?? 0;
    const g = balance.producerCostGrowth;
    const first = D(def.baseCost).mul(Decimal.pow(g, owned));
    // goop >= first * (g^n - 1) / (g - 1)  =>  n = floor( log_g( goop*(g-1)/first + 1 ) )
    const x = this.run.goop.mul(g - 1).div(first).add(1);
    if (x.lte(1)) return 0;
    return Math.max(0, Math.floor(x.log10() / Math.log10(g)));
  }

  buyProducer(id: string, count = 1): boolean {
    if (!PRODUCER_BY_ID[id] || count < 1) return false;
    const cost = this.producerCost(id, count);
    if (!this.canAfford(cost)) return false;
    this.run.goop = this.run.goop.sub(cost);
    this.run.producersOwned[id] = (this.run.producersOwned[id] ?? 0) + count;
    return true;
  }

  buyRunUpgrade(id: string): boolean {
    if (this.run.runUpgrades.includes(id)) return false;
    const u = RUN_UPGRADES.find((x) => x.id === id);
    if (!u || !this.canAfford(D(u.costGoop))) return false;
    this.run.goop = this.run.goop.sub(u.costGoop);
    this.run.runUpgrades.push(id);
    return true;
  }

  buyTierUpgrade(id: string): boolean {
    if (this.run.tierUpgrades.includes(id)) return false;
    const u = PRODUCER_TIER_UPGRADES.find((x) => x.id === id);
    if (!u) return false;
    if ((this.run.producersOwned[u.producerId] ?? 0) < u.atOwned) return false;
    if (!this.canAfford(D(u.costGoop))) return false;
    this.run.goop = this.run.goop.sub(u.costGoop);
    this.run.tierUpgrades.push(id);
    return true;
  }

  /** Run upgrades whose prerequisites are met and not yet owned (for shop/bots). */
  availableRunUpgrades(): RunUpgrade[] {
    return RUN_UPGRADES.filter((u) => !this.run.runUpgrades.includes(u.id));
  }

  availableTierUpgrades(): ProducerTierUpgrade[] {
    return PRODUCER_TIER_UPGRADES.filter(
      (u) => !this.run.tierUpgrades.includes(u.id) && (this.run.producersOwned[u.producerId] ?? 0) >= u.atOwned,
    );
  }

  // ---- The click (PLAN §2.1) ----

  click(): void {
    const r = this.run;
    if (r.status !== 'active' && r.status !== 'grace') return;
    const gain = this.clickGain();
    this.addGoop(gain);
    r.clicks++;
    this.meta.totalClicks++;
    r.timeSinceClick = 0;
    // Build combo toward max.
    const inc = (balance.click.comboMaxMult - 1) / balance.click.comboClicksToMax;
    r.combo = Math.min(balance.click.comboMaxMult, r.combo + inc);
  }

  private addGoop(amount: Decimal): void {
    const r = this.run;
    r.goop = r.goop.add(amount);
    r.lifetimeGoop = r.lifetimeGoop.add(amount);
    r.structuralGoop = r.structuralGoop.add(amount.mul(balance.melt.structuralRatio));
  }

  // ---- Chaos events (PLAN §8; logic in sim/events.ts, pool in config/events.ts) ----

  /** Outcome toast lines queued for the UI (drained by the store on emit). */
  readonly eventToasts: string[] = [];

  /** EventHost hooks (events.ts stays decoupled from this class). */
  addGoopFromEvent(amount: Decimal): void {
    this.addGoop(amount);
  }
  pushEventToast(text: string): void {
    this.eventToasts.push(text);
    if (this.eventToasts.length > 4) this.eventToasts.shift();
  }

  /** Tap one target of the active 'targets' event (goobers/meteor/inspector). */
  tapEventTarget(): boolean {
    if (this.run.status !== 'active' && this.run.status !== 'grace') return false;
    return clickEventTarget(this);
  }

  /** Answer the active 'decision' event (The Investor's deal button). */
  answerEvent(accept: boolean): boolean {
    if (this.run.status !== 'active' && this.run.status !== 'grace') return false;
    return decideEvent(this, accept);
  }

  // ---- The tick (PLAN §5.3, §13: fixed 10 Hz) ----

  tick(dt: number): void {
    const r = this.run;
    if (r.status === 'won' || r.status === 'dead') return;

    if (r.status === 'collapsing') {
      r.collapseTimer -= dt;
      if (r.collapseTimer <= 0) r.status = 'dead';
      return;
    }

    // Achievements sweep ~1/sec (cheap: 100 predicates over a snapshot).
    this.achAcc += dt;
    if (this.achAcc >= 1) {
      this.achAcc = 0;
      checkAchievements(this);
    }

    r.runTime += dt;
    r.timeSinceClick += dt;

    // Exit grace once the guardrail window passes (PLAN §6).
    if (r.status === 'grace' && r.runTime >= balance.melt.graceSeconds) r.status = 'active';

    // Chaos events: effects tick, expiry resolution, and (post-warmup) new firings.
    tickEvents(this, dt);

    // Income from producers.
    const gpsNow = this.gps();
    const income = gpsNow.mul(dt);
    if (income.gt(0)) this.addGoop(income);

    // Update the lagged income EMA that melt trails behind.
    const alpha = Math.min(1, dt / balance.melt.incomeEmaTau);
    r.emaIncome = r.emaIncome.add(gpsNow.sub(r.emaIncome).mul(alpha));

    // Cap the structural buffer to a bounded cushion (see balance.melt.maxBufferSeconds).
    // Cap is measured against ema-derived melt so it still applies during the grace period.
    const zoneMult = balance.melt.zoneMeltMult[this.currentZone().index] ?? 1;
    const emaMelt = r.emaIncome.toNumber() * balance.melt.meltFracBase * zoneMult;
    if (emaMelt > 0) {
      const cap = D(balance.melt.maxBufferSeconds * emaMelt);
      if (r.structuralGoop.gt(cap)) r.structuralGoop = cap;
    }

    // Melt drains the structural buffer.
    const rate = this.meltRate();
    if (rate > 0) {
      r.structuralGoop = r.structuralGoop.sub(D(rate * dt));
      if (r.structuralGoop.lte(0)) {
        r.structuralGoop = ZERO;
        this.beginCollapse();
      }
    }

    // Combo decay after the momentum window (PLAN §2.1).
    const window = balance.click.comboWindowSec * this.bonuses.comboDurationMult;
    if (r.timeSinceClick > window && r.combo > 1) {
      const decay = (balance.click.comboDecayPerSec / this.bonuses.comboDurationMult) * dt;
      r.combo = Math.max(1, r.combo - decay);
    }

    // Height / zone / peak.
    const h = this.heightRaw();
    if (h > r.peakHeightRaw) r.peakHeightRaw = h;
    if (h > this.meta.bestHeightRaw) this.meta.bestHeightRaw = h;

    // Win check (reach Zone 15's finish - the boss itself is M4).
    if (r.status === 'active' && r.endlessDepth === 0 && h >= WIN_HEIGHT) {
      r.status = 'won';
      checkAchievements(this); // win-conditioned achievements fire on the transition
    }
  }

  private beginCollapse(): void {
    if (this.run.status === 'collapsing' || this.run.status === 'dead') return;
    this.run.status = 'collapsing';
    this.run.collapseTimer = balance.melt.collapseSeconds;
    checkAchievements(this); // death-conditioned achievements fire on the transition
  }

  isRunOver(): boolean {
    return this.run.status === 'won' || this.run.status === 'collapsing' || this.run.status === 'dead';
  }

  get bonusesRef(): MetaBonuses {
    return this.bonuses;
  }
}

export { ZONES, META_BY_ID, WIN_HEIGHT };
