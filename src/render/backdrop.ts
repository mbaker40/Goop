/**
 * backdrop.ts - true 360-degree background panoramas with parallax.
 *
 * The old approach put a finite "hills" cutout behind the tower - its left/right edges were
 * visible ("the mountain is weirdly cut off"). This replaces it with two concentric cylinder
 * shells wrapped in seamless-repeating canvas strips (inside-facing), so the horizon goes all
 * the way around. Two shells at different radii rotate and sink at different rates = parallax.
 *
 * Content crossfades by ALTITUDE ERA and persists indefinitely:
 *   era 0 - rolling hills + distant rooftops (ground life)
 *   era 1 - banks of clouds (sky life)
 *   era 2 - nebula wisps + star clusters (space life; holds forever into Endless)
 * Each shell carries all three era meshes; opacity does the blending. Scene fog tints the far
 * shell for free depth (three.js fogs MeshBasicMaterial by default).
 */

import * as THREE from 'three';

const ERAS = 4;
/** Raw-height visibility bands per era [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd]:
 *  kitchen wall -> outdoor hills+rooftops -> cloud banks -> space. The kitchen must be GONE by
 *  "Through the Ceiling" (raw ~11-13); space holds forever into Endless. */
const ERA_BANDS: [number, number, number, number][] = [
  [-1, 0, 8, 12.5],
  [8, 12.5, 18, 25],
  [18, 25, 34, 44],
  [34, 44, Infinity, Infinity],
];

interface Shell {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  mats: THREE.MeshBasicMaterial[];
  radius: number;
  /** Rotation + sink speed factor (near shell moves more = parallax). */
  parallax: number;
}

export class Backdrop {
  readonly group = new THREE.Group();
  private shells: Shell[] = [];

  constructor() {
    // Far shell first (drawn first, sits behind everything incl. the counter disc).
    this.shells.push(this.makeShell(58, 0.55, -6));
    this.shells.push(this.makeShell(40, 1, -5));
  }

  private makeShell(radius: number, parallax: number, renderOrder: number): Shell {
    const group = new THREE.Group();
    const meshes: THREE.Mesh[] = [];
    const mats: THREE.MeshBasicMaterial[] = [];
    for (let era = 0; era < ERAS; era++) {
      const tex = eraTexture(era, parallax < 1);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide, // we are inside the cylinder
        opacity: 0,
      });
      const geo = new THREE.CylinderGeometry(radius, radius, 34, 48, 1, true);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = renderOrder;
      group.add(mesh);
      meshes.push(mesh);
      mats.push(mat);
    }
    this.group.add(group);
    return { group, meshes, mats, radius, parallax };
  }

  /** `topRaw`/`topY` are the renderer's SMOOTHED reference (no tap bounce). */
  update(topRaw: number, topY: number, _dt: number, t: number): void {
    for (const s of this.shells) {
      // Slow drift + a climb-coupled turn: rising also pans the horizon (parallax between
      // shells comes from the differing factors).
      s.group.rotation.y = t * 0.004 * s.parallax + topRaw * 0.012 * s.parallax;
      // The band sits at horizon height and SINKS gently as you climb (passing it), clamped so
      // a backdrop always remains - "background parallaxes persist indefinitely".
      s.group.position.y = topY * 0.4 - Math.min(7, topRaw * 0.14) * s.parallax;
      // Era blend by altitude.
      for (let era = 0; era < ERAS; era++) {
        const w = eraWeight(topRaw, era);
        const m = s.mats[era]!;
        if (Math.abs(m.opacity - w) > 0.003) m.opacity = w;
        s.meshes[era]!.visible = w > 0.02;
      }
    }
  }
}

function eraWeight(raw: number, era: number): number {
  const b = ERA_BANDS[era]!;
  const rise = b[1] <= b[0] ? 1 : clamp01((raw - b[0]) / (b[1] - b[0]));
  const fall = b[2] === Infinity ? 1 : 1 - clamp01((raw - b[2]) / Math.max(1e-6, b[3] - b[2]));
  return rise * fall * (era === ERAS - 1 ? 0.9 : 1);
}

