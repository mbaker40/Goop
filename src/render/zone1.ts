/**
 * zone1.ts — minimal environment (PLAN §3 Zone 1 / §9.1). A gradient sky, a ground plane, and one
 * primitive sight-gag (the giant salt shaker). Retints per current zone so climbing already reads
 * as an environment shift; full per-zone set-dressing is the next slice.
 */

import * as THREE from 'three';
import type { ZonePalette } from './palette';

export class Environment {
  readonly group = new THREE.Group();
  private ground: THREE.Mesh;
  private shakerBody: THREE.MeshStandardMaterial;
  private skyTex: THREE.CanvasTexture;
  private skyCanvas: HTMLCanvasElement;
  private currentZone = -1;

  constructor() {
    // Gradient sky as a screen background texture.
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 4;
    this.skyCanvas.height = 256;
    this.skyTex = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;

    // Ground.
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xd9c7a3, roughness: 0.9, metalness: 0 });
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.02;
    this.group.add(this.ground);

    // Sight gag: a giant salt shaker off to the side.
    this.shakerBody = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5, metalness: 0.1 });
    const shaker = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 3.2, 24), this.shakerBody);
    body.position.y = 1.6;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xc0c4cc, roughness: 0.4, metalness: 0.4 }),
    );
    cap.position.y = 3.2;
    shaker.add(body, cap);
    shaker.position.set(7.5, 0, -3);
    shaker.scale.setScalar(1.1);
    this.group.add(shaker);
  }

  /** Apply a zone's palette to sky/fog/ground. Cheap; only redraws the sky on an actual change. */
  apply(scene: THREE.Scene, zoneIndex: number, palette: ZonePalette): void {
    if (zoneIndex === this.currentZone) return;
    this.currentZone = zoneIndex;

    const ctx = this.skyCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, this.skyCanvas.height);
    grad.addColorStop(0, '#' + palette.skyTop.toString(16).padStart(6, '0'));
    grad.addColorStop(1, '#' + palette.skyBottom.toString(16).padStart(6, '0'));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.skyCanvas.width, this.skyCanvas.height);
    this.skyTex.needsUpdate = true;
    scene.background = this.skyTex;

    if (scene.fog) (scene.fog as THREE.Fog).color.setHex(palette.fog);
    (this.ground.material as THREE.MeshStandardMaterial).color.setHex(palette.ground);
    // Later zones are in space — hide the ground/props once we leave the ground.
    const grounded = zoneIndex <= 3;
    this.ground.visible = grounded;
  }
}
