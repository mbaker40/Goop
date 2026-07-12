/**
 * camera.ts - perspective camera + smooth dolly that keeps the tower framed as it grows, plus an
 * **anchor** so the tower can be placed inside a DOM "stage" region rather than dead screen-centre
 * (PLAN §9.2 responsive HUD). The anchor pins the tower's BASE to a screen line (`yBase`, NDC
 * -1..1): the goop sits on that line and grows upward from it - on portrait phones the base hugs
 * the bottom of the stage instead of floating at mid-screen. A lazy idle orbit runs on the menu
 * (PLAN §9.1).
 */

import * as THREE from 'three';

export interface Anchor {
  /** Horizontal NDC (-1..1) the tower centres on. */
  x: number;
  /** Vertical NDC (-1..1) the tower BASE (world y=0) sits on. */
  yBase: number;
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
  private lastZoom = 1;
  private zoomBoost = 0;

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

  update(towerTopY: number, orbiting: boolean, dt: number, anchor: Anchor = { x: 0, yBase: -0.45 }, zoom = 1): void {
    this.pulseDist = Math.max(0, this.pulseDist - this.pulseDist * 1.6 * dt);
    const targetLookY = towerTopY * 0.5 + 0.5;
    const targetDist = (6 + towerTopY * 1.15) * zoom + this.pulseDist;
    const k = 1 - Math.pow(0.001, dt);
    this.lookY += (targetLookY - this.lookY) * k;
    // Distance eases SLOWLY (~2s time constant): during a growth spurt the goop visibly
    // outgrows the frame before the camera pulls back - "the goop grows and the camera scales
    // with it", not "the world shrinks". The zoom BUTTON stays snappy via a short boost.
    if (zoom !== this.lastZoom) {
      this.lastZoom = zoom;
      this.zoomBoost = 1;
    }
    this.zoomBoost = Math.max(0, this.zoomBoost - dt);
    const tau = this.zoomBoost > 0 ? 0.35 : 2.1;
    const kDist = 1 - Math.exp(-dt / tau);
    this.dist += (targetDist - this.dist) * kDist;
    // Bound the lag: the goop may overflow the frame by ~20% during a spurt, never more (the
    // mock's 30-second WIN ramp otherwise leaves the camera hopelessly behind).
    if (this.dist < targetDist * 0.82) this.dist = targetDist * 0.82;

    // The camera pans so its LOOK point (tower mid, lookY) lands on anchorY. To pin the BASE
    // (world y=0) to `yBase` instead, offset the look-point anchor upward by the base→look-point
    // world distance expressed in NDC at the current framing. Clamped so very tall towers still
    // keep their top on screen.
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const halfH = Math.tan(fov / 2) * this.dist;
    const anchorYTarget = clamp(anchor.yBase + this.lookY / halfH, -0.9, 0.9);

    // Glide the anchor so layout/orientation changes don't snap.
    const ak = 1 - Math.pow(0.02, dt);
    this.anchorX += (anchor.x - this.anchorX) * ak;
    this.anchorY += (anchorYTarget - this.anchorY) * ak;

    if (orbiting) {
      this.orbit += dt * 0.15;
    } else {
      // Settle back to the front view during runs: the cardboard cutouts are world-oriented
      // (their thickness edge shows via a per-prop tilt), so gameplay is always seen from front.
      const home = Math.round(this.orbit / (Math.PI * 2)) * Math.PI * 2;
      this.orbit += (home - this.orbit) * Math.min(1, 2.5 * dt);
    }

    // Convert the NDC anchor into a world-space camera pan at the tower's distance.
    const halfW = halfH * this.camera.aspect;
    const panX = -this.anchorX * halfW;
    const panY = -this.anchorY * halfH;

    const ox = Math.sin(this.orbit) * this.dist;
    const oz = Math.cos(this.orbit) * this.dist;
    this.camera.position.set(ox + panX, this.lookY + this.dist * 0.35 + panY, oz);
    this.camera.lookAt(panX, this.lookY + panY, 0);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
