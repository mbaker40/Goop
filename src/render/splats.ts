/**
 * splats.ts — goop droplet bursts on each slap (PLAN §2.1 "SPLATS on … ripple").
 * A small InstancedMesh pool; each slap flings a handful of droplets that arc out under gravity and
 * shrink away. Cheap (one draw call, fixed pool) and degrades to nothing when idle.
 */

import * as THREE from 'three';

const POOL = 96;
const PER_BURST = 7;
const GRAVITY = -14;

interface Droplet {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
}

export class SplatSystem {
  readonly object: THREE.InstancedMesh;
  private material: THREE.MeshStandardMaterial;
  private drops: Droplet[] = [];
  private cursor = 0;
  private dummy = new THREE.Object3D();
  private active = 0;

  constructor() {
    const geo = new THREE.SphereGeometry(0.16, 10, 8);
    this.material = new THREE.MeshStandardMaterial({ color: 0xb6e84a, roughness: 0.3, metalness: 0 });
    this.object = new THREE.InstancedMesh(geo, this.material, POOL);
    this.object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.object.frustumCulled = false;
    for (let i = 0; i < POOL; i++) {
      this.drops.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, max: 1, size: 1 });
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

  /** Fling a handful of droplets from `origin`, tinted `color`. */
  burst(origin: THREE.Vector3, color: number): void {
    this.material.color.setHex(color);
    for (let i = 0; i < PER_BURST; i++) {
      const d = this.drops[this.cursor]!;
      this.cursor = (this.cursor + 1) % POOL;
      d.pos.copy(origin);
      // random outward + upward
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 4;
      d.vel.set(Math.cos(a) * r, 4 + Math.random() * 5, Math.sin(a) * r);
      d.max = 0.5 + Math.random() * 0.4;
      d.life = d.max;
      d.size = 0.6 + Math.random() * 0.8;
    }
  }

  update(dt: number): void {
    let active = 0;
    for (let i = 0; i < POOL; i++) {
      const d = this.drops[i]!;
      if (d.life <= 0) {
        continue;
      }
      d.life -= dt;
      d.vel.y += GRAVITY * dt;
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
