/**
 * tower.ts - the marching-cubes goop tower (PLAN §9.1) + wobble/squash juice (PLAN §2.1, §9.1).
 *
 * The metaball field lives inside a base-pivoted Group so wobble (lean) and squash animate from the
 * ground up. A spring value carries the lean; clicks kick it (and a squash pulse); combo and the
 * melt-warning state raise the idle sway.
 *
 * Growth is CONTINUOUS and felt (PLAN pillar #1): rendered height follows the sim through a soft
 * under-damped spring (visible follow-through as goop lands), the surface "boils" with a per-ball
 * radius wobble whose amplitude rises while the tower is actively growing, and the top of the
 * tower swells with fresh goop after each slap (growPulse).
 */

import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { balance } from '../config/balance';
import { TOWER_WORLD_HEIGHT, STAGE_SCALE, GROW_RAW, towerSink } from './stage';
import type { ZonePalette } from './palette';
import type { RunStatus } from './source';

const RADIUS = 1.7;

// Wobble spring constants.
// Softer + underdamped on purpose: gelatin wobbles for a couple of beats before settling.
const STIFFNESS = 42;
const DAMPING = 5.2;

// Height growth spring (under-damped so gains have visible follow-through).
const H_STIFF = 16;
const H_DAMP = 6.5;

export class GoopTower {
  readonly object = new THREE.Group();
  private mc: MarchingCubes;
  private material: THREE.MeshPhysicalMaterial;
  private renderedHeight = 0;
  private heightVel = 0;

  /** Jump the growth spring straight to a height. Used when a saved run resumes so the tower
   *  (and everything scaled off it) doesn't replay a from-zero grow-in on every app open. */
  snap(heightRaw: number): void {
    this.renderedHeight = Math.max(0, heightRaw);
    this.heightVel = 0;
  }

  /** Fresh goop STACKED onto the surface by a slap: a transient metaball at the impact point
   *  that lands, bulges, then oozes down and merges into the body ("building on top", not
   *  absorbing into nothing). Field-space coords; capped pool. */
  private blobs: { fx: number; fy: number; fz: number; r: number; age: number }[] = [];

  addBlob(world: THREE.Vector3, power = 1): void {
    const fx = clamp(0.5 + world.x / (2 * RADIUS), 0.22, 0.78);
    const fz = clamp(0.5 + world.z / (2 * RADIUS), 0.22, 0.78);
    const fy = clamp((world.y - this.object.position.y) / (TOWER_WORLD_HEIGHT * STAGE_SCALE), 0.09, 0.82);
    this.blobs.push({ fx, fy, fz, r: 0.4 + 0.35 * power, age: 0 });
    if (this.blobs.length > 14) this.blobs.shift();
  }
  private warn = 0;
  /** Current sink (world units the object is lowered by; see stage.ts towerSink). */
  private sink = 0;
  /** Mesh crown BEFORE the sink, cached for topWorld(). */
  private lastCrownFull = 1;
  /** Swells the tower top right after fresh goop lands; decays fast. */
  private growPulse = 0;
  /** Seconds until the next metaball-field rebuild (throttled for mobile; see quality.ts). */
  private fieldAcc = 0;
  private fieldDt: number;

  // Lean spring (2 axes) + squash pulse.
  private leanX = 0;
  private leanZ = 0;
  private velX = 0;
  private velZ = 0;
  private squash = 0;
  private squashVel = 0;
  /** Radial "puff" on slap (scales the goop outward; never moves the top vertically). */
  private swell = 0;
  private swellVel = 0;
  private t = 0;

  private baseColor = new THREE.Color(0xb6e84a);
  private warnColor = new THREE.Color(0xff5d3a);
  private tmp = new THREE.Color();

  constructor(resolution = 40, fieldHz = 60) {
    this.fieldDt = 1 / fieldHz;
    this.material = new THREE.MeshPhysicalMaterial({
      color: this.baseColor.clone(),
      roughness: 0.25,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.3,
      sheen: 0.5,
      emissive: new THREE.Color(0x000000),
    });
    this.mc = new MarchingCubes(resolution, this.material, true, false, 40000);
    this.mc.isolation = 60;
    this.mc.scale.set(RADIUS, TOWER_WORLD_HEIGHT / 2, RADIUS);
    this.mc.position.y = TOWER_WORLD_HEIGHT / 2; // base at group-local y = 0
    this.object.add(this.mc); // group pivots at the base (ground)
    // Sink the group slightly so the goop foot meets the ground plane (metaball isolation clips the
    // field near its bottom edge, which otherwise leaves the base hovering).
    this.object.position.y = -0.7;
  }

