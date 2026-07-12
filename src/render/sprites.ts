/**
 * sprites.ts — 2D "cardboard cutout" background assets (Little Big Planet style, per design
 * direction). Each asset is drawn once with canvas 2D, run through a sticker pipeline (thick pale
 * outline + soft drop shadow), and mounted on a THREE.Sprite so it always faces the camera like a
 * paper cutout on a stick. No image files; everything is drawn in code.
 */

import * as THREE from 'three';

type Draw = (c: CanvasRenderingContext2D, s: number) => void;

/** Expanded silhouette of the art (stamped at ring offsets), filled with `color`. */
function silhouette(art: HTMLCanvasElement, size: number, color: string, grow = 1): HTMLCanvasElement {
  const edge = document.createElement('canvas');
  edge.width = edge.height = size;
  const e = edge.getContext('2d')!;
  const R = Math.max(3, size * 0.018) * grow;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    e.drawImage(art, Math.cos(ang) * R, Math.sin(ang) * R);
  }
  e.globalCompositeOperation = 'source-in';
  e.fillStyle = color;
  e.fillRect(0, 0, size, size);
  return edge;
}

function drawArt(draw: Draw, size: number): HTMLCanvasElement {
  const art = document.createElement('canvas');
  art.width = art.height = size;
  const a = art.getContext('2d')!;
  a.save();
  draw(a, size);
  a.restore();
  return art;
}

function toTexture(cv: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

/** Front face: cardboard-colored cut shape with the kid's drawing on it. */
function frontTexture(draw: Draw, size = 256): THREE.CanvasTexture {
  const art = drawArt(draw, size);
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const o = out.getContext('2d')!;
  o.drawImage(silhouette(art, size, '#d9bd8a'), 0, 0); // the cardboard the shape was cut from
  o.globalAlpha = 0.92; // let a whisper of board show through the marker drawing
  o.drawImage(art, 0, 0);
  o.globalAlpha = 1;
  // Form shading: a soft top-light gradient clipped to the cutout, so boards read as lit objects
  // instead of flat stickers (cheap depth cue).
  const shade = document.createElement('canvas');
  shade.width = shade.height = size;
  const sh = shade.getContext('2d')!;
  sh.drawImage(out, 0, 0);
  sh.globalCompositeOperation = 'source-in';
  const grad = sh.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(255,255,255,0.14)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(20,10,0,0.22)');
  sh.fillStyle = grad;
  sh.fillRect(0, 0, size, size);
  o.drawImage(shade, 0, 0);
  return toTexture(out);
}

/** A camera-facing cutout sprite, `w`×`h` in world units (used for the receding planet). */
export function cutout(draw: Draw, w: number, h: number, size = 256): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: frontTexture(draw, size), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(w, h, 1);
  return s;
}

/** A cardboard cutout WITH THICKNESS: the drawn front face plus offset corrugation layers behind
 *  it, on a group that stays world-oriented (given a slight per-prop tilt, the edge shows — like a
 *  kid's cardboard cutout on a stick). Returns the group + an opacity setter for ground fading. */
export interface Board {
  group: THREE.Group;
  setOpacity(o: number): void;
}

export function board(draw: Draw, w: number, h: number, tilt = 0, size = 256): Board {
  const group = new THREE.Group();
  const art = drawArt(draw, size);
  const mats: THREE.MeshBasicMaterial[] = [];
  const layer = (tex: THREE.Texture, z: number): void => {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    mats.push(m);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.z = z;
    group.add(p);
  };
  // Back to front: dark corrugation core, mid board, drawn face. The offsets are the thickness.
  layer(toTexture(silhouette(art, size, '#8a6b3e', 1.15)), -0.1);
  layer(toTexture(silhouette(art, size, '#b28e57')), -0.05);
  layer(frontTexture(draw, size), 0);
  group.rotation.y = tilt;
  return {
    group,
    setOpacity(o: number) {
      for (const m of mats) m.opacity = o;
    },
  };
}

