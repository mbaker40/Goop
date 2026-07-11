/**
 * tower.ts — the marching-cubes goop tower (PLAN §9.1) + wobble/squash juice (PLAN §2.1, §9.1).
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
import { WIN_HEIGHT } from '../config/zones';
import { balance } from '../config/balance';
import type { ZonePalette } from './palette';
import type { RunStatus } from './source';

const TOWER_WORLD_HEIGHT = 10;
const RADIUS = 1.7;

// Wobble spring constants.
const STIFFNESS = 55;
const DAMPING = 7.5;

// Height growth spring (under-damped so gains have visible follow-through).
const H_STIFF = 16;
const H_DAMP = 6.5;

export class GoopTower {
  readonly object = new THREE.Group();
  private mc: MarchingCubes;
  private material: THREE.MeshPhysicalMaterial;
  private renderedHeight = 0;
  private heightVel = 0;
  private warn = 0;
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
    this.squashVel += 9 * power;
    this.growPulse = Math.min(1.6, this.growPulse + 0.45 * power);
  }

  /** @returns world-space Y of the tower top (for camera framing), accounting for squash. */
  update(
    heightRaw: number,
    palette: ZonePalette,
    status: RunStatus,
    meltHot: boolean,
    combo: number,
    collapseTimer: number,
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

    const baseFill = clamp(this.renderedHeight / WIN_HEIGHT, 0.03, 1);
    const fill = baseFill * (1 - cAmt * 0.92);

    // Rebuild the metaball field at fieldHz (mobile: 30 Hz); transforms below still run every frame.
    this.fieldAcc += dt;
    if (this.fieldAcc >= this.fieldDt) {
      this.fieldAcc %= this.fieldDt;
      const bottom = 0.07;
      const top = bottom + fill * 0.8;
      const count = Math.max(3, Math.round(fill * 22));
      const mc = this.mc;
      mc.reset();
      // Base foot; slim while young (a fresh run starts as a cute blob, not a monolith), thickens
      // as the tower fills toward WIN, and swells/spreads into a puddle during collapse.
      const girth = 0.55 + fill * 0.75;
      mc.addBall(0.5, bottom, 0.5, (0.95 + fill * 0.75) + cAmt * 1.9, 10);
      const spread = cAmt * 0.34;
      if (spread > 0.001) {
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * Math.PI * 2 + this.t * 0.8;
          mc.addBall(0.5 + Math.cos(a) * spread, bottom, 0.5 + Math.sin(a) * spread, 1.2, 10);
        }
      }
      // Fluid body: every ball breathes (radius wobble) and drifts laterally; amplitude rises with
      // growth so an actively-fed tower visibly churns while a stalled one sits eerily still.
      const boil = 0.05 + growth * 0.16;
      for (let i = 0; i < count; i++) {
        const f = count === 1 ? 0 : i / (count - 1);
        const ny = bottom + f * (top - bottom);
        const swayX = 0.015 * Math.sin(f * 6 + this.renderedHeight) + 0.012 * Math.sin(this.t * 1.9 + i * 2.1) * (0.3 + f);
        const swayZ = 0.012 * Math.cos(this.t * 1.6 + i * 1.3) * (0.3 + f);
        const breathe = 1 + boil * Math.sin(this.t * 2.6 + i * 1.7);
        // Fresh goop swells the top of the tower right after a slap.
        const fresh = f > 0.75 ? this.growPulse * 0.5 * ((f - 0.75) / 0.25) : 0;
        mc.addBall(0.5 + swayX, ny, 0.5 + swayZ, (0.85 + girth * 0.45) * breathe + fresh, 10);
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
      // Squash pulse springs back to 0.
      this.squashVel += (-90 * this.squash - 14 * this.squashVel) * dt;
      this.squash += this.squashVel * dt;
    }

    // Idle organic sway grows with combo and with melt danger (worsens as it heats up).
    const swayAmp = 0.02 + 0.03 * ((combo - 1) / 2) + this.warn * 0.06;
    const swayX = Math.sin(this.t * 1.3) * swayAmp;
    const swayZ = Math.cos(this.t * 1.03) * swayAmp * 0.8;

    // Apply lean as rotation about the base; taller towers lean more visibly. Clamped so spam
    // slapping wobbles the tower dramatically but can never pitch it out of frame.
    const leanScale = 0.6 + fill * 0.9;
    this.object.rotation.z = clamp((this.leanX + swayX) * leanScale, -0.17, 0.17);
    this.object.rotation.x = clamp(-(this.leanZ + swayZ) * leanScale, -0.17, 0.17);
    // Squash from the ground up.
    const sq = clamp(this.squash, -0.35, 0.5);
    this.object.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);

    // Colour: lerp toward the hot warning colour as the tower melts / collapses; a faint emissive
    // shimmer while growing makes passive income visible even with no clicks.
    const targetWarn = status === 'collapsing' || meltHot ? 1 : 0;
    this.warn += (targetWarn - this.warn) * (1 - Math.pow(0.02, dt));
    this.baseColor.set(palette.goop);
    this.tmp.copy(this.baseColor).lerp(this.warnColor, this.warn * 0.85);
    this.material.color.copy(this.tmp);
    const glow = this.warn * 0.4 + growth * 0.08 * (0.5 + 0.5 * Math.sin(this.t * 3.2));
    this.material.emissive.copy(this.warn > 0.02 ? this.warnColor : this.baseColor).multiplyScalar(glow);

    const fillTop = 0.07 + fill * 0.8;
    return TOWER_WORLD_HEIGHT * fillTop * this.object.scale.y;
  }

  /** World position near the tower top (for spawning splats at the impact point). */
  topWorld(out: THREE.Vector3): THREE.Vector3 {
    return out.set(0, TOWER_WORLD_HEIGHT * 0.55 * this.object.scale.y, 0).applyEuler(this.object.rotation);
  }

  get debugHeight(): number {
    return this.renderedHeight;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
