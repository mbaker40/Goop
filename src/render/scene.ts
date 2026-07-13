/**
 * scene.ts - WebGL renderer, scene, and lights (PLAN §9.1). No post-fx (that's M5).
 */

import * as THREE from 'three';

export interface SceneBundle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  keyLight: THREE.DirectionalLight;
  resize(width: number, height: number): void;
}

export function createScene(canvas: HTMLCanvasElement, maxDpr = 2): SceneBundle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

  // Mobile browsers drop the WebGL context on backgrounding/memory pressure. preventDefault on
  // `lost` opts into the restore path; three re-uploads GPU resources on `restored` and the render
  // loop (which never stopped) picks back up - instead of a permanent silent black screen.
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);

  const scene = new THREE.Scene();
  // Ranges account for the ORTHO stage camera sitting at z=60: the goop plane is ~60 away,
  // cutout layers 65-80, backdrop shells ~100-120 (they get the deepest haze).
  scene.fog = new THREE.Fog(0x14121a, 66, 130);

  // Soft fill from sky/ground + a key light for goop gloss + a warm rim.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x404050, 0.9);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(6, 12, 8);
  scene.add(keyLight);

  const rim = new THREE.DirectionalLight(0xa0d8ff, 0.5);
  rim.position.set(-8, 4, -6);
  scene.add(rim);

  function resize(width: number, height: number): void {
    renderer.setSize(width, height, false);
  }

  return { renderer, scene, keyLight, resize };
}
