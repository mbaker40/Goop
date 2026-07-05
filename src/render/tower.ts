/**
 * tower.ts — the marching-cubes goop tower (PLAN §9.1: shippable metaball path before raymarch).
 * A vertical stack of metaballs whose fill grows with the (interpolated) tower height. Glossy
 * "goop" material tinted per zone; shifts toward a hot warning colour as the tower melts.
 *
 * Height interpolation lives here: `renderedHeight` springs toward the sim's `heightRaw` so growth
 * reads as smooth goop motion (and gives wobble a home in the next slice).
 */

import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { WIN_HEIGHT } from '../config/zones';
import type { ZonePalette } from './palette';
import type { RunStatus } from './source';

const RESOLUTION = 40;
const TOWER_WORLD_HEIGHT = 10; // world units for a "full" (WIN-height) tower
const RADIUS = 1.7;

export class GoopTower {
  readonly object: MarchingCubes;
  private material: THREE.MeshPhysicalMaterial;
  private renderedHeight = 0;
  private warn = 0; // 0 = healthy, 1 = fully hot (melting/collapsing)
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
    this.object = new MarchingCubes(RESOLUTION, this.material, true, false, 40000);
    this.object.isolation = 60;
    this.object.scale.set(RADIUS, TOWER_WORLD_HEIGHT / 2, RADIUS);
    this.object.position.y = TOWER_WORLD_HEIGHT / 2; // base sits at world y = 0
  }

  /**
   * Advance one frame.
   * @returns world-space Y of the tower top (for camera framing).
   */
  update(heightRaw: number, palette: ZonePalette, status: RunStatus, meltHot: boolean, dt: number): number {
    // Spring the rendered height toward the sim height for smooth goop growth.
    const k = 1 - Math.pow(0.0025, dt);
    this.renderedHeight += (heightRaw - this.renderedHeight) * k;

    const fill = clamp(this.renderedHeight / WIN_HEIGHT, 0.03, 1);
    const bottom = 0.1;
    const top = bottom + fill * 0.8;
    const count = Math.max(3, Math.round(fill * 22));

    const mc = this.object;
    mc.reset();
    // A goopy foot at the base.
    mc.addBall(0.5, bottom, 0.5, 1.7, 10);
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1);
      const ny = bottom + f * (top - bottom);
      // A touch of sway so the column never looks like a dead cylinder (wobble comes next slice).
      const sway = 0.015 * Math.sin(f * 6 + this.renderedHeight);
      mc.addBall(0.5 + sway, ny, 0.5, 1.1, 10);
    }
    mc.update();

    // Colour: lerp toward the hot warning colour as the tower melts / collapses.
    const targetWarn = status === 'collapsing' || meltHot ? 1 : 0;
    this.warn += (targetWarn - this.warn) * (1 - Math.pow(0.02, dt));
    this.baseColor.set(palette.goop);
    this.tmp.copy(this.baseColor).lerp(this.warnColor, this.warn * 0.85);
    this.material.color.copy(this.tmp);
    this.material.emissive.copy(this.warnColor).multiplyScalar(this.warn * 0.4);

    return TOWER_WORLD_HEIGHT * top;
  }

  /** For diagnostics/tests. */
  get debugHeight(): number {
    return this.renderedHeight;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
