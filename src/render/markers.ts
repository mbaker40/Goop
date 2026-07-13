/**
 * markers.ts - the cardboard-cutout world on the SIDE-VIEW SCROLL STAGE (2026-07 view rework).
 *
 * The old model rescaled props ("true proportion" / world shrink) and never stopped reading as
 * "the items are shrinking". The new model is a paper diorama elevator ride: every prop is
 * parked at its ABSOLUTE altitude with a FIXED size, this whole group translates downward as
 * the run climbs (index.ts sets group.position.y = -scrollOf(raw)), and things simply sweep
 * past the goop. Rising past the water tower needs no math to read.
 *
 * altitudeY(raw) maps a raw height to a world y such that a prop parked there meets the goop's
 * crown exactly when the run's raw height equals the prop's: crownLocal(raw) + scrollOf(raw).
 * Nothing here ever rescales. Nothing sits in front of the goop (all z <= -4).
 */

import * as THREE from 'three';
import { board, ART, type Board } from './sprites';
import { rawForMeters, WIN_HEIGHT } from '../config/zones';

/** The goop crown's LOCAL height (tower rooted at y=0) - mirrors tower.ts fill math. */
export function crownLocal(raw: number): number {
  // 13 = TOWER_WORLD_HEIGHT * STAGE_SCALE (tower.ts) - keep in lockstep.
  return 13 * (0.07 + Math.min(1, Math.max(0.03, raw / WIN_HEIGHT)) * 0.76);
}

/** World-units of scroll per raw unit once the ride starts (R0 = leaving the counter). */
const K2 = 3;
const R0 = 6;

export function scrollOf(raw: number): number {
  return K2 * Math.max(0, raw - R0);
}

/** Absolute stage altitude for a prop keyed to a raw height (see header). */
export function altitudeY(raw: number): number {
  return crownLocal(raw) + scrollOf(raw);
}

interface Flyby {
  board: Board;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  animate?: (obj: THREE.Group, t: number) => void;
}

export class ScaleMarkers {
  readonly group = new THREE.Group();
  private flybys: Flyby[] = [];
  private shadowTex: THREE.CanvasTexture;
  /** Toast-pop gag: the toaster fires two slices the moment you ding Zone 2. */
  private toaster: { x: number; y: number; z: number; size: number } | null = null;
  private toasterBoard: Board | null = null;
  private toastBoards: Board[] = [];
  private toastFiredAt = -1;
  /** Boss hand actor (positions are set in ABSOLUTE stage space each frame). */
  private boss: Partial<Record<'hand' | 'handFlick' | 'handThumb', Board>> = {};
  private bossPrevPhase = 'idle';
  private bossPhaseAt = 0;
  /** Current scroll (set by update; used to convert absolute positions into group-local). */
  private scroll = 0;

  constructor() {
    this.shadowTex = makeShadowTexture();

    // ---- Ground scenery: fixed sizes, parked on the counter (y=0 plane), scrolls away ----
    const g = (art: keyof typeof ART, size: number, x: number, z: number, tilt: number, yOff = 0.42, rotZ = 0) => {
      const b = board(ART[art]!, 1, 1, tilt);
      if (rotZ) b.group.rotation.z = rotZ;
      b.group.scale.setScalar(size);
      b.group.position.set(x, size * yOff, z);
      this.group.add(b.group);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.32 }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.setScalar(size * 0.9);
      shadow.position.set(x, 0.02, z);
      shadow.renderOrder = -2; // after the ground disc (-3), before the cutouts (0)
      this.group.add(shadow);
      return b;
    };
    // KITCHEN STILL LIFE: one deliberate baseline arc behind the goop (fit rule for ortho:
    // |x| + size/2 must stay inside ~5.5 * aspect at zoom 1; these all do in portrait).
    this.toasterBoard = g('toaster', 4.4, -1.8, -12, -0.1);
    this.toaster = { x: -1.8, y: 4.4 * 0.42, z: -12, size: 4.4 };
    g('saltShaker', 3.6, 1.7, -11, 0.12);
    g('mug', 3.0, 2.9, -13.5, 0.16, 0.29);
    g('spoon', 2.4, -1.3, -9, -0.06, 0.16, 1.35);
    // Yard + neighborhood, parked at the altitudes where they belong (they sweep past).
    const park = (art: keyof typeof ART, raw: number, size: number, x: number, z: number, tilt: number) => {
      const b = board(ART[art]!, 1, 1, tilt);
      b.group.scale.setScalar(size);
      b.group.position.set(x, altitudeY(raw), z);
      this.group.add(b.group);
    };
    park('fence', 11, 3.5, 2.6, -9, 0.12);
    park('bush', 11.5, 2.8, -2.8, -8.5, -0.1);
    park('house', 13, 6, -3.6, -14, -0.15);
    park('waterTower', 14, 7, 3.4, -15, 0.22);
    park('house', 15.5, 6.5, 4.2, -20, 0.3);

