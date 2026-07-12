/**
 * markers.ts — fixed-altitude SCALE MARKERS (PLAN §3 set dressing × pillar #1 "the number must be
 * felt"). The camera zoom keeps the tower a similar size on screen, so scale is communicated by
 * reference objects: each marker lives at a raw altitude and sweeps DOWN past the tower top as you
 * climb (a parallax ascent), while later markers are physically bigger — birds, then a blimp,
 * then a jet, then the Moon. Combo of honest scale cues and gags, per design direction.
 *
 * Cheap by construction: primitive meshes, shared materials, at most a handful visible at once
 * (visibility window ±14 raw), tiny per-frame math.
 */

import * as THREE from 'three';

/** World-units of vertical travel per raw-height unit of climbing. */
const K = 0.55;
/** Markers further than this (in raw units) from the tower top are hidden — keeps ~2-3 visible. */
const WINDOW = 9;

interface Marker {
  raw: number;
  obj: THREE.Object3D;
  baseX: number;
  baseZ: number;
  /** Per-marker idle animation. */
  animate?: (obj: THREE.Object3D, t: number) => void;
}

const INK = 0xe9e4f5;
const DARK = 0x2a2436;

function mat(color: number, opts: { rough?: number; metal?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0 });
}

function bird(): THREE.Object3D {
  const g = new THREE.Group();
  const m = mat(DARK, { rough: 0.9 });
  const wingGeo = new THREE.ConeGeometry(0.09, 0.5, 4);
  const l = new THREE.Mesh(wingGeo, m);
  l.rotation.z = Math.PI / 2.4;
  l.position.x = -0.2;
  const r = new THREE.Mesh(wingGeo, m);
  r.rotation.z = -Math.PI / 2.4;
  r.position.x = 0.2;
  g.add(l, r);
  return g;
}

function toaster(): THREE.Object3D {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.2), mat(0xc7ccd6, { rough: 0.3, metal: 0.7 }));
  body.position.y = 0.75;
  const slotGeo = new THREE.BoxGeometry(0.8, 0.1, 0.3);
  const s1 = new THREE.Mesh(slotGeo, mat(0x14121a));
  s1.position.set(-0.45, 1.52, 0);
  const s2 = s1.clone();
  s2.position.x = 0.45;
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.3), mat(0x14121a));
  lever.position.set(1.2, 1.0, 0);
  // Judgmental eyes.
  const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const e1 = new THREE.Mesh(eyeGeo, mat(0x14121a));
  e1.position.set(-0.35, 1.0, 0.62);
  const e2 = e1.clone();
  e2.position.x = 0.35;
  g.add(body, s1, s2, lever, e1, e2);
  return g;
}

function house(): THREE.Object3D {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.2), mat(0x8a97a5));
  body.position.y = 0.9;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.3, 4), mat(0x6f5a3a));
  roof.position.y = 2.4;
  roof.rotation.y = Math.PI / 4;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35), mat(0x5a4a34));
  chimney.position.set(0.8, 2.6, 0.4);
  g.add(body, roof, chimney);
  return g;
}

function waterTower(): THREE.Object3D {
  const g = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.15, 1.4, 12), mat(0x9aa3b0, { rough: 0.5, metal: 0.3 }));
  tank.position.y = 2.2;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.6, 12), mat(0x7d8794));
  cap.position.y = 3.2;
  const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6);
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(legGeo, mat(0x6d7684));
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    leg.position.set(Math.cos(a) * 0.8, 1.1, Math.sin(a) * 0.8);
    g.add(leg);
  }
  g.add(tank, cap);
  return g;
}

