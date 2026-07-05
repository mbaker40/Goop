/**
 * index.ts — GoopRenderer: owns the 60fps render loop and reads a RenderSource each frame
 * (never mutates it — PLAN §10). The sim ticks at 10 Hz; the tower springs between those states so
 * motion stays smooth. `store.game` is re-read every frame (it's swapped on startRun).
 */

import * as THREE from 'three';
import { balance } from '../config/balance';
import { paletteFor } from './palette';
import { createScene, type SceneBundle } from './scene';
import { TowerCamera } from './camera';
import { GoopTower } from './tower';
import { Environment } from './zone1';
import type { RenderSource } from './source';

export interface GoopDebug {
  renderedHeight: number;
  towerTopY: number;
  zone: number;
  frames: number;
}

declare global {
  interface Window {
    __goopDebug?: GoopDebug;
  }
}

export class GoopRenderer {
  private bundle: SceneBundle;
  private cam: TowerCamera;
  private tower: GoopTower;
  private env: Environment;
  private raf = 0;
  private last = 0;
  private frames = 0;
  private w = 0;
  private h = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private source: RenderSource,
  ) {
    this.bundle = createScene(canvas);
    this.cam = new TowerCamera(1);
    this.tower = new GoopTower();
    this.env = new Environment();
    this.bundle.scene.add(this.env.group);
    this.bundle.scene.add(this.tower.object);
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private syncSize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.bundle.resize(w, h);
    this.cam.setAspect(w / Math.max(1, h));
  }

  private frame(dt: number): void {
    this.syncSize();

    const game = this.source.game; // re-read every frame (swapped on startRun)
    const zone = game.currentZone();
    const palette = paletteFor(zone.index);
    this.env.apply(this.bundle.scene, zone.index, palette);

    const buffer = game.bufferSeconds();
    const meltHot = Number.isFinite(buffer) && buffer <= balance.melt.warnRedSec;
    const status = game.run.status;

    const topY = this.tower.update(game.heightRaw(), palette, status, meltHot, dt);
    this.cam.update(topY, this.source.screen !== 'run', dt);

    // Tint the key light slightly toward the sky for cohesion.
    this.bundle.keyLight.color.setHex(0xffffff).lerp(new THREE.Color(palette.skyTop), 0.2);

    this.bundle.renderer.render(this.bundle.scene, this.cam.camera);

    this.frames++;
    window.__goopDebug = { renderedHeight: this.tower.debugHeight, towerTopY: topY, zone: zone.index, frames: this.frames };
  }
}
