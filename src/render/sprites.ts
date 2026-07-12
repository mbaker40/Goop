/**
 * sprites.ts — 2D "cardboard cutout" background assets (Little Big Planet style, per design
 * direction). Each asset is drawn once with canvas 2D, run through a sticker pipeline (thick pale
 * outline + soft drop shadow), and mounted on a THREE.Sprite so it always faces the camera like a
 * paper cutout on a stick. No image files; everything is drawn in code.
 */

import * as THREE from 'three';

type Draw = (c: CanvasRenderingContext2D, s: number) => void;

/** Render `draw` onto a canvas, then add the sticker outline + shadow. */
function cutoutTexture(draw: Draw, size = 256): THREE.CanvasTexture {
  // 1. Draw the art on its own layer.
  const art = document.createElement('canvas');
  art.width = art.height = size;
  const a = art.getContext('2d')!;
  a.save();
  draw(a, size);
  a.restore();

  // 2. Build the expanded silhouette (the cardboard edge) by stamping the art at ring offsets.
  const edge = document.createElement('canvas');
  edge.width = edge.height = size;
  const e = edge.getContext('2d')!;
  const R = Math.max(3, size * 0.018);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    e.drawImage(art, Math.cos(ang) * R, Math.sin(ang) * R);
  }
  e.globalCompositeOperation = 'source-in';
  e.fillStyle = '#f4efe2'; // warm paper edge
  e.fillRect(0, 0, size, size);

  // 3. Compose: shadow, edge, art.
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const o = out.getContext('2d')!;
  o.save();
  o.globalAlpha = 0.3;
  o.filter = 'blur(3px)';
  o.drawImage(edge, size * 0.02, size * 0.035);
  o.restore();
  o.drawImage(edge, 0, 0);
  o.drawImage(art, 0, 0);

  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

/** A camera-facing cutout sprite, `w`×`h` in world units. */
export function cutout(draw: Draw, w: number, h: number, size = 256): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: cutoutTexture(draw, size), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(w, h, 1);
  return s;
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