function blimp(): THREE.Object3D {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.6, 6, 12), mat(0xd9d2e8, { rough: 0.45 }));
  body.rotation.z = Math.PI / 2;
  const gondola = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.4), mat(DARK));
  gondola.position.y = -0.95;
  const finGeo = new THREE.BoxGeometry(0.1, 0.8, 0.5);
  const f1 = new THREE.Mesh(finGeo, mat(0xb8aed0));
  f1.position.set(-1.9, 0.3, 0);
  const f2 = new THREE.Mesh(finGeo, mat(0xb8aed0));
  f2.position.set(-1.9, -0.3, 0);
  // "WHY" on the side (one-time canvas sprite; text is content, per the design table).
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 48;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#2a2436';
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WHY', 64, 26);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.65),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  label.position.set(0, 0.05, 0.92);
  g.add(body, gondola, f1, f2, label);
  return g;
}

function cloudPuff(): THREE.Object3D {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.88 });
  const blobs: [number, number, number, number][] = [
    [0, 0, 0, 1],
    [0.9, 0.15, 0.2, 0.7],
    [-0.85, 0.1, -0.15, 0.65],
    [0.3, 0.45, -0.2, 0.55],
  ];
  for (const [x, y, z, r] of blobs) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
    b.position.set(x, y, z);
    g.add(b);
  }
  return g;
}

function jet(): THREE.Object3D {
  const g = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 2.6, 6, 10), mat(0xe8ecf2, { rough: 0.35, metal: 0.4 }));
  fus.rotation.z = Math.PI / 2;
  const wingGeo = new THREE.BoxGeometry(0.9, 0.08, 2.6);
  const wings = new THREE.Mesh(wingGeo, mat(0xc7ccd6, { metal: 0.4 }));
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.6), mat(0xc7ccd6));
  tail.position.set(-1.5, 0.4, 0);
  g.add(fus, wings, tail);
  return g;
}

function satellite(): THREE.Object3D {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat(0xd9d2b8, { rough: 0.4, metal: 0.5 }));
  const panelGeo = new THREE.BoxGeometry(2.2, 0.05, 0.8);
  const p1 = new THREE.Mesh(panelGeo, mat(0x3355aa, { rough: 0.3, metal: 0.6 }));
  p1.position.x = 1.6;
  const p2 = p1.clone();
  p2.position.x = -1.6;
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 10), mat(0xe8ecf2));
  dish.position.y = 0.6;
  g.add(body, p1, p2, dish);
  return g;
}

function astronaut(): THREE.Object3D {
  const g = new THREE.Group();
  const suit = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.5, 6, 10), mat(0xf2f0ea, { rough: 0.5 }));
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mat(0xf2f0ea));
  helmet.position.y = 0.65;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0xffb03a, { rough: 0.2, metal: 0.5 }));
  visor.position.set(0, 0.65, 0.16);
  // The thumbs-up (he gets it): a tiny fist + thumb.
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 4, 6), mat(0xf2f0ea));
  arm.position.set(0.5, 0.2, 0);
  arm.rotation.z = -0.9;
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 4, 6), mat(0xf2f0ea));
  thumb.position.set(0.78, 0.55, 0);
  g.add(suit, helmet, visor, arm, thumb);
  return g;
}

function moon(): THREE.Object3D {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 16), mat(0xcfd2d8, { rough: 0.95 }));
  const craterMat = mat(0xaeb2ba, { rough: 1 });
  const craters: [number, number, number, number][] = [
    [0.9, 0.8, 1.9, 0.34],
    [-1.2, 0.2, 2.0, 0.24],
    [0.2, -1.1, 2.05, 0.28],
  ];
  for (const [x, y, z, r] of craters) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), craterMat);
    c.position.set(x, y, z).normalize().multiplyScalar(1.5);
    g.add(c);
  }
  g.add(m);
  return g;
}

function facePlanet(): THREE.Object3D {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.9, 20, 16), mat(0xc060ff, { rough: 0.8 }));
  const eyeGeo = new THREE.SphereGeometry(0.28, 10, 8);
  const white = mat(0xffffff, { rough: 0.4 });
  const e1 = new THREE.Mesh(eyeGeo, white);
  e1.position.set(-0.6, 0.48, 1.66);
  const e2 = e1.clone();
  e2.position.x = 0.95;
  const pupilGeo = new THREE.SphereGeometry(0.13, 8, 6);
  const dark = mat(0x14121a);
  const p1 = new THREE.Mesh(pupilGeo, dark);
  p1.position.set(-0.57, 0.46, 1.9);
  const p2 = p1.clone();
  p2.position.x = 1.0;
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 12, Math.PI), dark);
  mouth.position.set(0, -0.44, 1.72);
  mouth.rotation.x = Math.PI;
  g.add(body, e1, e2, p1, p2, mouth);
  return g;
}

