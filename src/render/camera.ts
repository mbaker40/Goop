/**
 * camera.ts — perspective camera + smooth dolly that keeps the tower framed as it grows, plus a
 * lateral/vertical **anchor** so the tower can be placed inside a DOM "stage" region rather than dead
 * screen-centre (PLAN §9.2 responsive HUD). Anchor is given in NDC (-1..1, x right / y up); {0,0}
 * centres. A lazy idle orbit runs on the menu (PLAN §9.1).
 */

import * as THREE from 'three';

export interface Anchor {
  x: number;
  y: number;
}

export class TowerCamera {
  readonly camera: THREE.PerspectiveCamera;
  private orbit = 0;
  private lookY = 1;
  private dist = 8;
  private anchorX = 0;
  private anchorY = 0;
  /** Temporary extra pull-back (zone-transition moment, PLAN §9.1); decays back to 0. */
  private pulseDist = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    this.camera.position.set(0, 2, 8);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** One-shot dramatic pull-back (fired on zone transitions). */
  pulse(strength = 2.6): void {
    this.pulseDist = Math.min(6, this.pulseDist + strength);
  }

  update(towerTopY: number, orbiting: boolean, dt: number, anchor: Anchor = { x: 0, y: 0 }): void {
    this.pulseDist = Math.max(0, this.pulseDist - this.pulseDist * 1.6 * dt);
    const targetLookY = towerTopY * 0.5 + 0.5;
    const targetDist = 6 + towerTopY * 1.15 + this.pulseDist;
    const k = 1 - Math.pow(0.001, dt);
    this.lookY += (targetLookY - this.lookY) * k;
    this.dist += (targetDist - this.dist) * k;

    // Glide the anchor so layout/orientation changes don't snap.
    const ak = 1 - Math.pow(0.02, dt);
    this.anchorX += (anchor.x - this.anchorX) * ak;
    this.anchorY += (anchor.y - this.anchorY) * ak;

    if (orbiting) this.orbit += dt * 0.15;

    // Convert the NDC anchor into a world-space camera pan at the tower's distance.
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const halfH = Math.tan(fov / 2) * this.dist;
    const halfW = halfH * this.camera.aspect;
    const panX = -this.anchorX * halfW;
    const panY = -this.anchorY * halfH;

    const ox = Math.sin(this.orbit) * this.dist;
    const oz = Math.cos(this.orbit) * this.dist;
    this.camera.position.set(ox + panX, this.lookY + this.dist * 0.35 + panY, oz);
    this.camera.lookAt(panX, this.lookY + panY, 0);
  }
}
