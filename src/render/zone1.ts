/**
 * zone1.ts — minimal environment (PLAN §3 Zone 1 / §9.1). A gradient sky, a ground plane, and one
 * primitive sight-gag (the giant salt shaker). Zone changes CROSSFADE (PLAN §9.1 "environment
 * crossfade") instead of hard-cutting: the live palette lerps toward the new zone's over ~1.5s,
 * the sky gradient is redrawn while blending, and the ground fades out as the tower leaves the
 * planet. Full per-zone set-dressing is a later slice.
 */

import * as THREE from 'three';
import type { ZonePalette } from './palette';

const FADE_K = 2.2; // palette lerp rate (≈1.5s to settle)

export class Environment {
  readonly group = new THREE.Group();
  private ground: THREE.Mesh;
  private groundMat: THREE.MeshStandardMaterial;
  private shaker: THREE.Group;
  private skyTex: THREE.CanvasTexture;
  private skyCanvas: HTMLCanvasElement;
  private currentZone = -1;
  private blending = false;

  // Live (displayed) colours, lerped toward the target palette each frame.
  private skyTop = new THREE.Color();
  private skyBottom = new THREE.Color();
  private groundCol = new THREE.Color();
  private fogCol = new THREE.Color();
  private tSkyTop = new THREE.Color();
  private tSkyBottom = new THREE.Color();
  private tGround = new THREE.Color();
  private tFog = new THREE.Color();
  private groundAlpha = 1;

  constructor() {
    // Gradient sky as a screen background texture.
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 4;
    this.skyCanvas.height = 256;
    this.skyTex = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;

    // Ground.
    this.groundMat = new THREE.MeshStandardMaterial({ color: 0xd9c7a3, roughness: 0.9, metalness: 0, transparent: true });
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.02;
    this.group.add(this.ground);

    // Sight gag: a giant salt shaker off to the side.
    const shakerBody = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5, metalness: 0.1 });
    this.shaker = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 3.2, 24), shakerBody);
    body.position.y = 1.6;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xc0c4cc, roughness: 0.4, metalness: 0.4 }),
    );
    cap.position.y = 3.2;
    this.shaker.add(body, cap);
    this.shaker.position.set(7.5, 0, -3);
    this.shaker.scale.setScalar(1.1);
    this.group.add(this.shaker);
  }

  /** Advance toward the current zone's palette; call every frame. Returns true on a zone CHANGE. */
  apply(scene: THREE.Scene, zoneIndex: number, palette: ZonePalette, dt: number): boolean {
    let changed = false;
    if (zoneIndex !== this.currentZone) {
      const first = this.currentZone === -1;
      this.currentZone = zoneIndex;
      this.tSkyTop.setHex(palette.skyTop);
      this.tSkyBottom.setHex(palette.skyBottom);
      this.tGround.setHex(palette.ground);
      this.tFog.setHex(palette.fog);
      if (first) {
        // Boot: snap, no fade-in from black.
        this.skyTop.copy(this.tSkyTop);
        this.skyBottom.copy(this.tSkyBottom);
        this.groundCol.copy(this.tGround);
        this.fogCol.copy(this.tFog);
      } else {
        changed = true;
      }
      this.blending = true;
    }

    if (this.blending) {
      const k = Math.min(1, FADE_K * dt);
      this.skyTop.lerp(this.tSkyTop, k);
      this.skyBottom.lerp(this.tSkyBottom, k);
      this.groundCol.lerp(this.tGround, k);
      this.fogCol.lerp(this.tFog, k);
      this.redrawSky(scene);
      if (scene.fog) (scene.fog as THREE.Fog).color.copy(this.fogCol);
      this.groundMat.color.copy(this.groundCol);
      // Close enough → stop redrawing the sky every frame.
      if (this.skyTop.getHex() === this.tSkyTop.getHex() && this.skyBottom.getHex() === this.tSkyBottom.getHex()) {
        this.blending = false;
      }
    }

    // Later zones are in space — fade the ground/props out as we leave the planet.
    const grounded = zoneIndex <= 3;
    const targetAlpha = grounded ? 1 : 0;
    if (Math.abs(this.groundAlpha - targetAlpha) > 0.005) {
      this.groundAlpha += (targetAlpha - this.groundAlpha) * Math.min(1, FADE_K * dt);
      this.groundMat.opacity = this.groundAlpha;
      this.ground.visible = this.groundAlpha > 0.02;
      this.shaker.visible = this.groundAlpha > 0.02;
      this.shaker.scale.setScalar(1.1 * (0.2 + 0.8 * this.groundAlpha));
    }
    return changed;
  }

  private redrawSky(scene: THREE.Scene): void {
    const ctx = this.skyCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, this.skyCanvas.height);
    grad.addColorStop(0, '#' + this.skyTop.getHexString());
    grad.addColorStop(1, '#' + this.skyBottom.getHexString());
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.skyCanvas.width, this.skyCanvas.height);
    this.skyTex.needsUpdate = true;
    scene.background = this.skyTex;
  }
}
