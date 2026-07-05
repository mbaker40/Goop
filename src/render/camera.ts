/**
 * camera.ts — perspective camera + smooth dolly that keeps the tower top framed as it grows,
 * with a lazy idle orbit (PLAN §9.1 "smooth dolly … occasional slow orbit while idle").
 */

import * as THREE from 'three';

export class TowerCamera {
  readonly camera: THREE.PerspectiveCamera;
  private orbit = 0;
  /** Smoothed look-at height and camera distance (lerped toward targets each frame). */
  private lookY = 1;
  private dist = 8;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    this.camera.position.set(0, 2, 8);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * @param towerTopY  world-space height of the tower top.
   * @param orbiting   slow-orbit while idle (menu/win/puddle).
   */
  update(towerTopY: number, orbiting: boolean, dt: number): void {
    // Frame the whole tower: look at its midpoint, pull back proportional to its height.
    const targetLookY = towerTopY * 0.5 + 0.5;
    const targetDist = 6 + towerTopY * 1.15;
    const k = 1 - Math.pow(0.001, dt); // frame-rate-independent smoothing
    this.lookY += (targetLookY - this.lookY) * k;
    this.dist += (targetDist - this.dist) * k;

    if (orbiting) this.orbit += dt * 0.15;
    const x = Math.sin(this.orbit) * this.dist;
    const z = Math.cos(this.orbit) * this.dist;
    this.camera.position.set(x, this.lookY + this.dist * 0.35, z);
    this.camera.lookAt(0, this.lookY, 0);
  }
}