    // ---- Flybys: parked at their real altitudes, fixed readable sizes ----
    const add = (
      art: keyof typeof ART,
      altMeters: number,
      size: number,
      x: number,
      z: number,
      tilt: number,
      animate?: Flyby['animate'],
    ) => {
      const b = board(ART[art]!, 1, 1, tilt);
      b.group.scale.setScalar(size);
      b.group.visible = false;
      this.group.add(b.group);
      this.flybys.push({
        board: b,
        baseX: x,
        baseY: altitudeY(rawForMeters(altMeters)),
        baseZ: z,
        phase: this.flybys.length * 1.7,
        animate,
      });
    };

    add('bird', 25, 1.7, -2.8, -5, -0.15, (o, t) => (o.position.x = -2.8 + Math.sin(t * 0.7) * 0.8));
    add('bird', 60, 1.3, 2.4, -6, 0.1, (o, t) => (o.position.x = 2.4 + Math.cos(t * 0.55) * 0.7));
    add('kite', 120, 2.3, 2.9, -8, 0.18, (o, t) => {
      o.position.x = 2.9 + Math.sin(t * 0.5) * 0.5;
      o.rotation.z = Math.sin(t * 0.8) * 0.25;
    });
    add('blimp', 420, 4.6, -3.4, -10, -0.12, (o, t) => (o.position.x = -3.4 + Math.sin(t * 0.22) * 1.2));
    add('balloon', 750, 3.6, 3.6, -10, 0.16, (o, t) => (o.position.y = o.userData.y0 + Math.sin(t * 0.4) * 0.3));
    add('cloud', 2_000, 4.4, 3.2, -9, 0.1, (o, t) => (o.position.x = 3.2 + Math.sin(t * 0.18) * 1.2));
    add('cloud', 5_500, 5, -3.6, -8, -0.14, (o, t) => (o.position.x = -3.6 + Math.cos(t * 0.15) * 1.4));
    add('jet', 10_500, 4.6, 0, -12, 0, (o, t) => {
      o.position.x = ((t * 2.6) % 30) - 15; // a busy route, apparently
    });
    add('satellite', 6e5, 4, 3.2, -9, -0.2);
    add('astronaut', 9e5, 3, -2.8, -8, 0.14, (o, t) => {
      o.rotation.z = Math.sin(t * 0.3) * 0.35;
      o.position.x = -2.8 + Math.sin(t * 0.25) * 0.6;
    });
    add('ufo', 5e6, 4.2, 3.4, -10, -0.1, (o, t) => (o.position.x = 3.4 + Math.sin(t * 0.6) * 0.9));
    add('moon', 5e7, 6.5, -4, -16, 0.12);
    add('facePlanet', 4e8, 8, 4.4, -18, -0.14);
    add('whale', 1.2e11, 8.5, -3.5, -16, 0.1, (o, t) => {
      o.position.x = -3.5 + Math.sin(t * 0.2) * 1.5;
      o.position.y = o.userData.y0 + Math.sin(t * 0.35) * 0.4;
    });
    // Filler set-dressing so NO stretch of sky is ever empty: a deterministic ladder of
    // clouds/birds/etc every ~4 raw from the yard to the Goopiverse door. The hero flybys
    // above carry the identity; these carry continuity.
    const parkRaw = (art: keyof typeof ART, raw: number, size: number, x: number, z: number, tilt: number) => {
      const b = board(ART[art]!, 1, 1, tilt);
      b.group.scale.setScalar(size);
      b.group.visible = false;
      this.group.add(b.group);
      this.flybys.push({ board: b, baseX: x, baseY: altitudeY(raw), baseZ: z, phase: this.flybys.length * 1.7 });
    };
    const FILLER: (keyof typeof ART)[] = ['cloud', 'bird', 'cloud', 'kite', 'cloud', 'balloon', 'cloud', 'bird'];
    for (let i = 0; i < 22; i++) {
      const raw = 8 + i * 4.2;
      const art = i > 12 && i % 3 === 0 ? 'satellite' : FILLER[i % FILLER.length]!;
      const side = i % 2 === 0 ? 1 : -1;
      const sz = art === 'bird' ? 1.4 : art === 'kite' ? 2.2 : art === 'satellite' ? 3.4 : 3.6 + (i % 3) * 0.7;
      parkRaw(art, raw, sz, side * (2.6 + (i % 3) * 0.7), -8 - (i % 4) * 2, side * 0.1);
    }
    for (const f of this.flybys) f.board.group.userData.y0 = f.baseY;

    // ---- The Flick: boss hand actor (three pose boards, crossfaded by phase) ----
    for (const art of ['hand', 'handFlick', 'handThumb'] as const) {
      const b = board(ART[art]!, 1, 1, -0.06);
      b.group.visible = false;
      this.group.add(b.group);
      this.boss[art] = b;
    }

