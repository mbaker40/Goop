/**
 * zone1.ts — the environment (PLAN §3 / §9.1). A gradient sky, a ground plane, and a starfield
 * for the space altitudes (set dressing lives in markers.ts as 2D cutouts).
 *
 * The environment is a CONTINUOUS ascent: sky/fog/ground blend smoothly with ALTITUDE
 * (palette.ts paletteAt), like a balloon ride — warm kitchen light thins into attic dust, blue
 * sky, stratosphere haze, then black starfield. There is no per-zone color cut; zone identity is
 * carried by the toast/sting and the fixed-altitude scale markers (markers.ts). The ground (and
 * its props) fade out as the tower leaves the planet, and the stars fade in.
 */

import * as THREE from 'three';
import { paletteAt, type ZonePalette } from './palette';
import { makeShadowTexture } from './markers';

/** Kitchen-counter tile texture for the diorama base (grout lines, coffee stain, crumbs). */
function makeCounterTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#dcc9a4';
  c.fillRect(0, 0, 512, 512);
  // Tiles + grout.
  c.strokeStyle = '#bda87f';
  c.lineWidth = 6;
  for (let i = 0; i <= 8; i++) {
    c.beginPath();
    c.moveTo(i * 64, 0);
    c.lineTo(i * 64, 512);
    c.stroke();
    c.beginPath();
    c.moveTo(0, i * 64);
    c.lineTo(512, i * 64);
    c.stroke();
  }
  // Per-tile shading variation.
  for (let ty = 0; ty < 8; ty++) {
    for (let tx = 0; tx < 8; tx++) {
      const v = ((tx * 7 + ty * 13) % 5) - 2;
      c.fillStyle = v > 0 ? `rgba(255,245,220,${v * 0.045})` : `rgba(90,60,20,${-v * 0.035})`;
      c.fillRect(tx * 64 + 3, ty * 64 + 3, 58, 58);
    }
  }
  // Coffee stain.
  c.strokeStyle = 'rgba(122,74,42,0.4)';
  c.lineWidth = 9;
  c.beginPath();
  c.arc(150, 350, 38, 0, Math.PI * 2);
  c.stroke();
  // Crumbs.
  c.fillStyle = 'rgba(122,90,42,0.55)';
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4;
    c.fillRect(256 + Math.sin(a * 1.7) * 200, 256 + Math.cos(a * 2.3) * 200, 5, 4);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Environment {
  readonly group = new THREE.Group();
  private ground: THREE.Mesh;
  private groundMat: THREE.MeshStandardMaterial;
  private edge!: THREE.Mesh;
  private edgeMat!: THREE.MeshStandardMaterial;
  private towerShadow!: THREE.Mesh;
  private towerShadowMat!: THREE.MeshBasicMaterial;
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

    // Ground: a COUNTER-TOP DIORAMA BASE — smaller tiled island with a visible edge, like the
    // whole scene sits on a kitchen table (was: featureless 60-radius disc).
    this.groundMat = new THREE.MeshStandardMaterial({ map: makeCounterTexture(), color: 0xffffff, roughness: 0.9, metalness: 0, transparent: true });
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(26, 48), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.02;
    // The counter is transparent (it fades with altitude), and three.js sorts transparent objects
    // back-to-front by OBJECT CENTER — the disc's center is nearer than the scenery cutouts', so
    // without an explicit order it draws AFTER them and paints over their lower halves (the
    // "fence sunk into the counter" bug). Force ground → shadows → cutouts.
    this.ground.renderOrder = -3;
    this.group.add(this.ground);
    // The counter's edge (diorama table side).
    this.edgeMat = new THREE.MeshStandardMaterial({ color: 0xa5854f, roughness: 0.85, metalness: 0, transparent: true });
    this.edge = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 1.6, 48, 1, true), this.edgeMat);
    this.edge.position.y = -0.82;
    this.edge.renderOrder = -3;
    this.group.add(this.edge);
    // Soft contact shadow under the goop (scaled by the renderer via setTowerShadow).
    this.towerShadowMat = new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false, opacity: 0.4 });
    this.towerShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.towerShadowMat);
    this.towerShadow.rotation.x = -Math.PI / 2;
    this.towerShadow.position.y = 0.015;
    this.towerShadow.renderOrder = -2;
    this.group.add(this.towerShadow);

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
    // Tint the tiled counter toward the altitude palette (subtle; texture carries the detail).
    this.groundMat.color.copy(this.cur.ground).lerp(this.tmp.setHex(0xffffff), 0.55);

    // Ground/props fade with ALTITUDE (leaving the planet around the cloud layer), stars fade in.
    const targetAlpha = clamp01(1 - (heightRaw - 14) / 12);
    if (Math.abs(this.groundAlpha - targetAlpha) > 0.004) {
      this.groundAlpha += (targetAlpha - this.groundAlpha) * Math.min(1, 2.2 * dt);
      this.groundMat.opacity = this.groundAlpha;
      this.edgeMat.opacity = this.groundAlpha;
      this.towerShadowMat.opacity = 0.4 * this.groundAlpha;
      this.ground.visible = this.groundAlpha > 0.02;
      this.edge.visible = this.groundAlpha > 0.02;
      this.towerShadow.visible = this.groundAlpha > 0.02;
    }
    this.starMat.opacity = clamp01((heightRaw - 30) / 20) * 0.9;
    this.stars.visible = this.starMat.opacity > 0.02;

    return changed;
  }

  /** Scale the goop's contact shadow (renderer passes the tower's ground footprint). */
  setTowerShadow(scale: number): void {
    this.towerShadow.scale.setScalar(Math.max(0.1, scale));
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
