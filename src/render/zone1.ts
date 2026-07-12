/**
 * zone1.ts — the environment (PLAN §3 / §9.1). A gradient sky, a ground plane, one primitive
 * sight-gag (the giant salt shaker), and a starfield for the space altitudes.
 *
 * The environment is a CONTINUOUS ascent: sky/fog/ground blend smoothly with ALTITUDE
 * (palette.ts paletteAt), like a balloon ride — warm kitchen light thins into attic dust, blue
 * sky, stratosphere haze, then black starfield. There is no per-zone color cut; zone identity is
 * carried by the toast/sting and the fixed-altitude scale markers (markers.ts). The ground (and
 * its props) fade out as the tower leaves the planet, and the stars fade in.
 */

import * as THREE from 'three';
import { paletteAt, type ZonePalette } from './palette';

export class Environment {
  readonly group = new THREE.Group();
  private ground: THREE.Mesh;
  private groundMat: THREE.MeshStandardMaterial;
  private shaker: THREE.Group;
  private skyTex: THREE.CanvasTexture;
  private skyCanvas: HTMLCanvasElement;
  private stars: THREE.Points;
  private starMat: THREE.PointsMaterial;
  private currentZone = -1;
  private groundAlpha = 1;

  /** Live palette (smoothed toward the altitude target each frame); read by the renderer for
   *  goop/splat tinting so everything shares the same blend. */
  readonly live: ZonePalette = { skyTop: 0, skyBottom: 0, goop: 0xb6e84a, ground: 0, fog: 0 };
  private target: ZonePalette = { skyTop: 0, skyBottom: 0, goop: 0, ground: 0, fog: 0 };
  private cur = { skyTop: new THREE.Color(), skyBottom: new THREE.Color(), goop: new THREE.Color(), ground: new THREE.Color(), fog: new THREE.Color() };
  private tmp = new THREE.Color();
  private lastDrawnTop = -1;
  private lastDrawnBottom = -1;
  private booted = false;

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

    // Starfield: a shell of points that fades in with altitude (space is continuous too).
    const STARS = 260;
    const pos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      // Random directions on the upper-ish hemisphere of a big shell.
      const a = Math.random() * Math.PI * 2;
      const y = Math.random() * 1.6 - 0.3; // bias upward
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      pos[i * 3] = Math.cos(a) * r * 140;
      pos[i * 3 + 1] = y * 140;
      pos[i * 3 + 2] = Math.sin(a) * r * 140;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 });
    this.stars = new THREE.Points(geo, this.starMat);
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
  }

  /** Advance the continuous ascent blend; call every frame. Returns true on a zone CHANGE (the
   *  caller fires the toast/sting/camera pulse — identity beats, not color cuts). */
  apply(scene: THREE.Scene, heightRaw: number, zoneIndex: number, dt: number): boolean {
    let changed = false;
    if (zoneIndex !== this.currentZone) {
      changed = this.currentZone !== -1 && zoneIndex > this.currentZone;
      this.currentZone = zoneIndex;
    }

    // Altitude-driven target palette, smoothed so fast height spikes don't strobe the sky.
    paletteAt(heightRaw, this.target);
    const k = this.booted ? Math.min(1, 2.2 * dt) : 1;
    this.booted = true;
    this.cur.skyTop.lerp(this.tmp.setHex(this.target.skyTop), k);
    this.cur.skyBottom.lerp(this.tmp.setHex(this.target.skyBottom), k);
    this.cur.goop.lerp(this.tmp.setHex(this.target.goop), k);
    this.cur.ground.lerp(this.tmp.setHex(this.target.ground), k);
    this.cur.fog.lerp(this.tmp.setHex(this.target.fog), k);
    this.live.skyTop = this.cur.skyTop.getHex();
    this.live.skyBottom = this.cur.skyBottom.getHex();
    this.live.goop = this.cur.goop.getHex();
    this.live.ground = this.cur.ground.getHex();
    this.live.fog = this.cur.fog.getHex();

    // Redraw the sky texture only when the blend actually moved (cheap 4×256 canvas).
    if (this.live.skyTop !== this.lastDrawnTop || this.live.skyBottom !== this.lastDrawnBottom) {
      this.lastDrawnTop = this.live.skyTop;
      this.lastDrawnBottom = this.live.skyBottom;
      const ctx = this.skyCanvas.getContext('2d')!;
      const grad = ctx.createLinearGradient(0, 0, 0, this.skyCanvas.height);
      grad.addColorStop(0, '#' + this.cur.skyTop.getHexString());
      grad.addColorStop(1, '#' + this.cur.skyBottom.getHexString());
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.skyCanvas.width, this.skyCanvas.height);
      this.skyTex.needsUpdate = true;
      scene.background = this.skyTex;
    }
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(this.cur.fog);
    this.groundMat.color.copy(this.cur.ground);

    // Ground/props fade with ALTITUDE (leaving the planet around the cloud layer), stars fade in.
    const targetAlpha = clamp01(1 - (heightRaw - 14) / 12);
    if (Math.abs(this.groundAlpha - targetAlpha) > 0.004) {
      this.groundAlpha += (targetAlpha - this.groundAlpha) * Math.min(1, 2.2 * dt);
      this.groundMat.opacity = this.groundAlpha;
      this.ground.visible = this.groundAlpha > 0.02;
      this.shaker.visible = this.groundAlpha > 0.02;
      this.shaker.scale.setScalar(1.1 * (0.2 + 0.8 * this.groundAlpha));
    }
    this.starMat.opacity = clamp01((heightRaw - 30) / 20) * 0.9;
    this.stars.visible = this.starMat.opacity > 0.02;

    return changed;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
