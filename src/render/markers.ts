/**
 * markers.ts — the cardboard-cutout world, with an honest SCALE MODEL (design direction:
 * "as the goop gets larger, items should proportionately scale").
 *
 * Every prop has a real-world size in METERS. Each frame we know how many meters one world unit
 * represents (metersPerWorld = displayMeters(towerHeight) / towerWorldHeight), so:
 *
 *  - GROUND SCENERY (mug, spoon, salt shaker, toaster, fence, bush, houses, water tower, hills,
 *    the kitchen window): rendered at true proportion. At the start you are a 5 cm smear and the
 *    mug towers over you; minutes later you dwarf the house. They fade out with the ground.
 *  - ALTITUDE FLYBYS: placed at their real altitude (rawForMeters) and rendered at
 *    max(true proportion, readable floor) while approaching — so you can SEE the jet coming —
 *    then the floor decays exponentially once passed, so birds dwindle to specks behind you.
 *    Colossal objects (Moon, planet, whale, the hand) are genuinely huge and get capped.
 *
 * All boards are built at unit size and scaled per frame. Nothing ever sits in front of the goop
 * (all z ≤ -4; the opaque tower occludes). Positions track a SMOOTHED reference height provided
 * by the renderer, so tap-jiggle never bounces the world.
 */

import * as THREE from 'three';
import { cutout, board, ART, type Board } from './sprites';
import { displayMeters, rawForMeters } from '../config/zones';

/** World-units of vertical travel per raw-height unit of climbing. */
const K = 0.55;
/** metersPerWorld at the run-start guard floor — the reference the world shrinks FROM. */
const START_M_PER_W = Math.max(0.02, displayMeters(0.35)) / 0.5;

/** Global ground-frame shrink factor (1 at run start → 0 as the goop dwarfs the world).
 *  Shared by prop POSITIONS here and the counter disc in zone1.ts so sizes, gaps, and the tile
 *  grid all shrink together — that coherence is what reads as "the goop is growing" instead of
 *  "the items are shrinking and drifting apart". */
export function groundShrink(topRaw: number, topY: number): number {
  const mPerW = Math.max(0.02, displayMeters(Math.max(0.35, topRaw))) / Math.max(0.5, topY);
  return Math.min(1, Math.max(0.04, START_M_PER_W / mPerW));
}
/** Flybys further than this (in raw units) from the tower top are hidden. */
const WINDOW = 9;
/** Hard cap on any prop's rendered size (world units). */
const MAX_SIZE = 14;

interface GroundProp {
  board: Board;
  meters: number;
  x: number;
  z: number;
  cap: number;
  shadow: THREE.Mesh;
  /** Board-center height as a fraction of size — lower for art with big bottom padding. */
  yOff: number;
  /** Rendered size at run start (cap regime) — position convergence is measured against it. */
  startSize: number;
  /** Position-scale floor so a converging prop never enters the tower's footprint. */
  minPosScale: number;
}

interface Flyby {
  raw: number;
  meters: number;
  floor: number;
  board: Board;
  baseX: number;
  baseZ: number;
  phase: number;
  animate?: (obj: THREE.Group, t: number) => void;
}

export class ScaleMarkers {
  readonly group = new THREE.Group();
  private flybys: Flyby[] = [];
  private ground: GroundProp[] = [];
  private planet: THREE.Sprite;
  private shadowTex: THREE.CanvasTexture;

