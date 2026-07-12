/**
 * events.ts - chaos-event scheduler + effects (PLAN §8), pure & deterministic.
 *
 * All runtime state is PLAIN JSON living on RunState (eventCooldown / activeEvent /
 * eventEffects) so saves serialize it for free; this module is just the logic. Event selection
 * uses the game's seeded RNG - same seed, same schedule (the harness/tests rely on this).
 * UI-facing rules (PLAN §8): never two at once, 45s minimum gap, zone-gated pools, expiry of an
 * unfinished 'targets' event = its onFail, expiry of a 'decision' = a polite decline.
 */

import { CHAOS_EVENTS, EVENT_BY_ID, type EventOutcome } from '../config/events';
import { balance } from '../config/balance';
import { ZERO, type Decimal } from './numbers';
import type { Rng } from './rng';

/** Serializable state of the event in progress. */
export interface ActiveEventState {
  id: string;
  remaining: number;
  /** 'targets' kind: taps still needed. */
  targetsLeft: number;
  /** Set once resolved (success/fail/accept/decline) - kept until `remaining` hits 0 only for
   *  UI linger; a resolved event no longer reacts to taps/decisions. */
  resolved: boolean;
}

/** A lingering buff/debuff (also serialized on RunState). */
export interface EventEffectState {
  gpsMult: number;
  meltMult: number;
  clickMult: number;
  remaining: number;
  label: string;
  icon: string;
}

/** The slice of Game the scheduler needs (avoids a circular import with game.ts). */
export interface EventHost {
  rng: Rng;
  run: {
    status: string;
    runTime: number;
    goop: Decimal;
    structuralGoop: Decimal;
    eventCooldown: number;
    activeEvent: ActiveEventState | null;
    eventEffects: EventEffectState[];
  };
  gps(): Decimal;
  currentZone(): { index: number };
  addGoopFromEvent(amount: Decimal): void;
  /** UI hook: outcome toast lines queue here (sim stays DOM-free). */
  pushEventToast(text: string): void;
}

export function initialEventCooldown(rng: Rng): number {
  return balance.events.minGapSeconds + rng.range(balance.events.extraGapMin, balance.events.extraGapMax);
}

/** Product of a multiplier across lingering effects + the active event's aura. */
function effectProduct(host: EventHost, key: 'gpsMult' | 'meltMult' | 'clickMult'): number {
  let m = 1;
  for (const e of host.run.eventEffects) m *= e[key];
  // Auras apply for the event's whole lifetime ('resolved' only gates interaction).
  const a = host.run.activeEvent;
  if (a) {
    const aura = EVENT_BY_ID[a.id]?.aura;
    if (aura) m *= aura[key] ?? 1;
  }
  return m;
}

export const eventGpsMult = (host: EventHost): number => effectProduct(host, 'gpsMult');
export const eventMeltMult = (host: EventHost): number => effectProduct(host, 'meltMult');
export const eventClickMult = (host: EventHost): number => effectProduct(host, 'clickMult');

function applyOutcome(host: EventHost, outcome: EventOutcome | undefined): void {
  if (!outcome) return;
  if (outcome.gpsSeconds && outcome.gpsSeconds > 0) {
    const grant = host.gps().mul(outcome.gpsSeconds);
    if (grant.gt(0)) host.addGoopFromEvent(grant);
  }
  if (outcome.goopMult && outcome.goopMult !== 1) {
    const bonus = host.run.goop.mul(outcome.goopMult - 1);
    if (bonus.gt(0)) host.addGoopFromEvent(bonus);
  }
  if (outcome.structuralLossFrac) {
    host.run.structuralGoop = host.run.structuralGoop.mul(1 - outcome.structuralLossFrac);
    if (host.run.structuralGoop.lt(0)) host.run.structuralGoop = ZERO;
  }
  if (outcome.effect) {
    const e = outcome.effect;
    host.run.eventEffects.push({
      gpsMult: e.gpsMult ?? 1,
      meltMult: e.meltMult ?? 1,
      clickMult: e.clickMult ?? 1,
      remaining: e.durationSec,
      label: e.label,
      icon: e.icon,
    });
  }
  if (outcome.toast) host.pushEventToast(outcome.toast);
}