    // Two toast slices, hidden until the Zone 2 ding.
    for (let i = 0; i < 2; i++) {
      const tb = board(ART['toast']!, 1, 1, i === 0 ? 0.15 : -0.1);
      tb.group.visible = false;
      this.group.add(tb.group);
      this.toastBoards.push(tb);
    }
  }

  /** `topRaw` is the SMOOTHED raw reference; `crownY` the goop crown's local world y. The
   *  renderer sets this.group.position.y = -scrollOf(topRaw) BEFORE calling update. */
  update(topRaw: number, crownY: number, t: number, zoom = 1, bossPhase = 'idle', bossMeter = 0): void {
    this.scroll = scrollOf(topRaw);
    this.updateBoss(crownY, t, bossPhase, bossMeter);

    // Flybys: visible while on the stage (cheap screen-band cull); idle wobble.
    const band = 9 * zoom + 9;
    for (const m of this.flybys) {
      const o = m.board.group;
      const screenY = m.baseY - this.scroll;
      const visible = Math.abs(screenY - crownY) < band;
      o.visible = visible;
      if (!visible) continue;
      o.rotation.z = Math.sin(t * 0.9 + m.phase) * 0.05 + (o.rotation.z - Math.sin(t * 0.9 + m.phase) * 0.05) * 0;
      m.animate?.(o, t);
    }

    // Toast-pop gag: crossing into Zone 2 (raw 8.5) fires two slices in a lazy arc.
    if (topRaw < 2 && this.toastFiredAt >= 0) this.toastFiredAt = -1;
    // Fires as the kitchen begins scrolling out (the toaster's farewell salute).
    if (this.toastFiredAt < 0 && topRaw >= 6.3 && topRaw < 8.5 && this.toaster) this.toastFiredAt = t;
    if (this.toastFiredAt >= 0 && this.toaster) {
      const p = t - this.toastFiredAt;
      const tp = this.toaster;
      for (let i = 0; i < 2; i++) {
        const tb = this.toastBoards[i]!;
        const alive = p >= 0 && p < 2.4 && (this.toasterBoard?.group.visible ?? false);
        tb.group.visible = alive;
        if (!alive) continue;
        const dir = i === 0 ? -0.55 : 0.7;
        tb.group.scale.setScalar(tp.size * 0.3);
        tb.group.position.set(
          tp.x + dir * p * tp.size * 0.35,
          tp.y + tp.size * 0.35 + 2.6 * tp.size * 0.35 * p - 1.6 * tp.size * 0.35 * p * p,
          tp.z + 0.3,
        );
        tb.group.rotation.z = (i === 0 ? 1 : -1) * p * 2.2;
        tb.setOpacity(p < 1.8 ? 1 : Math.max(0, 1 - (p - 1.8) / 0.6));
      }
    }
  }

  /** The Flick choreography in ABSOLUTE stage space (+scroll converts to group-local so the
   *  hand tracks the goop, not the scenery). */
  private updateBoss(crownY: number, t: number, phase: string, meter: number): void {
    if (phase !== this.bossPrevPhase) {
      this.bossPrevPhase = phase;
      this.bossPhaseAt = t;
    }
    const since = t - this.bossPhaseAt;
    const hand = this.boss['hand'];
    const flick = this.boss['handFlick'];
    const thumb = this.boss['handThumb'];
    if (!hand || !flick || !thumb) return;
    hand.group.visible = flick.group.visible = thumb.group.visible = false;
    const SIZE = 7;
    const yAt = (worldY: number) => worldY + this.scroll; // group-local for an absolute stage y

    if (phase === 'fight') {
      const drop = Math.min(1, since / 2);
      const ease = 1 - Math.pow(1 - drop, 3);
      hand.group.visible = true;
      hand.group.scale.setScalar(SIZE);
      hand.group.position.set(
        2.4 + Math.sin(t * 0.6) * 0.2 + Math.sin(t * 21) * 0.12 * meter,
        yAt(crownY + 8.5 - ease * 4.6 + Math.sin(t * 0.8) * 0.15),
        -9,
      );
      hand.group.rotation.z = -0.12 - meter * 0.5;
      hand.setOpacity(Math.min(1, since / 0.6));
    } else if (phase === 'cooldown') {
      if (since < 1.1) {
        flick.group.visible = true;
        flick.group.scale.setScalar(SIZE);
        flick.group.position.set(2.1, yAt(crownY + 3.6), -9);
        flick.group.rotation.z = 0.55 - Math.min(0.4, since * 1.6);
        flick.setOpacity(1);
      } else if (since < 2.6) {
        hand.group.visible = true;
        hand.group.scale.setScalar(SIZE);
        hand.group.position.set(2.4, yAt(crownY + 3.9 + (since - 1.1) * 5), -9);
        hand.group.rotation.z = -0.12;
        hand.setOpacity(Math.max(0, 1 - (since - 1.1) / 1.4));
      }
    } else if (phase === 'defeated') {
      if (since < 6) {
        thumb.group.visible = true;
        thumb.group.scale.setScalar(SIZE);
        thumb.group.position.set(2.2, yAt(crownY + 4 + Math.sin(t * 0.7) * 0.25), -9);
        thumb.group.rotation.z = Math.sin(t * 0.5) * 0.06;
        thumb.setOpacity(since < 4.6 ? Math.min(1, since / 0.8) : Math.max(0, 1 - (since - 4.6) / 1.4));
      }
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