  constructor() {
    this.shadowTex = makeShadowTexture();

    // ---- Ground scenery: true-proportion neighborhood (near → far depth layers) ----
    const g = (art: keyof typeof ART, meters: number, x: number, z: number, tilt: number, cap = MAX_SIZE, yOff = 0.42) => {
      const b = board(ART[art]!, 1, 1, tilt);
      this.group.add(b.group);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.32 }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(x, 0.02, z);
      shadow.renderOrder = -2; // after the ground disc (-3), before the cutouts (0) — see zone1.ts
      this.group.add(shadow);
      this.ground.push({
        board: b,
        meters,
        x,
        z,
        cap,
        shadow,
        yOff,
        startSize: Math.min(cap, meters / START_M_PER_W),
        minPosScale: 3.4 / Math.max(3.4, Math.hypot(x, z)),
      });
    };
    // Counter clutter (near layer). The mug/spoon art has deep bottom padding — sit them lower.
    g('mug', 0.14, 2.1, -4, 0.18, 3.2, 0.29);
    g('spoon', 0.24, -1.9, -4.5, -0.15, 3.4, 0.34);
    g('saltShaker', 0.32, 3.2, -5.5, 0.2, 4);
    g('toaster', 0.34, -3.2, -6.5, -0.22, 4.5);
    // Yard (mid layer).
    g('fence', 1.4, 2.6, -9, 0.12, 6);
    g('bush', 1.1, -2.8, -8.5, -0.1, 5);
    // Neighborhood (far layer).
    g('house', 8, -4.5, -14, -0.15, 10);
    g('waterTower', 12, 5, -17, 0.22, 11);
    g('house', 10, 8, -22, 0.3, 12);
    // Landscape + the kitchen window backdrop (deepest layers).
    g('hills', 60, -6, -27, 0, 20);
    g('windowFrame', 2.6, 6, -32, 0, 22);

    // ---- Altitude flybys: placed at REAL altitudes, sized honestly with a readable floor ----
    const add = (
      art: keyof typeof ART,
      altMeters: number,
      meters: number,
      floor: number,
      x: number,
      z: number,
      tilt: number,
      animate?: Flyby['animate'],
    ) => {
      const b = board(ART[art]!, 1, 1, tilt);
      b.group.visible = false;
      this.group.add(b.group);
      this.flybys.push({
        raw: rawForMeters(altMeters),
        meters,
        floor,
        board: b,
        baseX: x,
        baseZ: z,
        phase: this.flybys.length * 1.7,
        animate,
      });
    };

    add('catPhoto', 5, 0.6, 2.1, 3, -8, 0.2);
    add('bird', 25, 0.5, 1.7, -2.8, -5, -0.15, (o, t) => (o.position.x += Math.sin(t * 0.7) * 0.8));
    add('bird', 60, 0.5, 1.3, 2.4, -6, 0.1, (o, t) => (o.position.x += Math.cos(t * 0.55) * 0.7));
    add('kite', 120, 1.5, 2.3, 2.9, -8, 0.18, (o, t) => {
      o.position.x += Math.sin(t * 0.5) * 0.5;
      o.rotation.z = Math.sin(t * 0.8) * 0.25;
    });
    add('blimp', 420, 60, 4.6, -3.4, -10, -0.12, (o, t) => (o.position.x += Math.sin(t * 0.22) * 1.2));
    add('balloon', 750, 22, 3.6, 3.6, -10, 0.16, (o, t) => (o.position.y += Math.sin(t * 0.4) * 0.3));
    add('cloud', 2_000, 400, 4.4, 3.2, -9, 0.1, (o, t) => (o.position.x += Math.sin(t * 0.18) * 1.2));
    add('cloud', 5_500, 700, 5, -3.6, -8, -0.14, (o, t) => (o.position.x += Math.cos(t * 0.15) * 1.4));
    add('jet', 10_500, 45, 4.6, 0, -12, 0, (o, t) => {
      o.position.x = ((t * 2.6) % 30) - 15; // a busy route, apparently
    });
    add('satellite', 6e5, 15, 4, 3.2, -9, -0.2);
    add('astronaut', 9e5, 2, 3, -2.8, -8, 0.14, (o, t) => {
      o.rotation.z = Math.sin(t * 0.3) * 0.35;
      o.position.x += Math.sin(t * 0.25) * 0.6;
    });
    add('ufo', 5e6, 18, 4.2, 3.4, -10, -0.1, (o, t) => (o.position.x += Math.sin(t * 0.6) * 0.9));
    add('moon', 5e7, 3.5e6, 6.5, -5.5, -16, 0.12);
    add('facePlanet', 4e8, 1.2e7, 8, 6, -18, -0.14);
    add('whale', 1.2e11, 3e9, 8.5, -5, -16, 0.1, (o, t) => {
      o.position.x += Math.sin(t * 0.2) * 1.5;
      o.position.y += Math.sin(t * 0.35) * 0.4;
    });
    add('hand', 9e12, 8e12, 9, 2.5, -14, -0.08, (o, t) => (o.position.y += Math.sin(t * 0.5) * 0.25));