// ---- drawing helpers ----
const TAU = Math.PI * 2;
function ell(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

// ---- the assets (256×256 coordinate space) ----

export const ART: Record<string, Draw> = {
  saltShaker: (c) => {
    rr(c, 88, 70, 80, 150, 26, '#f2f0ea');
    rr(c, 92, 52, 72, 34, 14, '#c0c4cc');
    for (const [x, y] of [[112, 66], [128, 60], [144, 66]] as const) ell(c, x, y, 4.5, 4.5, '#5a5f6a');
    c.strokeStyle = '#d8d4c8';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(100, 130);
    c.lineTo(156, 130);
    c.stroke();
  },
  toaster: (c) => {
    rr(c, 40, 96, 176, 110, 30, '#c7ccd6');
    rr(c, 40, 150, 176, 56, 20, '#aab1bf');
    rr(c, 64, 84, 52, 22, 8, '#2a2436');
    rr(c, 140, 84, 52, 22, 8, '#2a2436');
    rr(c, 216, 118, 14, 34, 6, '#2a2436');
    // Judgmental face.
    ell(c, 98, 138, 8, 10, '#2a2436');
    ell(c, 158, 138, 8, 10, '#2a2436');
    c.strokeStyle = '#2a2436';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(92, 182);
    c.lineTo(164, 182);
    c.stroke();
    // Unimpressed brows.
    c.beginPath();
    c.moveTo(84, 122);
    c.lineTo(110, 128);
    c.moveTo(172, 122);
    c.lineTo(146, 128);
    c.stroke();
  },
  bird: (c) => {
    ell(c, 128, 140, 52, 38, '#3a3448');
    ell(c, 174, 116, 24, 20, '#3a3448');
    c.fillStyle = '#ffb03a';
    c.beginPath();
    c.moveTo(194, 112);
    c.lineTo(222, 118);
    c.lineTo(194, 126);
    c.fill();
    ell(c, 178, 110, 4.5, 4.5, '#f4efe2');
    // Wing (raised, mid-flap).
    c.fillStyle = '#4d4560';
    c.beginPath();
    c.moveTo(120, 130);
    c.quadraticCurveTo(70, 60, 46, 84);
    c.quadraticCurveTo(84, 120, 112, 152);
    c.fill();
    // Tail.
    c.beginPath();
    c.moveTo(84, 148);
    c.lineTo(44, 158);
    c.lineTo(80, 170);
    c.fill();
  },
  catPhoto: (c) => {
    rr(c, 48, 48, 160, 160, 10, '#8a6f4e');
    rr(c, 64, 64, 128, 128, 4, '#e8dfc8');
    // Confused cat.
    ell(c, 128, 140, 44, 38, '#b78b52');
    c.fillStyle = '#b78b52';
    c.beginPath();
    c.moveTo(94, 116);
    c.lineTo(102, 84);
    c.lineTo(120, 108);
    c.fill();
    c.beginPath();
    c.moveTo(162, 116);
    c.lineTo(154, 84);
    c.lineTo(136, 108);
    c.fill();
    ell(c, 112, 134, 6, 9, '#2a2436');
    ell(c, 144, 134, 6, 9, '#2a2436');
    ell(c, 128, 152, 5, 4, '#7a4a3a');
    c.strokeStyle = '#2a2436';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(128, 156);
    c.lineTo(128, 164);
    c.moveTo(118, 170);
    c.quadraticCurveTo(128, 162, 138, 170);
    c.stroke();
  },
  house: (c) => {
    rr(c, 56, 120, 144, 96, 6, '#9aa7b5');
    c.fillStyle = '#7a5a3a';
    c.beginPath();
    c.moveTo(40, 124);
    c.lineTo(128, 56);
    c.lineTo(216, 124);
    c.fill();
    rr(c, 150, 68, 22, 40, 4, '#6a4a2e');
    rr(c, 116, 156, 32, 60, 4, '#5a4a3a');
    rr(c, 74, 140, 30, 30, 4, '#cfe4f2');
    rr(c, 156, 140, 30, 30, 4, '#cfe4f2');
    ell(c, 142, 186, 3.5, 3.5, '#2a2436');
  },
  kite: (c) => {
    c.fillStyle = '#ff5d5d';
    c.beginPath();
    c.moveTo(128, 36);
    c.lineTo(188, 110);
    c.lineTo(128, 184);
    c.lineTo(68, 110);
    c.fill();
    c.strokeStyle = '#f4efe2';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(128, 36);
    c.lineTo(128, 184);
    c.moveTo(68, 110);
    c.lineTo(188, 110);
    c.stroke();
    c.strokeStyle = '#e9e4f5';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(128, 184);
    c.quadraticCurveTo(110, 214, 92, 224);
    c.stroke();
    for (const [x, y] of [[116, 200], [100, 216]] as const) {
      c.save();
      c.translate(x, y);
      c.rotate(0.6);
      rr(c, -9, -5, 18, 10, 3, '#ffb03a');
      c.restore();
    }
  },
  waterTower: (c) => {
    // Legs.
    c.strokeStyle = '#6d7684';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(84, 130);
    c.lineTo(70, 226);
    c.moveTo(172, 130);
    c.lineTo(186, 226);
    c.moveTo(84, 160);
    c.lineTo(172, 190);
    c.moveTo(172, 160);
    c.lineTo(84, 190);
    c.stroke();
    rr(c, 62, 74, 132, 70, 18, '#9aa3b0');
    c.fillStyle = '#7d8794';
    c.beginPath();
    c.moveTo(54, 78);
    c.lineTo(128, 34);
    c.lineTo(202, 78);
    c.fill();
    c.fillStyle = '#5a6270';
    c.font = 'bold 30px monospace';
    c.textAlign = 'center';
    c.fillText('H₂GOO', 128, 120);
  },
  blimp: (c) => {
    ell(c, 120, 110, 96, 46, '#d9d2e8');
    c.fillStyle = '#b8aed0';
    c.beginPath();
    c.moveTo(36, 92);
    c.lineTo(6, 72);
    c.lineTo(18, 110);
    c.lineTo(6, 148);
    c.lineTo(36, 128);
    c.fill();
    rr(c, 96, 156, 52, 22, 8, '#2a2436');
    c.strokeStyle = '#2a2436';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(104, 150);
    c.lineTo(96, 160);
    c.moveTo(140, 150);
    c.lineTo(148, 160);
    c.stroke();
    c.fillStyle = '#2a2436';
    c.font = 'bold 44px monospace';
    c.textAlign = 'center';
    c.fillText('WHY', 124, 124);
  },
  cloud: (c) => {
    ell(c, 100, 140, 62, 44, '#ffffff');
    ell(c, 160, 124, 52, 40, '#ffffff');
    ell(c, 66, 120, 38, 30, '#ffffff');
    ell(c, 196, 150, 36, 28, '#f2f5fa');
    ell(c, 130, 158, 70, 34, '#eef2f8');
  },
  jet: (c) => {
    ell(c, 128, 122, 104, 30, '#e8ecf2');
    c.fillStyle = '#c7ccd6';
    c.beginPath();
    c.moveTo(120, 118);
    c.lineTo(64, 176);
    c.lineTo(104, 176);
    c.lineTo(150, 126);
    c.fill();
    c.beginPath();
    c.moveTo(44, 116);
    c.lineTo(20, 76);
    c.lineTo(52, 92);
    c.fill();
    // Windows.
    c.fillStyle = '#5a90c8';
    for (let i = 0; i < 7; i++) ell(c, 92 + i * 20, 114, 5, 5, '#5a90c8');
    ell(c, 218, 118, 12, 8, '#5a90c8');
    // Honk lines (it honks).
    c.strokeStyle = '#ffb03a';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(238, 96);
    c.lineTo(252, 88);
    c.moveTo(240, 112);
    c.lineTo(254, 110);
    c.stroke();
  },
  balloon: (c) => {
    c.fillStyle = '#ff8a5d';
    c.beginPath();
    c.arc(128, 96, 70, 0, TAU);
    c.fill();
    c.fillStyle = '#ffd35d';
    c.beginPath();
    c.ellipse(128, 96, 26, 70, 0, 0, TAU);
    c.fill();
    c.strokeStyle = '#e9e4f5';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(84, 152);
    c.lineTo(104, 196);
    c.moveTo(172, 152);
    c.lineTo(152, 196);
    c.stroke();
    rr(c, 100, 192, 56, 36, 8, '#8a6f4e');
  },
  satellite: (c) => {
    rr(c, 20, 106, 70, 44, 6, '#3355aa');
    rr(c, 166, 106, 70, 44, 6, '#3355aa');
    c.strokeStyle = '#8fb2e8';
    c.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      c.beginPath();
      c.moveTo(20 + i * 23, 106);
      c.lineTo(20 + i * 23, 150);
      c.moveTo(166 + i * 23, 106);
      c.lineTo(166 + i * 23, 150);
      c.stroke();
    }
    rr(c, 96, 96, 64, 64, 10, '#d9d2b8');
    ell(c, 128, 84, 22, 12, '#e8ecf2');
    c.strokeStyle = '#e8ecf2';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(128, 84);
    c.lineTo(128, 64);
    c.stroke();
    ell(c, 128, 60, 5, 5, '#ff5d5d');
  },
  astronaut: (c) => {
    ell(c, 118, 88, 44, 42, '#f2f0ea');
    ell(c, 118, 92, 30, 26, '#ffb03a');
    rr(c, 84, 122, 68, 76, 22, '#f2f0ea');
    rr(c, 74, 130, 22, 54, 10, '#dcd8cc');
    // Thumbs-up arm.
    c.save();
    c.translate(162, 150);
    c.rotate(-0.5);
    rr(c, -10, -34, 22, 48, 10, '#dcd8cc');
    rr(c, -4, -52, 12, 24, 6, '#f2f0ea');
    c.restore();
    // Little backpack.
    rr(c, 56, 126, 20, 44, 6, '#9aa3b0');
  },
  ufo: (c) => {
    ell(c, 128, 120, 96, 30, '#9aa3b0');
    ell(c, 128, 96, 44, 30, '#bfe6f2');
    ell(c, 128, 108, 40, 14, '#7d8794');
    for (let i = 0; i < 5; i++) ell(c, 56 + i * 36, 124, 7, 7, i % 2 ? '#b6e84a' : '#ffb03a');
    // Beam (curious, noncommittal).
    c.fillStyle = 'rgba(182,232,74,0.35)';
    c.beginPath();
    c.moveTo(104, 140);
    c.lineTo(76, 220);
    c.lineTo(180, 220);
    c.lineTo(152, 140);
    c.fill();
  },
  moon: (c) => {
    ell(c, 128, 128, 88, 88, '#cfd2d8');
    ell(c, 96, 100, 20, 20, '#aeb2ba');
    ell(c, 160, 140, 26, 26, '#aeb2ba');
    ell(c, 112, 172, 14, 14, '#aeb2ba');
    ell(c, 172, 84, 11, 11, '#aeb2ba');
    // It is pretending not to notice.
    ell(c, 88, 132, 5, 8, '#8a8f9a');
    ell(c, 128, 128, 88, 88, 'rgba(0,0,0,0)');
  },
  facePlanet: (c) => {
    ell(c, 128, 128, 78, 78, '#c060ff');
    // Ring.
    c.strokeStyle = '#b6e84a';
    c.lineWidth = 10;
    c.beginPath();
    c.ellipse(128, 134, 116, 30, -0.28, 0, TAU);
    c.stroke();
    ell(c, 100, 108, 14, 16, '#ffffff');
    ell(c, 156, 108, 14, 16, '#ffffff');
    ell(c, 103, 112, 6, 8, '#14121a');
    ell(c, 153, 112, 6, 8, '#14121a');
    c.strokeStyle = '#14121a';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(128, 148, 26, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  },
  whale: (c) => {
    // Cosmic goop whale.
    c.fillStyle = '#7fe0c0';
    c.beginPath();
    c.moveTo(30, 130);
    c.quadraticCurveTo(70, 66, 150, 76);
    c.quadraticCurveTo(214, 84, 226, 122);
    c.quadraticCurveTo(214, 158, 140, 162);
    c.quadraticCurveTo(70, 166, 30, 130);
    c.fill();
    // Tail.
    c.beginPath();
    c.moveTo(216, 116);
    c.quadraticCurveTo(250, 92, 246, 70);
    c.lineTo(226, 96);
    c.quadraticCurveTo(238, 120, 252, 140);
    c.quadraticCurveTo(230, 140, 214, 128);
    c.fill();
    ell(c, 78, 112, 7, 10, '#14321f');
    c.strokeStyle = '#14321f';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(70, 132, 16, 0.1 * Math.PI, 0.6 * Math.PI);
    c.stroke();
    // Goop drips.
    for (const [x, y] of [[110, 168], [150, 170], [190, 158]] as const) {
      c.fillStyle = '#b6e84a';
      c.beginPath();
      c.ellipse(x, y + 10, 7, 12, 0, 0, TAU);
      c.fill();
    }
    // Spout: tiny goop fountain.
    c.fillStyle = '#b6e84a';
    ell(c, 96, 62, 6, 10, '#b6e84a');
    ell(c, 84, 54, 4, 7, '#b6e84a');
    ell(c, 108, 52, 4, 7, '#b6e84a');
  },
  hand: (c) => {
    // The marble hand, descending, mid-windup (foreshadows The Flick).
    c.fillStyle = '#e8e4dc';
    rr(c, 74, 10, 108, 96, 34, '#e8e4dc'); // palm (from below)
    // Fingers pointing down.
    rr(c, 70, 88, 26, 92, 13, '#e8e4dc');
    rr(c, 100, 96, 26, 112, 13, '#e8e4dc');
    rr(c, 130, 96, 26, 104, 13, '#e8e4dc');
    rr(c, 160, 88, 26, 88, 13, '#e8e4dc');
    // The flicking finger, cocked back against the thumb.
    c.save();
    c.translate(52, 96);
    c.rotate(0.5);
    rr(c, -13, -10, 26, 96, 13, '#dcd6ca');
    c.restore();
    // Marble veining.
    c.strokeStyle = '#c9c2b4';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(92, 30);
    c.quadraticCurveTo(120, 52, 108, 84);
    c.moveTo(150, 24);
    c.quadraticCurveTo(160, 48, 176, 60);
    c.stroke();
  },
  planetBall: (c) => {
    // The home planet, receding: a kitchen-counter-tile world with a goop splat continent.
    ell(c, 128, 128, 96, 96, '#d9c7a3');
    c.save();
    c.beginPath();
    c.arc(128, 128, 96, 0, TAU);
    c.clip();
    c.strokeStyle = '#c4b28e';
    c.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(20 + i * 38, 16);
      c.lineTo(20 + i * 38, 240);
      c.stroke();
      c.beginPath();
      c.moveTo(16, 20 + i * 38);
      c.lineTo(240, 20 + i * 38);
      c.stroke();
    }
    // Goop continents.
    ell(c, 96, 96, 34, 24, '#b6e84a');
    ell(c, 170, 150, 26, 30, '#9bcf3e');
    ell(c, 120, 180, 18, 12, '#b6e84a');
    c.restore();
    // Atmosphere rim.
    c.strokeStyle = 'rgba(182,232,74,0.45)';
    c.lineWidth = 8;
    c.beginPath();
    c.arc(128, 128, 100, 0, TAU);
    c.stroke();
  },
};