/** Seamless horizontal strip for one era. `far` shells get dimmer, simpler art. */
function eraTexture(era: number, far: boolean): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  const rng = mulberry(era * 7 + (far ? 3 : 1));

  // Seamless trick: draw with x sampled from a sine-mixed series so f(0)=f(W) by construction
  // (all shapes placed via periodic functions of u = x/W * 2PI).
  const base = H * 0.55; // horizon line inside the strip

  if (era === 0) {
    // Kitchen interior: warm wall + tiled backsplash + a window with curtains + the framed cat
    // photo (relocated from a floating flyby to a wall where a cat photo makes sense).
    c.fillStyle = far ? '#efdfc0' : '#f4e6c8';
    c.fillRect(0, 40, W, H - 40);
    // Wall top edge shadow line.
    c.fillStyle = 'rgba(120,95,60,0.25)';
    c.fillRect(0, 40, W, 5);
    // Backsplash tiles on the lower half.
    c.fillStyle = far ? '#e6d2a8' : '#ead6ac';
    c.fillRect(0, base + 20, W, H - base - 20);
    c.strokeStyle = 'rgba(140,110,70,0.35)';
    c.lineWidth = 3;
    for (let x = 0; x <= W; x += 64) {
      c.beginPath();
      c.moveTo(x, base + 20);
      c.lineTo(x, H);
      c.stroke();
    }
    for (let y = base + 20; y <= H; y += 32) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
    if (!far) {
      // Window with morning sky + curtains.
      const wx = 240;
      c.fillStyle = '#8a6b3e';
      c.fillRect(wx - 8, 52, 176, 124);
      c.fillStyle = '#bfe0f6';
      c.fillRect(wx, 60, 160, 108);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath();
      c.ellipse(wx + 40, 92, 26, 10, 0, 0, Math.PI * 2);
      c.ellipse(wx + 110, 120, 30, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#8a6b3e';
      c.fillRect(wx + 76, 60, 8, 108); // mullion
      c.fillRect(wx, 110, 160, 8);
      // Curtains.
      c.fillStyle = '#d96a4a';
      c.beginPath();
      c.moveTo(wx - 8, 52);
      c.quadraticCurveTo(wx + 26, 110, wx - 2, 176);
      c.lineTo(wx - 8, 176);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(wx + 168, 52);
      c.quadraticCurveTo(wx + 134, 110, wx + 162, 176);
      c.lineTo(wx + 168, 176);
      c.closePath();
      c.fill();
      // The framed cat photo, hung slightly crooked. He is confused here too.
      c.save();
      c.translate(700, 100);
      c.rotate(-0.06);
      c.fillStyle = '#8a6f4e';
      c.fillRect(-40, -44, 80, 88);
      c.fillStyle = '#e8dfc8';
      c.fillRect(-30, -34, 60, 68);
      c.fillStyle = '#b78b52';
      c.beginPath();
      c.ellipse(0, 8, 20, 17, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(-15, -4);
      c.lineTo(-11, -18);
      c.lineTo(-3, -7);
      c.closePath();
      c.moveTo(15, -4);
      c.lineTo(11, -18);
      c.lineTo(3, -7);
      c.closePath();
      c.fill();
      c.fillStyle = '#2a2436';
      c.beginPath();
      c.ellipse(-7, 6, 2.5, 3.5, 0, 0, Math.PI * 2);
      c.ellipse(7, 6, 2.5, 3.5, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#2a2436';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 16, 4, Math.PI * 1.15, Math.PI * 1.85); // small concerned mouth
      c.stroke();
      c.restore();
      // A hanging wooden spoon + towel for lived-in warmth.
      c.fillStyle = '#a5854f';
      c.fillRect(524, 70, 8, 56);
      c.beginPath();
      c.ellipse(528, 138, 12, 18, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#7fb3d6';
      c.fillRect(880, 66, 52, 74);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.fillRect(880, 88, 52, 8);
    }
  } else if (era === 1) {
    // Rolling hills: two silhouette bands built from summed sines (period-exact = seamless).
    const bands = far ? [['#a9bd85', 0.5, 20]] : ([['#9db27a', 0.55, 26], ['#7a9460', 0.8, 34]] as const);
    for (const [color, yF, amp] of bands as unknown as [string, number, number][]) {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const u = (x / W) * Math.PI * 2;
        const y = base + (H - base) * yF - (Math.sin(u) * 0.5 + Math.sin(u * 2 + 1.3) * 0.3 + Math.sin(u * 5 + 4) * 0.2) * amp;
        c.lineTo(x, y);
      }
      c.lineTo(W, H);
      c.closePath();
      c.fill();
    }
    if (!far) {
      // Distant rooftops + a water tower notched into the near band.
      c.fillStyle = '#6d8455';
      for (let i = 0; i < 7; i++) {
        const x = ((i * 149.3) % W | 0) + 10;
        const w = 26 + ((i * 37) % 22);
        const y = base + 38 + ((i * 53) % 18);
        c.fillRect(x, y, w, H - y);
        c.beginPath();
        c.moveTo(x - 3, y);
        c.lineTo(x + w / 2, y - 12);
        c.lineTo(x + w + 3, y);
        c.fill();
      }
    }
  } else if (era === 2) {
    // Cloud banks: flat-bottomed puffs from periodic placement.
    const tones = far ? ['rgba(244,248,255,0.85)'] : ['rgba(238,244,252,0.9)', 'rgba(255,255,255,0.95)'];
    tones.forEach((tone, k) => {
      c.fillStyle = tone;
      const n = far ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const cx = ((i / n) * W + k * 67 + rng() * 40) % W;
        const cy = base + 20 + k * 26 + rng() * 16;
        const w = 90 + rng() * 70;
        cloudPuff(c, cx, cy, w);
        cloudPuff(c, (cx + W) % W === cx ? cx - W : cx - W, cy, w); // wrap copy for seam safety
        cloudPuff(c, cx + W, cy, w);
      }
    });
  } else {
    // Space: nebula wisps + star clusters. Subtle - the palette sky carries the mood.
    for (let i = 0; i < (far ? 4 : 6); i++) {
      const cx = rng() * W;
      const cy = rng() * H * 0.8 + 10;
      const r = 50 + rng() * 90;
      const grad = c.createRadialGradient(cx, cy, 4, cx, cy, r);
      const hue = 250 + rng() * 60;
      grad.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.22)`);
      grad.addColorStop(1, 'hsla(260, 60%, 40%, 0)');
      c.fillStyle = grad;
      c.fillRect(cx - r, cy - r, r * 2, r * 2);
      const grad2 = c.createRadialGradient((cx + W) % W, cy, 4, (cx + W) % W, cy, r);
      grad2.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.22)`);
      grad2.addColorStop(1, 'hsla(260, 60%, 40%, 0)');
    }
    c.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 60; i++) {
      const x = rng() * W;
      const y = rng() * H;
      const r = rng() < 0.15 ? 1.6 : 0.9;
      c.fillRect(x, y, r, r);
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function cloudPuff(c: CanvasRenderingContext2D, cx: number, cy: number, w: number): void {
  c.beginPath();
  c.ellipse(cx, cy, w * 0.5, w * 0.16, 0, 0, Math.PI * 2);
  c.ellipse(cx - w * 0.2, cy - w * 0.08, w * 0.22, w * 0.13, 0, 0, Math.PI * 2);
  c.ellipse(cx + w * 0.15, cy - w * 0.1, w * 0.26, w * 0.15, 0, 0, Math.PI * 2);
  c.fill();
}

/** Tiny deterministic PRNG (renderer-only; the sim's seeded Rng must not be used here). */
function mulberry(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
