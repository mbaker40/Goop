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
import { SplatSystem } from './splats';
import { Environment } from './zone1';
import type { RenderSource } from './source';

export interface GoopDebug {
  renderedHeight: number;
  towerTopY: number;
  zone: number;
  frames: number;
  splats: number;
  clicks: number;
  anchorX: number;
  anchorY: number;
  status: string;
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
  private splats: SplatSystem;
  private env: Environment;
  private raf = 0;
  private last = 0;
  private frames = 0;
  private w = 0;
  private h = 0;
  private lastClicks = 0;
  private splatOrigin = new THREE.Vector3();
  private collapseDrip = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private source: RenderSource,
    /** Optional: the DOM "stage" rect to frame the tower into; null centres the tower. */
    private getStage?: () => DOMRect | null,
  ) {
    this.bundle = createScene(canvas);
    this.cam = new TowerCamera(1);
    this.tower = new GoopTower();
    this.splats = new SplatSystem();
    this.env = new Environment();
    this.bundle.scene.add(this.env.group);
    this.bundle.scene.add(this.tower.object);
    this.bundle.scene.add(this.splats.object);
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

    // Slaps: fire wobble kicks + splat bursts for each new click (capped per frame).
    const clicks = game.run.clicks;
    if (clicks > this.lastClicks) {
      const bursts = Math.min(3, clicks - this.lastClicks);
      for (let i = 0; i < bursts; i++) {
        this.tower.impact();
        this.tower.topWorld(this.splatOrigin);
        this.splats.burst(this.splatOrigin, palette.goop);
      }
      this.lastClicks = clicks;
    } else if (clicks < this.lastClicks) {
      this.lastClicks = clicks; // run restarted; resync
    }

    const topY = this.tower.update(game.heightRaw(), palette, status, meltHot, game.run.combo, game.run.collapseTimer, dt);

    // Collapse drip-storm: goop sheds off the melting tower.
    if (status === 'collapsing') {
      this.collapseDrip += dt;
      while (this.collapseDrip > 0.07) {
        this.collapseDrip -= 0.07;
        this.tower.topWorld(this.splatOrigin);
        this.splats.burst(this.splatOrigin, 0xff5d3a);
      }
    }
    this.splats.update(dt);

    // Frame the tower into the DOM stage rect (NDC anchor); centre if there's no stage.
    let anchor = { x: 0, y: 0 };
    const rect = this.getStage?.();
    if (rect && rect.width > 0 && this.w > 0 && this.h > 0) {
      anchor = {
        x: ((rect.left + rect.width / 2) / this.w) * 2 - 1,
        y: -(((rect.top + rect.height / 2) / this.h) * 2 - 1),
      };
    }
    const idle = this.source.screen !== 'run' && this.source.screen !== 'paused';
    this.cam.update(topY, idle, dt, anchor);

    // Tint the key light slightly toward the sky for cohesion.
    this.bundle.keyLight.color.setHex(0xffffff).lerp(new THREE.Color(palette.skyTop), 0.2);

    this.bundle.renderer.render(this.bundle.scene, this.cam.camera);

    this.frames++;
    window.__goopDebug = {
      renderedHeight: this.tower.debugHeight,
      towerTopY: topY,
      zone: zone.index,
      frames: this.frames,
      splats: this.splats.activeCount,
      clicks,
      anchorX: anchor.x,
      anchorY: anchor.y,
      status,
    };
  }
}
