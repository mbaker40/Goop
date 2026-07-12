/**
 * markers.ts — the cardboard-cutout world (PLAN §3 set dressing × pillar #1 "the number must be
 * felt"). Two prop families, all built from sprites.ts boards (thin 3-layer cardboard with a
 * visible edge, per design direction):
 *
 *  - GROUND SCENERY: the neighborhood you start in — salt shaker, judgmental toaster, houses, the
 *    water tower — standing around the tower at staggered depths (near/mid/far → parallax) from
 *    the very first frame, fading out as the tower leaves the planet.
 *  - ALTITUDE FLYBYS: fixed-altitude markers that sweep DOWN past the climbing top (birds → blimp
 *    → jet → Moon → whale → the marble hand), each at its own depth. Later markers are physically
 *    bigger, selling the scale jump.
 *
 * Plus the receding home planet (phase 2): a shrinking cutout below the tower from raw ~13-72.
 */

import * as THREE from 'three';
import { cutout, board, ART, type Board } from './sprites';

/** World-units of vertical travel per raw-height unit of climbing. */
const K = 0.55;
/** Flybys further than this (in raw units) from the tower top are hidden — keeps ~2-3 visible. */
const WINDOW = 9;

interface Flyby {
  raw: number;
  board: Board;
  baseX: number;
  baseZ: number;
  phase: number;
  animate?: (obj: THREE.Group, t: number) => void;
}

export class ScaleMarkers {
  readonly group = new THREE.Group();
  private flybys: Flyby[] = [];
  private ground: Board[] = [];
  private planet: THREE.Sprite;
  private groundAlpha = -1;

  constructor() {
    // ---- Ground scenery (visible from the start; staggered depth = parallax) ----
    const g = (art: keyof typeof ART, size: number, x: number, z: number, tilt: number) => {
      const b = board(ART[art]!, size, size, tilt);
      b.group.position.set(x, size * 0.42, z);
      this.group.add(b.group);
      this.ground.push(b);
    };
    g('saltShaker', 2.4, 2.2, -3.5, 0.18);
    g('toaster', 3, -2.5, -5.5, -0.22);
    g('waterTower', 4.6, 3, -9.5, 0.25);
    g('house', 5, -3.2, -11, -0.15);
    g('house', 6.5, 4.4, -18, 0.3); // the far neighbor (deep background layer)

    // ---- Altitude flybys ----
    const add = (
      raw: number,
      art: keyof typeof ART,
      size: number,
      x: number,
      z: number,
      tilt: number,
      animate?: Flyby['animate'],
    ) => {
      const b = board(ART[art]!, size, size, tilt);
      b.group.visible = false;
      this.group.add(b.group);
      this.flybys.push({ raw, board: b, baseX: x, baseZ: z, phase: this.flybys.length * 1.7, animate });
    };

    // Through the ceiling: attic junk + low sky.
    add(6.5, 'catPhoto', 2.6, 2.6, -8, 0.2);
    add(8.5, 'bird', 1.7, -2.8, -5, -0.15, (o, t) => (o.position.x += Math.sin(t * 0.7) * 0.8));
    add(10.5, 'bird', 1.1, 2.2, -2.5, 0.1, (o, t) => (o.position.x += Math.cos(t * 0.55) * 0.7)); // near-field friend
    // Suburbia's sky.
    add(13, 'kite', 2.6, 2.9, -8, 0.18, (o, t) => {
      o.position.x += Math.sin(t * 0.5) * 0.5;
      o.rotation.z = Math.sin(t * 0.8) * 0.25;
    });
    add(17.5, 'blimp', 5.4, -3.4, -10, -0.12, (o, t) => (o.position.x += Math.sin(t * 0.22) * 1.2));
    // Cloud layer.
    add(20, 'cloud', 4.6, 3.2, -9, 0.1, (o, t) => (o.position.x += Math.sin(t * 0.18) * 1.2));
    add(23, 'jet', 5.2, 0, -12, 0, (o, t) => {
      o.position.x = ((t * 2.6) % 30) - 15; // a busy route, apparently
    });
    add(26, 'cloud', 5.4, -3.6, -8, -0.14, (o, t) => (o.position.x += Math.cos(t * 0.15) * 1.4));
    add(28.5, 'balloon', 4, 3.6, -10, 0.16, (o, t) => (o.position.y += Math.sin(t * 0.4) * 0.3));
    // Low orbit.
    add(32, 'satellite', 4.4, 3.2, -9, -0.2);
    add(38, 'astronaut', 3.6, -2.8, -8, 0.14, (o, t) => {
      o.rotation.z = Math.sin(t * 0.3) * 0.35;
      o.position.x += Math.sin(t * 0.25) * 0.6;
    });
    add(43, 'ufo', 4.6, 3.4, -10, -0.1, (o, t) => (o.position.x += Math.sin(t * 0.6) * 0.9));
    // Deep space.
    add(48, 'moon', 7, -5.5, -16, 0.12);
    add(56, 'facePlanet', 8.5, 6, -18, -0.14);
    add(66, 'whale', 9, -5, -16, 0.1, (o, t) => {
      o.position.x += Math.sin(t * 0.2) * 1.5;
      o.position.y += Math.sin(t * 0.35) * 0.4;
    });
    // Past God's doorstep: the hand waits above the win line, finger cocked.
    add(96, 'hand', 10, 2.5, -14, -0.08, (o, t) => (o.position.y += Math.sin(t * 0.5) * 0.25));

    // The home planet, receding below as you leave it (phase 2 ground recession).
    this.planet = cutout(ART['planetBall']!, 1, 1, 512);
    this.planet.visible = false;
    this.group.add(this.planet);
  }

  /** Position flybys relative to the climbing tower top and fade the ground scenery with
   *  altitude. `zoom` widens the flyby window when the player pulls the view back. */
  update(topRaw: number, topY: number, t: number, zoom = 1): void {
    const window = WINDOW * zoom;
    for (const m of this.flybys) {
      const delta = m.raw - topRaw;
      const o = m.board.group;
      if (Math.abs(delta) > window) {
        o.visible = false;
        continue;
      }
      o.visible = true;
      o.position.set(m.baseX, Math.max(0.4, topY + delta * K), m.baseZ);
      // Paper wobble: cutouts on sticks are never quite still.
      o.rotation.z = Math.sin(t * 0.9 + m.phase) * 0.05;
      m.animate?.(o, t);
    }

    // Ground scenery fades away as the tower leaves the planet (same curve as the ground plane).
    const alpha = clamp01(1 - (topRaw - 14) / 12);
    if (Math.abs(alpha - this.groundAlpha) > 0.004) {
      this.groundAlpha = alpha;
      for (const b of this.ground) {
        b.setOpacity(alpha);
        b.group.visible = alpha > 0.02;
      }
    }

    // Planet recession: from "the ground you left" to a dot far below (raw ~13 → ~72).
    if (topRaw > 13 && topRaw < 72) {
      const p = Math.min(1, (topRaw - 13) / 45); // 0 = just lifted off, 1 = nearly gone
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

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