    // The home planet, receding below as you leave it (ground recession).
    this.planet = cutout(ART['planetBall']!, 1, 1, 512);
    this.planet.visible = false;
    this.group.add(this.planet);
  }

  /** `topRaw`/`topY` should be the SMOOTHED reference (renderer's slow follower), not the live
   *  sprung tower top — that is what keeps the world from bouncing on taps. */
  update(topRaw: number, topY: number, t: number, zoom = 1): void {
    // Meters represented by one world unit at the current height (guarded near zero).
    const mPerW = Math.max(0.02, displayMeters(Math.max(0.35, topRaw))) / Math.max(0.5, topY);

    // Ground scenery: true proportion, fading with the ground. Positions CONVERGE with the same
    // factor the sizes shrink by ("a growing giant sees the neighborhood pull together beneath
    // it") — fixed positions read as "items shrinking apart", the exact wrong story.
    const alpha = clamp01(1 - (topRaw - 14) / 12);
    for (const p of this.ground) {
      const size = Math.min(p.cap, p.meters / mPerW);
      const visible = alpha > 0.02 && size > 0.1;
      p.board.group.visible = visible;
      p.shadow.visible = visible;
      if (!visible) continue;
      const s = Math.max(p.minPosScale, Math.min(1, size / p.startSize));
      const px = p.x * s;
      const pz = p.z * s;
      p.board.group.scale.setScalar(size);
      p.board.group.position.set(px, size * p.yOff, pz);
      p.board.setOpacity(alpha);
      p.shadow.position.set(px, 0.02, pz);
      p.shadow.scale.setScalar(size * 0.9);
      (p.shadow.material as THREE.MeshBasicMaterial).opacity = 0.32 * alpha;
    }

    // Flybys.
    const window = WINDOW * zoom;
    for (const m of this.flybys) {
      const delta = m.raw - topRaw;
      const o = m.board.group;
      if (Math.abs(delta) > window) {
        o.visible = false;
        continue;
      }
      // Honest size with a readable approach floor that decays away once passed.
      const trueSize = m.meters / mPerW;
      const floorNow = m.floor * (delta >= 0 ? 1 : Math.exp(delta / 2.6));
      const size = Math.min(MAX_SIZE, Math.max(trueSize, floorNow));
      if (size < 0.18) {
        o.visible = false;
        continue;
      }
      o.visible = true;
      o.scale.setScalar(size);
      o.position.set(m.baseX, Math.max(0.4, topY + delta * K), m.baseZ);
      o.rotation.z = Math.sin(t * 0.9 + m.phase) * 0.05; // paper wobble
      m.animate?.(o, t);
    }

    // Planet recession: from "the ground you left" to a dot far below (raw ~13 → ~72).
    if (topRaw > 13 && topRaw < 72) {
      const p = Math.min(1, (topRaw - 13) / 45);
      const size = 26 * (1 - p) + 2.2 * p;
      this.planet.visible = true;
      this.planet.scale.set(size, size, 1);
      this.planet.position.set(0.5, -size * 0.32 - (topRaw - 13) * K * 0.55, -20);
      (this.planet.material as THREE.SpriteMaterial).opacity =
        Math.min(1, (topRaw - 13) / 3) * (p < 0.92 ? 1 : (1 - p) / 0.08);
    } else {
      this.planet.visible = false;
    }
  }
}

/** Soft radial contact-shadow texture (shared by all grounded props + the tower). */
export function makeShadowTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  const grad = c.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(20,10,0,0.85)');
  grad.addColorStop(0.6, 'rgba(20,10,0,0.4)');
  grad.addColorStop(1, 'rgba(20,10,0,0)');
  c.fillStyle = grad;
  c.beginPath();
  c.ellipse(64, 64, 62, 62, 0, 0, Math.PI * 2);
  c.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
