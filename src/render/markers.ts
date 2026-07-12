/**
 * markers.ts — fixed-altitude SCALE MARKERS (PLAN §3 set dressing × pillar #1 "the number must be
 * felt"). The camera zoom keeps the tower a similar size on screen, so scale is communicated by
 * reference objects: each marker lives at a raw altitude and sweeps DOWN past the tower top as you
 * climb (a parallax ascent), while later markers are physically bigger — birds, then a blimp,
 * then a jet, then the Moon. All assets are 2D cardboard cutouts (sprites.ts) that wobble gently
 * like paper on a stick.
 *
 * Ascent phase 2: the home planet recedes below the tower as you leave it (a shrinking cutout —
 * most visible zoomed out), the cosmic goop whale swims by in deep space, and the marble hand
 * waits at the top, flicking finger cocked.
 */

import * as THREE from 'three';
import { cutout, ART } from './sprites';

/** World-units of vertical travel per raw-height unit of climbing. */
const K = 0.55;
/** Markers further than this (in raw units) from the tower top are hidden — keeps ~2-3 visible. */
const WINDOW = 9;

interface Marker {
  raw: number;
  obj: THREE.Sprite;
  baseX: number;
  baseZ: number;
  /** Paper-wobble phase (each cutout sways on its own beat). */
  phase: number;
  /** Optional extra idle animation (position drift etc). */
  animate?: (obj: THREE.Sprite, t: number) => void;
}

export class ScaleMarkers {
  readonly group = new THREE.Group();
  private markers: Marker[] = [];
  private planet: THREE.Sprite;

  constructor() {
    // Placement note: PORTRAIT is the tight axis — at tower depth the visible half-width is only
    // ~2.5-4 world units. Markers therefore sit at modest |x| and are pushed BACK in z, where the
    // frustum is wider, with their size chosen to read at that distance.
    const add = (
      raw: number,
      art: keyof typeof ART,
      size: number,
      x: number,
      z: number,
      animate?: Marker['animate'],
    ) => {
      const obj = cutout(ART[art]!, size, size);
      obj.visible = false;
      this.group.add(obj);
      this.markers.push({ raw, obj, baseX: x, baseZ: z, phase: this.markers.length * 1.7, animate });
    };

    // Counter / kitchen band.
    add(0.5, 'saltShaker', 3, 3.4, -6);
    add(3, 'toaster', 3.6, -3.2, -6);
    // Through the ceiling: attic junk + low sky.
    add(6.5, 'catPhoto', 2.6, 3, -7);
    add(8.5, 'bird', 1.7, -2.8, -6, (o, t) => (o.position.x += Math.sin(t * 0.7) * 0.8));
    // Suburbia.
    add(11.5, 'house', 4.4, -3.8, -9);
    add(13, 'kite', 2.6, 3.4, -7, (o, t) => {
      o.position.x += Math.sin(t * 0.5) * 0.5;
      o.material.rotation = Math.sin(t * 0.8) * 0.25;
    });
    add(14.5, 'waterTower', 4.2, 3.8, -8);
    add(17.5, 'blimp', 5.4, -3.4, -10, (o, t) => (o.position.x += Math.sin(t * 0.22) * 1.2));
    // Cloud layer.
    add(20, 'cloud', 4.6, 3.2, -9, (o, t) => (o.position.x += Math.sin(t * 0.18) * 1.2));
    add(23, 'jet', 5.2, 0, -12, (o, t) => {
      o.position.x = ((t * 2.6) % 30) - 15; // a busy route, apparently
    });
    add(26, 'cloud', 5.4, -3.6, -8, (o, t) => (o.position.x += Math.cos(t * 0.15) * 1.4));
    add(28.5, 'balloon', 4, 3.6, -10, (o, t) => (o.position.y += Math.sin(t * 0.4) * 0.3));
    // Low orbit.
    add(32, 'satellite', 4.4, 3.2, -9);
    add(38, 'astronaut', 3.6, -2.8, -8, (o, t) => {
      o.material.rotation = Math.sin(t * 0.3) * 0.35;
      o.position.x += Math.sin(t * 0.25) * 0.6;
    });
    add(43, 'ufo', 4.6, 3.4, -10, (o, t) => (o.position.x += Math.sin(t * 0.6) * 0.9));
    // Deep space.
    add(48, 'moon', 7, -5.5, -16);
    add(56, 'facePlanet', 8.5, 6, -18);
    add(66, 'whale', 9, -5, -16, (o, t) => {
      o.position.x += Math.sin(t * 0.2) * 1.5;
      o.position.y += Math.sin(t * 0.35) * 0.4;
    });
    // Past God's doorstep: the hand waits above the win line, finger cocked.
    add(96, 'hand', 10, 2.5, -14, (o, t) => (o.position.y += Math.sin(t * 0.5) * 0.25));

    // The home planet, receding below as you leave it (phase 2 ground recession).
    this.planet = cutout(ART['planetBall']!, 1, 1, 512);
    this.planet.visible = false;
    this.group.add(this.planet);
  }

  /** Position markers relative to the climbing tower top. `topRaw` is the sim height, `topY` the
   *  tower top's world Y; `zoom` widens the visibility window when the player pulls the view back. */
  update(topRaw: number, topY: number, t: number, zoom = 1): void {
    const window = WINDOW * zoom;
    for (const m of this.markers) {
      const delta = m.raw - topRaw;
      if (Math.abs(delta) > window) {
        m.obj.visible = false;
        continue;
      }
      m.obj.visible = true;
      m.obj.position.set(m.baseX, Math.max(0.4, topY + delta * K), m.baseZ);
      // Paper wobble: cutouts on sticks are never quite still.
      m.obj.material.rotation = Math.sin(t * 0.9 + m.phase) * 0.06;
      m.animate?.(m.obj, t);
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
