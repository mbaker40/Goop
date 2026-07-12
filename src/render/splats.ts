/**
 * splats.ts — goop droplet bursts on each slap (PLAN §2.1 "SPLATS on … ripple") plus ambient
 * producer effects. A small InstancedMesh pool with PER-INSTANCE colour (so a click splat, a
 * collapse drip and a Goop Cannon shot can coexist without recolouring each other); each droplet
 * arcs out under gravity and shrinks away. Cheap (one draw call, fixed pool).
 */

import * as THREE from 'three';

const POOL = 128;
const GRAVITY = -14;

export interface BurstOptions {
  /** Droplets in this burst. */
  count?: number;
  /** Droplet size multiplier. */
  size?: number;
  /** Outward (radial) speed. */
  out?: number;
  /** Upward speed. */
  up?: number;
  /** Extra base velocity added to every droplet (for directed shots like the Goop Cannon). */
  vel?: THREE.Vector3;
  /** Gravity multiplier for this burst (goopcopter droplets hover; cannon shots arc hard). */
  gravity?: number;
  /** Lifespan multiplier. */
  life?: number;
}

interface Droplet {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  gravity: number;
}

export class SplatSystem {
  readonly object: THREE.InstancedMesh;
  private drops: Droplet[] = [];
  private cursor = 0;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private active = 0;

  constructor() {
    const geo = new THREE.SphereGeometry(0.16, 10, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0 });
    this.object = new THREE.InstancedMesh(geo, material, POOL);
    this.object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Allocate per-instance colours up front (three lazily creates instanceColor on first set).
    this.object.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(POOL * 3).fill(1), 3);
    this.object.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.object.frustumCulled = false;
    for (let i = 0; i < POOL; i++) {
      this.drops.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, max: 1, size: 1, gravity: 1 });
    }
    this.hideAll();
  }

  private hideAll(): void {
    this.dummy.scale.setScalar(0);
    this.dummy.position.set(0, -999, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < POOL; i++) this.object.setMatrixAt(i, this.dummy.matrix);
    this.object.instanceMatrix.needsUpdate = true;
  }

  /** Blobs that CONVERGE on `target` and are absorbed there (PLAN §2.1 "a goop blob launches …
   *  and SPLATS on"). They spawn on a loose ring around the target, fly straight in over their
   *  short lifetime and shrink away exactly on arrival — reading as goop being ADDED to the
   *  tower, not knocked off it. */
  absorb(target: THREE.Vector3, color: number, opts: { count?: number; size?: number; radius?: number } = {}): void {
    const count = opts.count ?? 5;
    const sizeMul = opts.size ?? 1;
    const radius = opts.radius ?? 2.4;
    this.color.setHex(color);
    for (let i = 0; i < count; i++) {
      const d = this.drops[this.cursor]!;
      const slot = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      const a = Math.random() * Math.PI * 2;
      const r = radius * (0.7 + Math.random() * 0.6);
      d.pos.set(target.x + Math.cos(a) * r, target.y + (Math.random() - 0.2) * r * 0.9, target.z + Math.sin(a) * r);
      const flight = 0.16 + Math.random() * 0.12;
      d.vel.copy(target).sub(d.pos).divideScalar(flight);
      d.max = flight;
      d.life = flight;
      d.size = (0.8 + Math.random() * 0.7) * sizeMul;
      d.gravity = 0; // straight merge, no arc
      this.object.setColorAt(slot, this.color);
    }
    if (this.object.instanceColor) this.object.instanceColor.needsUpdate = true;
  }

  /** Fling a handful of droplets from `origin`, tinted `color`, shaped by `opts`. */
  burst(origin: THREE.Vector3, color: number, opts: BurstOptions = {}): void {
    const count = opts.count ?? 7;
    const sizeMul = opts.size ?? 1;
    const out = opts.out ?? 3;
    const up = opts.up ?? 5;
    const lifeMul = opts.life ?? 1;
    this.color.setHex(color);
    for (let i = 0; i < count; i++) {
      const d = this.drops[this.cursor]!;
      const slot = this.cursor;
      this.cursor = (this.cursor + 1) % POOL;
      d.pos.copy(origin);
      // random outward + upward
      const a = Math.random() * Math.PI * 2;
      const r = out * (0.6 + Math.random() * 0.8);
      d.vel.set(Math.cos(a) * r, up * (0.7 + Math.random() * 0.6), Math.sin(a) * r);
      if (opts.vel) d.vel.add(opts.vel);
      d.max = (0.5 + Math.random() * 0.4) * lifeMul;
      d.life = d.max;
      d.size = (0.6 + Math.random() * 0.8) * sizeMul;
      d.gravity = opts.gravity ?? 1;
      this.object.setColorAt(slot, this.color);
    }
    if (this.object.instanceColor) this.object.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let active = 0;
    for (let i = 0; i < POOL; i++) {
      const d = this.drops[i]!;
      if (d.life <= 0) {
        continue;
      }
      d.life -= dt;
      d.vel.y += GRAVITY * d.gravity * dt;
      d.pos.addScaledVector(d.vel, dt);
      if (d.pos.y < 0) {
        d.pos.y = 0;
        d.vel.y *= -0.35;
        d.vel.x *= 0.6;
        d.vel.z *= 0.6;
      }
      const k = Math.max(0, d.life / d.max);
      this.dummy.position.copy(d.pos);
      this.dummy.scale.setScalar(d.size * (0.4 + 0.6 * k));
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.object.setMatrixAt(i, this.dummy.matrix);
      active++;
    }
    if (active > 0 || this.active > 0) this.object.instanceMatrix.needsUpdate = true;
    // Park just-expired droplets out of view once.
    if (active < this.active) {
      for (let i = 0; i < POOL; i++) {
        if (this.drops[i]!.life <= 0) {
          this.dummy.position.set(0, -999, 0);
          this.dummy.scale.setScalar(0);
          this.dummy.updateMatrix();
          this.object.setMatrixAt(i, this.dummy.matrix);
        }
      }
    }
    this.active = active;
  }

  get activeCount(): number {
    return this.active;
  }
}