function resolve(host: EventHost, outcome: EventOutcome | undefined, lingerSec = 1.2): void {
  const a = host.run.activeEvent;
  if (!a || a.resolved) return;
  applyOutcome(host, outcome);
  a.resolved = true;
  a.remaining = Math.min(a.remaining, lingerSec); // brief linger so the UI can show the result
}

/** Advance cooldown/active event/effects by dt. Fires new events only during 'active' status. */
export function tickEvents(host: EventHost, dt: number): void {
  const r = host.run;

  for (let i = r.eventEffects.length - 1; i >= 0; i--) {
    const e = r.eventEffects[i]!;
    e.remaining -= dt;
    if (e.remaining <= 0) r.eventEffects.splice(i, 1);
  }

  const a = r.activeEvent;
  if (a) {
    a.remaining -= dt;
    if (a.remaining <= 0) {
      if (!a.resolved) {
        const def = EVENT_BY_ID[a.id];
        // Expiry: unfinished targets fail; decisions decline (no outcome); auras/bits just end.
        if (def?.kind === 'targets') resolve(host, def.onFail, 0);
      }
      r.activeEvent = null;
      r.eventCooldown = initialEventCooldown(host.rng);
    }
    return; // never two at once
  }

  // No firing during grace/warmup - the melt tutorial already owns that window.
  if (r.status !== 'active') return;
  if (r.runTime < balance.melt.graceSeconds + balance.events.warmupSeconds) return;

  r.eventCooldown -= dt;
  if (r.eventCooldown > 0) return;

  const zone = host.currentZone().index;
  const pool = CHAOS_EVENTS.filter((e) => zone >= e.minZone);
  if (pool.length === 0) {
    r.eventCooldown = balance.events.minGapSeconds;
    return;
  }
  let pick = host.rng.next() * pool.reduce((s, e) => s + e.weight, 0);
  let def = pool[pool.length - 1]!;
  for (const e of pool) {
    pick -= e.weight;
    if (pick <= 0) {
      def = e;
      break;
    }
  }
  r.activeEvent = {
    id: def.id,
    remaining: def.durationSec,
    targetsLeft: def.targets ?? 0,
    resolved: def.kind === 'bit' || def.kind === 'aura', // nothing to interact with
  };
}

/** Tap one target of the active 'targets' event. Returns true if the tap counted. */
export function clickEventTarget(host: EventHost): boolean {
  const a = host.run.activeEvent;
  if (!a || a.resolved || a.targetsLeft <= 0) return false;
  const def = EVENT_BY_ID[a.id];
  if (!def || def.kind !== 'targets') return false;
  a.targetsLeft--;
  // Per-tap payout: an even slice of the success pool, paid immediately (partial credit).
  const pool = def.onSuccess?.gpsSeconds ?? 0;
  const per = def.targets ? pool / def.targets : 0;
  if (per > 0) {
    const grant = host.gps().mul(per);
    if (grant.gt(0)) host.addGoopFromEvent(grant);
  }
  if (a.targetsLeft <= 0) {
    // Success outcome minus the already-paid gpsSeconds (avoid double-pay).
    resolve(host, { ...def.onSuccess, gpsSeconds: 0 });
  }
  return true;
}

/** Answer the active 'decision' event. Decline resolves with no outcome. */
export function decideEvent(host: EventHost, accept: boolean): boolean {
  const a = host.run.activeEvent;
  if (!a || a.resolved) return false;
  const def = EVENT_BY_ID[a.id];
  if (!def || def.kind !== 'decision') return false;
  resolve(host, accept ? def.onAccept : undefined);
  return true;
}