  /** Kick the wobble spring + a squash pulse from a slap. Direction optional (from the tap ray). */
  impact(dirX?: number, dirZ?: number, power = 1): void {
    if (dirX !== undefined && dirZ !== undefined && (dirX !== 0 || dirZ !== 0)) {
      const m = 6.5 * power;
      this.velX += dirX * m + Math.sin(this.t * 12.9) * 1.5;
      this.velZ += dirZ * m + Math.cos(this.t * 7.1) * 1.5;
    } else {
      const a = this.t * 6.28;
      this.velX += (Math.cos(a) * 6 + Math.sin(this.t * 12.9) * 3) * power;
      this.velZ += (Math.sin(a) * 6 + Math.cos(this.t * 7.1) * 3) * power;
    }
    // Radial swell (goop puffs OUT on a slap) - vertical squash was jarring: it moved the tower
    // top, which dragged the camera up and down on every tap.
    this.swellVel += 2.4 * power;
    this.growPulse = Math.min(1.6, this.growPulse + 0.45 * power);
  }

  /** @returns world-space Y of the DISPLAYED tower top (after the sink), for framing/taps.
   *  `scroll` is the world scroll (index.ts) - the goop rides it until it has sunk SINK_MAX,
   *  so its foot leaves the frame glued to the departing counter and only the crown stays. */
  update(
    heightRaw: number,
    palette: ZonePalette,
    status: RunStatus,
    meltHot: boolean,
    combo: number,
    collapseTimer: number,
    scroll: number,
    dt: number,
  ): number {
    this.t += dt;

    // Height growth spring: under-damped follow so goop gains visibly push the tower up
    // (semi-implicit Euler; converges in ~0.5s with a whisker of overshoot).
    this.heightVel += ((heightRaw - this.renderedHeight) * H_STIFF - this.heightVel * H_DAMP) * dt;
    this.renderedHeight += this.heightVel * dt;
    if (this.renderedHeight < 0) this.renderedHeight = 0;
    // How hard we're growing right now (drives the surface "boil" + emissive shimmer).
    const growth = Math.min(1, Math.max(0, this.heightVel * 2.5) + this.growPulse);
    this.growPulse = Math.max(0, this.growPulse - dt * 2.2);

    // Collapse: slump the column down and spread it into a puddle as the timer runs out.
    const collapsing = status === 'collapsing';
    const dead = status === 'dead';
    const cProg = dead ? 0 : collapsing ? clamp(collapseTimer / balance.melt.collapseSeconds, 0, 1) : 1;
    const cAmt = 1 - cProg; // 0 = standing, 1 = fully melted

    // Full mesh size by GROW_RAW (the on-screen "getting bigger" show is the early game);
    // afterwards growth is told by the world scroll, not the body.
    const baseFill = clamp(this.renderedHeight / GROW_RAW, 0.03, 1);
    const fill = baseFill * (1 - cAmt * 0.92);

    // Sink: the goop rides the world scroll (foot glued to the departing counter) until only
    // its top remains in frame, then holds. Applied to the object so every world<->local
    // conversion (addBlob, topWorld) picks it up automatically.
    this.sink = towerSink(scroll);
    this.object.position.y = -0.7 - this.sink;

    // Age + ooze the slap-stacked blobs (every frame; the field samples them at fieldHz).
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i]!;
      b.age += dt;
      if (b.age > 0.8) {
        b.fy = Math.max(0.09, b.fy - dt * 0.045); // gravity ooze down the flank
        b.fx += (0.5 - b.fx) * dt * 0.35; // pulled into the body as it merges
        b.fz += (0.5 - b.fz) * dt * 0.35;
      }
      if (b.age > 2.8) this.blobs.splice(i, 1);
    }

    // Rebuild the metaball field at fieldHz (mobile: 30 Hz); transforms below still run every frame.
    this.fieldAcc += dt;
    if (this.fieldAcc >= this.fieldDt) {
      this.fieldAcc %= this.fieldDt;
      const bottom = 0.07;
      // 0.76 (not 0.8): ball centers + iso-surface extent must stay inside the marching-cubes
      // unit lattice, or a maxed tower's crown gets planar-clipped at the grid ceiling (the
      // "top of the goop cuts off" bug at Zone 15 heights).
      const top = bottom + fill * 0.76;
      const count = Math.max(3, Math.round(fill * 22));
      const mc = this.mc;
      mc.reset();
      // Base foot; slim while young (a fresh run starts as a cute blob, not a monolith), thickens
      // as the tower fills toward WIN, and swells/spreads into a puddle during collapse.
      const girth = 0.55 + fill * 0.75;
      mc.addBall(0.5, bottom, 0.5, (0.82 + fill * 0.85) + cAmt * 1.9, 10);
      const spread = cAmt * 0.34;
      if (spread > 0.001) {
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * Math.PI * 2 + this.t * 0.8;
          mc.addBall(0.5 + Math.cos(a) * spread, bottom, 0.5 + Math.sin(a) * spread, 1.2, 10);
        }
      }
      // Fluid body: every ball breathes (radius wobble) and drifts laterally; amplitude rises with
      // growth so an actively-fed tower visibly churns while a stalled one sits eerily still.
      // LUMPY by design - it's goop, not a bullet: each ball keeps a persistent pseudo-random
      // girth and lateral offset (hashed off its index, stable frame to frame), so the silhouette
      // reads as a stacked pile of blobs.
      const boil = 0.07 + growth * 0.2;
      for (let i = 0; i < count; i++) {
        const f = count === 1 ? 0 : i / (count - 1);
        const ny = bottom + f * (top - bottom);
        // Persistent per-blob character (deterministic hash of the blob index).
        const lumpR = 0.68 + 0.62 * (0.5 + 0.5 * Math.sin(i * 12.9898 + 4.98));
        const lumpX = 0.12 * Math.sin(i * 7.13 + 1.7);
        const lumpZ = 0.12 * Math.cos(i * 9.77 + 0.6);
        const swayX = 0.015 * Math.sin(f * 6 + this.renderedHeight) + 0.014 * Math.sin(this.t * 1.9 + i * 2.1) * (0.3 + f);
        const swayZ = 0.014 * Math.cos(this.t * 1.6 + i * 1.3) * (0.3 + f);
        const breathe = 1 + boil * Math.sin(this.t * 2.6 + i * 1.7);
        // Fresh goop swells the top of the tower right after a slap.
        const fresh = f > 0.75 ? this.growPulse * 0.5 * ((f - 0.75) / 0.25) : 0;
        mc.addBall(0.5 + lumpX + swayX, ny, 0.5 + lumpZ + swayZ, (0.85 + girth * 0.45) * lumpR * breathe + fresh, 10);
      }
      // Flank lumps: half-sunk side blobs at persistent pseudo-random heights, slowly oozing
      // downward - the drips and bulges that make it read as goo.
      const lumps = Math.max(3, Math.round(fill * 10));
      for (let j = 0; j < lumps; j++) {
        const fh = 0.5 + 0.5 * Math.sin(j * 5.23 + 2.1); // stable height fraction per lump
        const ooze = (this.t * 0.015 + j * 0.13) % 1; // slow downward creep
        const ly = bottom + Math.max(0.02, fh - ooze * 0.25) * (top - bottom);
        const la = j * 2.39996; // golden-angle spread around the column
        const lr = 0.2 + 0.06 * Math.sin(j * 3.7);
        mc.addBall(0.5 + Math.cos(la) * lr, ly, 0.5 + Math.sin(la) * lr, 0.35 + 0.18 * Math.sin(j * 8.1), 10);
      }
      // Slap-stacked goop: fresh blobs land where the finger hit, bulge, then ooze down the
      // flank and melt into the body. THIS is "taps build the tower" made literal.
      for (const b of this.blobs) {
        const rIn = Math.min(1, b.age / 0.22); // lands fast
        const rOut = clamp(1 - (b.age - 1.7) / 1.1, 0, 1); // melts in slowly
        const wob = 1 + 0.12 * Math.sin(this.t * 7 + b.fx * 40); // jelly quiver while fresh
        const r = b.r * rIn * rOut * wob;
        if (r > 0.03) mc.addBall(b.fx, Math.max(bottom + 0.01, Math.min(b.fy, top + 0.06)), b.fz, r, 10);
      }
      mc.update();
    }

    // Lean spring integration (semi-implicit Euler), pulled back toward upright.
    this.velX += (-STIFFNESS * this.leanX - DAMPING * this.velX) * dt;
    this.velZ += (-STIFFNESS * this.leanZ - DAMPING * this.velZ) * dt;
    this.leanX += this.velX * dt;
    this.leanZ += this.velZ * dt;
    if (collapsing) {
      // Flatten hard as it melts (overrides the squash spring); a slow drunken flop.
      this.squash = cAmt * 0.55;
      this.leanX += Math.sin(this.t * 2.1) * cAmt * 0.006;
    } else if (dead) {
      this.squash = 0.55;
    } else {
      // Squash relaxes to 0 (it is only ever set by the collapse path now).
      this.squashVel += (-90 * this.squash - 14 * this.squashVel) * dt;
      this.squash += this.squashVel * dt;
    }

    // Radial swell spring (slap feedback): puff out, then a couple of jelly bounces back.
    this.swellVel += (-85 * this.swell - 8.5 * this.swellVel) * dt;
    this.swell += this.swellVel * dt;
    const sw = clamp(this.swell, -0.1, 0.32);

    // Idle organic sway grows with combo and with melt danger (worsens as it heats up).
    const swayAmp = 0.02 + 0.03 * ((combo - 1) / 2) + this.warn * 0.06;
    const swayX = Math.sin(this.t * 1.3) * swayAmp;
    const swayZ = Math.cos(this.t * 1.03) * swayAmp * 0.8;

    // Apply lean as rotation about the base; taller towers lean more visibly. Clamped so spam
    // slapping wobbles the tower dramatically but can never pitch it out of frame.
    const leanScale = 0.6 + fill * 0.9;
    this.object.rotation.z = clamp((this.leanX + swayX) * leanScale, -0.17, 0.17);
    this.object.rotation.x = clamp(-(this.leanZ + swayZ) * leanScale, -0.17, 0.17);
    // Squash (collapse only) from the ground up + the radial slap swell.
    const sq = clamp(this.squash, -0.35, 0.5);
    this.object.scale.set(
      STAGE_SCALE * (1 + sq * 0.4) * (1 + sw),
      STAGE_SCALE * (1 - sq) * (1 + sw * 0.25),
      STAGE_SCALE * (1 + sq * 0.4) * (1 + sw),
    );

    // Colour: lerp toward the hot warning colour as the tower melts / collapses; a faint emissive
    // shimmer while growing makes passive income visible even with no clicks.
    const targetWarn = status === 'collapsing' || meltHot ? 1 : 0;
    this.warn += (targetWarn - this.warn) * (1 - Math.pow(0.02, dt));
    this.baseColor.set(palette.goop);
    this.tmp.copy(this.baseColor).lerp(this.warnColor, this.warn * 0.85);
    this.material.color.copy(this.tmp);
    const glow = this.warn * 0.4 + growth * 0.08 * (0.5 + 0.5 * Math.sin(this.t * 3.2));
    this.material.emissive.copy(this.warn > 0.02 ? this.warnColor : this.baseColor).multiplyScalar(glow);

    // Framing height: the DISPLAYED crown (mesh crown minus sink). IGNORE tap deformation
    // (swell) so the view never bobs per slap; the collapse slump lowers it (crown melts down
    // and out of the frame - the drip storm and puddle screen carry the beat from there).
    const fillTop = 0.07 + fill * 0.76;
    const camScaleY = collapsing || dead ? this.object.scale.y : 1;
    const crownFull = TOWER_WORLD_HEIGHT * STAGE_SCALE * fillTop * (collapsing || dead ? 1 - (1 - camScaleY / STAGE_SCALE) : 1);
    this.lastCrownFull = crownFull;
    return Math.max(0.2, crownFull - this.sink);
  }

  /** World position near the DISPLAYED tower top (for spawning splats at the impact point). */
  topWorld(out: THREE.Vector3): THREE.Vector3 {
    out.set(0, this.lastCrownFull * 0.94, 0).applyEuler(this.object.rotation);
    out.y += this.object.position.y;
    return out;
  }


  get debugHeight(): number {
    return this.renderedHeight;
  }

  /** Approximate ground footprint diameter (world units) - drives the contact shadow. */
  get groundFootprint(): number {
    const fill = Math.min(1, Math.max(0.03, this.renderedHeight / GROW_RAW));
    return (2.6 + fill * 2.4) * (1 + Math.max(0, this.swell) * 0.5);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