export class ScaleMarkers {
  readonly group = new THREE.Group();
  private markers: Marker[] = [];

  constructor() {
    // Placement note: PORTRAIT is the tight axis — at tower depth the visible half-width is only
    // ~2.5-4 world units. Markers therefore sit at modest |x| (2.8-4.5) and are pushed BACK in z,
    // where the frustum is wider, with their scale bumped to compensate for the extra distance.
    const add = (raw: number, obj: THREE.Object3D, x: number, z: number, animate?: Marker['animate']) => {
      obj.visible = false;
      obj.scale.setScalar(Math.min(1.7, 1 + Math.abs(z) * 0.09));
      this.group.add(obj);
      this.markers.push({ raw, obj, baseX: x, baseZ: z, animate });
    };

    void INK;
    // Kitchen / house band.
    add(3, toaster(), -3.2, -6);
    // Birds (Through the Ceiling → low sky).
    add(7, bird(), 2.8, -6, (o, t) => {
      o.position.x += Math.sin(t * 0.7) * 0.8;
      o.children.forEach((w, i) => (w.rotation.z = (i === 0 ? 1 : -1) * (Math.PI / 2.4 + Math.sin(t * 9) * 0.35)));
    });
    add(9, bird(), -3, -7, (o, t) => {
      o.position.x += Math.cos(t * 0.6) * 1.1;
      o.children.forEach((w, i) => (w.rotation.z = (i === 0 ? 1 : -1) * (Math.PI / 2.4 + Math.sin(t * 8 + 2) * 0.35)));
    });
    // Suburbia.
    add(11.5, house(), -3.8, -9);
    add(14.5, waterTower(), 3.6, -8);
    add(17.5, blimp(), -3.4, -10, (o, t) => {
      o.position.x += Math.sin(t * 0.22) * 1.2;
      o.rotation.y = Math.sin(t * 0.15) * 0.25;
    });
    // Cloud layer.
    add(20, cloudPuff(), 3.2, -9, (o, t) => (o.position.x += Math.sin(t * 0.18) * 1.2));
    add(26, cloudPuff(), -3.6, -8, (o, t) => (o.position.x += Math.cos(t * 0.15) * 1.4));
    add(23, jet(), 0, -12, (o, t) => {
      // Streaks across, loops around (a busy route, apparently).
      o.position.x = ((t * 2.6) % 30) - 15;
      o.rotation.y = Math.PI;
    });
    // Low orbit.
    add(32, satellite(), 3.2, -9, (o, t) => (o.rotation.y = t * 0.4));
    add(38, astronaut(), -2.8, -8, (o, t) => {
      o.rotation.z = Math.sin(t * 0.3) * 0.4;
      o.position.x += Math.sin(t * 0.25) * 0.6;
    });
    // Deep space.
    add(48, moon(), -6, -16, (o, t) => (o.rotation.y = t * 0.05));
    add(60, facePlanet(), 6.5, -16, (o, t) => (o.rotation.y = Math.sin(t * 0.2) * 0.3));
  }

  /** Position markers relative to the climbing tower top. `topRaw` is the sim height, `topY` the
   *  tower top's world Y. Markers slide down K world-units per raw unit climbed. */
  update(topRaw: number, topY: number, t: number): void {
    for (const m of this.markers) {
      const delta = m.raw - topRaw;
      if (Math.abs(delta) > WINDOW) {
        m.obj.visible = false;
        continue;
      }
      m.obj.visible = true;
      m.obj.position.set(m.baseX, Math.max(0, topY + delta * K), m.baseZ);
      m.animate?.(m.obj, t);
    }
  }
}
