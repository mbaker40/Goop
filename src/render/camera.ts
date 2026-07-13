/**
 * camera.ts - the FLAT SIDE-VIEW stage camera (2026-07 view rework).
 *
 * Orthographic, locked front-on: the scene reads like a paper diorama, which is what the
 * cardboard-cutout art wants, and - the real reason - it makes GROWTH legible. A perspective
 * camera confounds three signals (dolly-back, prop rescaling, goop growth); an ortho frame is
 * a fixed ruler. Growth now presents in two phases:
 *
 *   1. GROW-IN: while the tower is short the frame holds still and the goop visibly gets
 *      bigger inside it (a smear becomes half the screen).
 *   2. SCROLL: once the goop top clears the headroom line the camera RISES with it, so the
 *      world (counter, houses, clouds, Moon - all parked at absolute altitudes) streams
 *      DOWNWARD past you. Rising past a water tower is unambiguous scale.
 *
 * The camera rise eases (~1.5s) so growth spurts push the crown up-screen before the frame
 * catches up - "the goop grew" stays the perceived cause. The `anchor` keeps the tower inside
 * the DOM stage region (portrait vs landscape HUD layouts), same contract as before.
 */

import * as THREE from 'three';

export interface Anchor {
  /** Horizontal NDC (-1..1) the tower centres on. */
  x: number;
  /** Vertical NDC (-1..1) the tower BASE (world y=0) sits on (used during grow-in). */
  yBase: number;
}

/** Stage size at zoom 1: the frame is WIDTH-driven in portrait (the cutout arc must fit) and
 *  HEIGHT-driven in landscape. */
const VIEW_H = 12;
const VIEW_W = 9.4;
/** NDC line the goop's base (world y=0) sits on - CONSTANT for the whole game. The goop grows
 *  within this fixed frame (its 9x growth is the primary cue) while the WORLD scrolls down
 *  behind it (the altitude cue). One frame, no phases, nothing to mis-read. */
const BASE_NDC = -0.92;

export class TowerCamera {
  readonly camera: THREE.OrthographicCamera;
  private aspect: number;
  private cy = VIEW_H * 0.5 - 1; // frame centre (world y)
  private cx = 0;
  private viewH = VIEW_H;
  /** Temporary zoom-out pulse (zone transitions); decays back to 0. */
  private pulseAmt = 0;
  private lastZoom = 1;
  private zoomBoost = 0;

  constructor(aspect: number) {
    this.aspect = aspect;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
    this.camera.position.set(0, this.cy, 60);
    this.applyFrustum();
  }

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.applyFrustum();
  }

  private applyFrustum(): void {
    const halfH = this.viewH / 2;
    const halfW = halfH * this.aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  /** One-shot dramatic zoom-out (zone transitions, boss beats). */
  pulse(strength = 2.6): void {
    this.pulseAmt = Math.min(5, this.pulseAmt + strength * 0.6);
  }

  update(_towerTopY: number, _orbiting: boolean, dt: number, anchor: Anchor = { x: 0, yBase: -0.45 }, zoom = 1): void {
    this.pulseAmt = Math.max(0, this.pulseAmt - this.pulseAmt * 1.6 * dt);

    // Frame height: zoom multiplies the stage; the button stays snappy via a boost window.
    if (zoom !== this.lastZoom) {
      this.lastZoom = zoom;
      this.zoomBoost = 1;
    }
    this.zoomBoost = Math.max(0, this.zoomBoost - dt);
    const targetH = Math.max(VIEW_H, VIEW_W / Math.max(0.2, this.aspect)) * zoom + this.pulseAmt;
    const kH = 1 - Math.exp(-dt / (this.zoomBoost > 0 ? 0.3 : 1.2));
    this.viewH += (targetH - this.viewH) * kH;

    // Fixed vertical framing: the base line never moves.
    const halfH = this.viewH / 2;
    const baseCy = -BASE_NDC * halfH; // world y=0 lands on the base line
    const kC = 1 - Math.exp(-dt / 0.6); // only zoom changes move it
    this.cy += (baseCy - this.cy) * kC;

    // Horizontal anchor glide (portrait/landscape stage offsets).
    const halfW = halfH * this.aspect;
    const ak = 1 - Math.pow(0.02, dt);
    this.cx += (-anchor.x * halfW - this.cx) * ak;

    this.applyFrustum();
    this.camera.position.set(this.cx, this.cy, 60);
    this.camera.lookAt(this.cx, this.cy, 0);
  }
}