// ---- extra environmental pieces (counter diorama + landscape depth) ----
Object.assign(ART, {
  mug: ((c: CanvasRenderingContext2D) => {
    rr(c, 60, 70, 120, 130, 22, '#d96a4a');
    c.strokeStyle = '#b4523a';
    c.lineWidth = 10;
    c.beginPath();
    c.arc(196, 130, 38, -1.2, 1.2);
    c.stroke();
    ell(c, 120, 78, 58, 18, '#8a4a3a');
    ell(c, 120, 76, 48, 12, '#5a3028');
    // Steam curls.
    c.strokeStyle = '#e9e4f5';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(100, 52);
    c.quadraticCurveTo(88, 36, 100, 22);
    c.moveTo(140, 52);
    c.quadraticCurveTo(152, 36, 140, 22);
    c.stroke();
  }) as Draw,
  spoon: ((c: CanvasRenderingContext2D) => {
    c.save();
    c.translate(128, 128);
    c.rotate(0.7);
    ell(c, 0, -62, 34, 46, '#c7ccd6');
    ell(c, 0, -62, 22, 32, '#aab1bf');
    rr(c, -9, -18, 18, 130, 9, '#c7ccd6');
    c.restore();
  }) as Draw,
  fence: ((c: CanvasRenderingContext2D) => {
    c.fillStyle = '#e8e2d4';
    for (let i = 0; i < 5; i++) {
      const x = 24 + i * 46;
      c.fillRect(x, 96, 26, 110);
      c.beginPath();
      c.moveTo(x, 96);
      c.lineTo(x + 13, 74);
      c.lineTo(x + 26, 96);
      c.fill();
    }
    rr(c, 12, 116, 232, 16, 6, '#d4cbb8');
    rr(c, 12, 164, 232, 16, 6, '#d4cbb8');
  }) as Draw,
  bush: ((c: CanvasRenderingContext2D) => {
    ell(c, 90, 160, 62, 48, '#5a9a48');
    ell(c, 160, 150, 58, 52, '#67aa52');
    ell(c, 126, 120, 52, 42, '#74b85c');
    ell(c, 78, 120, 12, 12, '#8fd06a');
    ell(c, 170, 108, 10, 10, '#8fd06a');
  }) as Draw,
  hills: ((c: CanvasRenderingContext2D) => {
    c.fillStyle = '#7ba86a';
    c.beginPath();
    c.moveTo(0, 210);
    c.quadraticCurveTo(60, 120, 130, 170);
    c.quadraticCurveTo(190, 210, 256, 150);
    c.lineTo(256, 240);
    c.lineTo(0, 240);
    c.fill();
    c.fillStyle = '#639257';
    c.beginPath();
    c.moveTo(0, 232);
    c.quadraticCurveTo(90, 170, 170, 215);
    c.quadraticCurveTo(220, 238, 256, 218);
    c.lineTo(256, 248);
    c.lineTo(0, 248);
    c.fill();
    // A tiny distant house on the hill.
    rr(c, 60, 148, 22, 16, 2, '#e8e2d4');
    c.fillStyle = '#a0522d';
    c.beginPath();
    c.moveTo(56, 150);
    c.lineTo(71, 138);
    c.lineTo(86, 150);
    c.fill();
  }) as Draw,
  windowFrame: ((c: CanvasRenderingContext2D) => {
    // The kitchen window behind everything: morning light + a curtain.
    rr(c, 24, 20, 208, 216, 12, '#8a6f4e');
    rr(c, 40, 36, 176, 184, 6, '#ffe9b0');
    c.fillStyle = '#ffd98a';
    c.fillRect(40, 130, 176, 90);
    c.strokeStyle = '#8a6f4e';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(128, 36);
    c.lineTo(128, 220);
    c.moveTo(40, 128);
    c.lineTo(216, 128);
    c.stroke();
    // Curtain.
    c.fillStyle = '#d96a8a';
    c.beginPath();
    c.moveTo(40, 36);
    c.quadraticCurveTo(70, 130, 44, 218);
    c.lineTo(40, 218);
    c.fill();
    // A sun.
    ell(c, 186, 70, 22, 22, '#ffb03a');
  }) as Draw,
});
