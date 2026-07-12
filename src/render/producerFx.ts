/**
 * producerFx.ts - every producer ("tool") gets its own visible signature in the world (PLAN
 * pillar #1: the number must be FELT). Data-driven emitter table keyed by producer id (same
 * pattern as palette.ts: render-side flavour for sim config). Emission cadence scales gently
 * with owned count and is globally budgeted so 400 drippers don't melt a phone.
 */

import * as THREE from 'three';
import type { SplatSystem, BurstOptions } from './splats';

interface FxDef {
  color: number;
  /** Seconds between emissions at 1 owned (shrinks ~sqrt(owned), floored). */
  interval: number;
  /** Where the emission originates, given the tower top height. */
  origin: (topY: number, t: number, out: THREE.Vector3) => void;
  burst: (topY: number) => BurstOptions;
}

/** Visual signature per producer - matches each one's flavor text. */
const FX: Record<string, FxDef> = {
  // A leaky faucet, but goop: slow fat drips down the tower's flank.
  dripper: {
    color: 0x8fc93a,
    interval: 1.4,
    origin: (topY, t, out) => out.set(Math.sin(t * 1.7) * 0.9, Math.min(topY * 0.7, topY - 0.2) + 0.4, Math.cos(t * 1.7) * 0.9),
    burst: () => ({ count: 1, size: 1.1, out: 0.2, up: -0.5, life: 1.4 }),
  },
  // Unpaid. Sighs audibly: a tired little puff at the base.
  intern: {
    color: 0xcfc6e8,
    interval: 2.6,
    origin: (_topY, t, out) => out.set(Math.sin(t) * 2.2, 0.35, Math.cos(t) * 2.2),
    burst: () => ({ count: 3, size: 0.55, out: 0.8, up: 1.4, life: 0.8 }),
  },
  // Fires goop at the tower. Sometimes misses (visual only): incoming shots from off-screen.
  cannon: {
    color: 0x7ddc3f,
    interval: 2.2,
    origin: (topY, t, out) => {
      const side = Math.sin(t * 0.37) > 0 ? 1 : -1;
      out.set(side * 8, 1 + Math.random() * Math.max(1, topY * 0.5), -2 - Math.random() * 2);
    },
    burst: () => ({
      count: 2,
      size: 1.5,
      out: 0.3,
      up: 4.5,
      vel: new THREE.Vector3(0, 0, 0), // set per-emission below (aimed at the tower)
      gravity: 0.9,
      life: 1.6,
    }),
  },
  // Tiny goop guys climbing the tower.
  union: {
    color: 0xffc24a,
    interval: 1.9,
    origin: (topY, t, out) => out.set(Math.sin(t * 2.3) * 1.2, 0.3 + Math.random() * Math.max(0.5, topY * 0.6), Math.cos(t * 2.3) * 1.2),
    burst: () => ({ count: 2, size: 0.5, out: 0.4, up: 2.6, gravity: 0.55, life: 1.1 }),
  },
  // Helicopter made of goop. Physically upsetting: hovering shed-droplets near the top.
  goopcopter: {
    color: 0x7fe0c0,
    interval: 1.8,
    origin: (topY, t, out) => out.set(Math.sin(t * 0.9) * 2.6, topY + 1.2, Math.cos(t * 0.9) * 2.6),
    burst: () => ({ count: 3, size: 0.7, out: 1.6, up: 0.2, gravity: 0.35, life: 1.2 }),
  },
  // Do not ask what it fissions: hot fast sparks at the base.
  reactor: {
    color: 0xd6ff4a,
    interval: 2.4,
    origin: (_topY, t, out) => out.set(Math.sin(t * 3.1) * 1.6, 0.5, Math.cos(t * 3.1) * 1.6),
    burst: () => ({ count: 5, size: 0.6, out: 4.5, up: 5.5, life: 0.7 }),
  },
  // A small black hole that emits goop, against all physics: purple infall, outward anyway.
  singularity: {
    color: 0xc060ff,
    interval: 2.8,
    origin: (topY, t, out) => out.set(Math.sin(t * 1.3) * 3, Math.max(1, topY * 0.5), Math.cos(t * 1.3) * 3),
    burst: () => ({ count: 4, size: 0.8, out: -2.5, up: 0.6, gravity: 0.25, life: 1.3 }),
  },
  // She loves you. She produces goop: big soft blobs lobbed from above.
  mother: {
    color: 0xff9ad5,
    interval: 3.4,
    origin: (topY, t, out) => out.set(Math.sin(t * 0.6) * 2, topY + 3, Math.cos(t * 0.6) * 2),
    burst: () => ({ count: 2, size: 1.8, out: 0.6, up: -1, gravity: 0.8, life: 1.5 }),
  },
  // Steals goop from timelines where you already won: fast cyan streaks arcing in.
  pipeline: {
    color: 0x66e0ff,
    interval: 3,
    origin: (topY, t, out) => out.set(-7 + Math.sin(t) * 2, topY + 2, 5),
    burst: () => ({ count: 3, size: 0.9, out: 0.4, up: 1, vel: new THREE.Vector3(6, 0, -4.5), gravity: 0.6, life: 1.2 }),
  },
  // Foreshadows Zone 15: giant golden droplets from on high.
  bottle: {
    color: 0xffe066,
    interval: 4,
    origin: (topY, _t, out) => out.set((Math.random() - 0.5) * 2, topY + 5, (Math.random() - 0.5) * 2),
    burst: () => ({ count: 2, size: 2.2, out: 0.5, up: -2, life: 1.6 }),
  },
};

/** Global budget: at most this many ambient emissions per second across ALL producers. */
const MAX_EMISSIONS_PER_SEC = 9;

export class ProducerFx {
  private timers: Record<string, number> = {};
  private budget = 0;
  private origin = new THREE.Vector3();
  private aim = new THREE.Vector3();

  update(dt: number, owned: Readonly<Record<string, number>>, topY: number, t: number, splats: SplatSystem): void {
    this.budget = Math.min(2, this.budget + dt * MAX_EMISSIONS_PER_SEC);
    for (const id in FX) {
      const n = owned[id] ?? 0;
      if (n <= 0) continue;
      const fx = FX[id]!;
      // More owned = busier, with diminishing returns; never faster than 2/s per producer.
      const interval = Math.max(0.5, fx.interval / Math.sqrt(Math.min(n, 100)));
      this.timers[id] = (this.timers[id] ?? Math.random() * interval) - dt;
      if (this.timers[id]! > 0) continue;
      this.timers[id] = interval;
      if (this.budget < 1) continue; // over budget this frame - skip, don't queue
      this.budget -= 1;

      fx.origin(topY, t, this.origin);
      const opts = fx.burst(topY);
      if (id === 'cannon') {
        // Aim the shot at a random height on the tower (and occasionally miss, as promised).
        const miss = Math.random() < 0.25 ? 2.5 : 0;
        this.aim.set(0, Math.random() * Math.max(1, topY * 0.8), miss * (Math.random() - 0.5) * 2);
        opts.vel = this.aim.sub(this.origin).multiplyScalar(0.55).add(new THREE.Vector3(0, 2.5, 0));
      }
      splats.burst(this.origin, fx.color, opts);
    }
  }
}
