/**
 * tower.ts — the marching-cubes goop tower (PLAN §9.1) + wobble/squash juice (PLAN §2.1, §9.1).
 *
 * The metaball field lives inside a base-pivoted Group so wobble (lean) and squash animate from the
 * ground up. A spring value carries the lean; clicks kick it (and a squash pulse); combo and the
 * melt-warning state raise the idle sway. Height still springs toward the sim's `heightRaw`.
 */

import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { WIN_HEIGHT } from '../config/zones';
import type { ZonePalette } from './palette';
import type { RunStatus } from './source';

const RESOLUTION = 40;
const TOWER_WORLD_HEIGHT = 10;
const RADIUS = 1.7;

// Wobble spring constants.
const STIFFNESS = 55;
const DAMPING = 7.5;

export class GoopTower {
  readonly object = new THREE.Group();
  private mc: MarchingCubes;
  private material: THREE.MeshPhysicalMaterial;
  private renderedHeight = 0;
  private warn = 0;

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

  constructor() {
    this.material = new THREE.MeshPhysicalMaterial({
      color: this.baseColor.clone(),
      roughness: 0.25,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.3,
      sheen: 0.5,
      emissive: new THREE.Color(0x000000),
    });
    this.mc = new MarchingCubes(RESOLUTION, this.material, true, false, 40000);
    this.mc.isolation = 60;
    this.mc.scale.set(RADIUS, TOWER_WORLD_HEIGHT / 2, RADIUS);
    this.mc.position.y = TOWER_WORLD_HEIGHT / 2; // base at group-local y = 0
    this.object.add(this.mc); // group pivots at the base (ground)
  }

  /** Kick the wobble spring + a squash pulse from a slap. */
  impact(): void {
    const a = this.t * 6.28;
    this.velX += Math.cos(a) * 6 + (Math.sin(this.t * 12.9) * 3);
    this.velZ += Math.sin(a) * 6 + (Math.cos(this.t * 7.1) * 3);
    this.squashVel += 9;
  }

  /** @returns world-space Y of the tower top (for camera framing), accounting for squash. */
  update(heightRaw: number, palette: ZonePalette, status: RunStatus, meltHot: boolean, combo: number, dt: number): number {
    this.t += dt;

    // Height spring.
    const hk = 1 - Math.pow(0.0025, dt);
    this.renderedHeight += (heightRaw - this.renderedHeight) * hk;

    const fill = clamp(this.renderedHeight / WIN_HEIGHT, 0.03, 1);
    const bottom = 0.1;
    const top = bottom + fill * 0.8;
    const count = Math.max(3, Math.round(fill * 22));
    const mc = this.mc;
    mc.reset();
    mc.addBall(0.5, bottom, 0.5, 1.7, 10);
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1);
      const ny = bottom + f * (top - bottom);
      const sway = 0.015 * Math.sin(f * 6 + this.renderedHeight);
      mc.addBall(0.5 + sway, ny, 0.5, 1.1, 10);
    }
    mc.update();

    // Lean spring integration (semi-implicit Euler), pulled back toward upright.
    this.velX += (-STIFFNESS * this.leanX - DAMPING * this.velX) * dt;
    this.velZ += (-STIFFNESS * this.leanZ - DAMPING * this.velZ) * dt;
    this.leanX += this.velX * dt;
    this.leanZ += this.velZ * dt;
    // Squash pulse springs back to 0.
    this.squashVel += (-90 * this.squash - 14 * this.squashVel) * dt;
    this.squash += this.squashVel * dt;

    // Idle organic sway grows with combo and with melt danger (worsens as it heats up).
    const swayAmp = 0.02 + 0.03 * ((combo - 1) / 2) + this.warn * 0.06;
    const swayX = Math.sin(this.t * 1.3) * swayAmp;
    const swayZ = Math.cos(this.t * 1.03) * swayAmp * 0.8;

    // Apply lean as rotation about the base; taller towers lean more visibly.
    const leanScale = 0.6 + fill * 0.9;
    this.object.rotation.z = (this.leanX + swayX) * leanScale;
    this.object.rotation.x = -(this.leanZ + swayZ) * leanScale;
    // Squash from the ground up.
    const sq = clamp(this.squash, -0.35, 0.5);
    this.object.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);

    // Colour: lerp toward the hot warning colour as the tower melts / collapses.
    const targetWarn = status === 'collapsing' || meltHot ? 1 : 0;
    this.warn += (targetWarn - this.warn) * (1 - Math.pow(0.02, dt));
    this.baseColor.set(palette.goop);
    this.tmp.copy(this.baseColor).lerp(this.warnColor, this.warn * 0.85);
    this.material.color.copy(this.tmp);
    this.material.emissive.copy(this.warnColor).multiplyScalar(this.warn * 0.4);

    return TOWER_WORLD_HEIGHT * top * this.object.scale.y;
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
