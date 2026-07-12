/**
 * index.ts — GoopRenderer: owns the 60fps render loop and reads a RenderSource each frame
 * (never mutates it — PLAN §10; drainClickPoints is the one sanctioned, presentation-only
 * exception in the contract). The sim ticks at 10 Hz; the tower springs between those states so
 * motion stays smooth. `store.game` is re-read every frame (it's swapped on startRun).
 */

import * as THREE from 'three';
import { balance } from '../config/balance';
import { paletteFor } from './palette';
import { createScene, type SceneBundle } from './scene';
import { TowerCamera } from './camera';
import { GoopTower } from './tower';
import { SplatSystem } from './splats';
import { ProducerFx } from './producerFx';
import { Environment } from './zone1';
import { detectQuality } from './quality';
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
  private producerFx = new ProducerFx();
  private env: Environment;
  private raf = 0;
  private last = 0;
  private frames = 0;
  private t = 0;
  private w = 0;
  private h = 0;
  private lastClicks = 0;
  private splatOrigin = new THREE.Vector3();
  private collapseDrip = 0;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private axisA = new THREE.Vector3();
  private axisB = new THREE.Vector3();
  private lightTint = new THREE.Color();
  private lastTopY = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private source: RenderSource,
    /** Optional: the DOM "stage" rect to frame the tower into; null centres the tower. */
    private getStage?: () => DOMRect | null,
  ) {
    const q = detectQuality();
    this.bundle = createScene(canvas, q.maxDpr);
    this.cam = new TowerCamera(1);
    this.tower = new GoopTower(q.resolution, q.fieldHz);
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

  /** Splat origin for a tap: cast the tap ray and find its closest point on the tower's axis, so
   *  goop visibly lands where the finger touched — each tap feels locally causal. */
  private tapOrigin(x: number, y: number, topY: number, out: THREE.Vector3): void {
    this.ndc.set((x / Math.max(1, this.w)) * 2 - 1, -((y / Math.max(1, this.h)) * 2 - 1));
    this.raycaster.setFromCamera(this.ndc, this.cam.camera);
    this.axisA.set(0, 0.2, 0);
    this.axisB.set(0, Math.max(0.6, topY), 0);
    this.raycaster.ray.distanceSqToSegment(this.axisA, this.axisB, undefined, out);
  }

  private frame(dt: number): void {
    this.syncSize();
    this.t += dt;

    const game = this.source.game; // re-read every frame (swapped on startRun)
    const zone = game.currentZone();
    const palette = paletteFor(zone.index);
    // Crossfade env palettes; a zone CHANGE is the game's big dopamine beat — pull the camera back.
    if (this.env.apply(this.bundle.scene, zone.index, palette, dt)) {
      this.cam.pulse();
      this.tower.impact(undefined, undefined, 0.6); // celebratory jiggle
    }

    const buffer = game.bufferSeconds();
    const meltHot = Number.isFinite(buffer) && buffer <= balance.melt.warnRedSec;
    const status = game.run.status;
    const combo = game.run.combo;
    const comboHeat = (combo - 1) / Math.max(1, balance.click.comboMaxMult - 1); // 0..1

    // Slaps: fire wobble kicks + splat bursts for each new click (capped per frame). Taps with a
    // recorded screen position land exactly where the finger hit; the burst grows with combo and
    // its colour heats from zone-goop toward white as momentum maxes out.
    const clicks = game.run.clicks;
    const points = this.source.drainClickPoints();
    if (clicks > this.lastClicks) {
      const bursts = Math.min(3, clicks - this.lastClicks);
      const heatColor = new THREE.Color(palette.goop).lerp(new THREE.Color(0xffffff), comboHeat * 0.45).getHex();
      for (let i = 0; i < bursts; i++) {
        const p = points[points.length - 1 - i];
        if (p) {
          this.tapOrigin(p.x, p.y, this.lastTopY, this.splatOrigin);
          // Kick the tower away from the slap direction (the ray's horizontal heading).
          const dir = this.raycaster.ray.direction;
          this.tower.impact(dir.x, dir.z, 0.9 + comboHeat * 0.5);
        } else {
          this.tower.topWorld(this.splatOrigin);
          this.tower.impact(undefined, undefined, 0.9 + comboHeat * 0.5);
        }
        this.splats.burst(this.splatOrigin, heatColor, {
          count: 5 + Math.round(comboHeat * 5),
          size: 0.9 + comboHeat * 0.6,
          out: 3 + comboHeat * 2.5,
          up: 5 + comboHeat * 2,
        });
      }
      this.lastClicks = clicks;
    } else if (clicks < this.lastClicks) {
      this.lastClicks = clicks; // run restarted; resync
    }

    const topY = this.tower.update(game.heightRaw(), palette, status, meltHot, combo, game.run.collapseTimer, dt);
    this.lastTopY = topY;

    // Ambient producer signatures — each "tool" you buy is visible working on the tower.
    if (status === 'active' || status === 'grace') {
      this.producerFx.update(dt, game.run.producersOwned, topY, this.t, this.splats);
    }

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

    // Frame the tower into the DOM stage rect: centre horizontally, and pin the goop's BASE near
    // the BOTTOM of the stage so it sits on the ground and grows upward — instead of floating at
    // mid-screen with a band of empty ground under it (the old centre-anchor bug). Portrait's
    // stage ends above the readout, so the base can hug the stage bottom (97%); landscape's
    // readout OVERLAYS the stage bottom-centre, so keep the base above it (78%).
    let anchor = { x: 0, yBase: -0.45 };
    const rect = this.getStage?.();
    if (rect && rect.width > 0 && this.w > 0 && this.h > 0) {
      const portrait = this.h >= this.w;
      const baselineY = rect.top + rect.height * (portrait ? 0.97 : 0.78);
      anchor = {
        x: ((rect.left + rect.width / 2) / this.w) * 2 - 1,
        yBase: -((baselineY / this.h) * 2 - 1),
      };
    }
    const idle = this.source.screen !== 'run' && this.source.screen !== 'paused';
    this.cam.update(topY, idle, dt, anchor);

    // Tint the key light slightly toward the sky for cohesion.
    this.bundle.keyLight.color.setHex(0xffffff).lerp(this.lightTint.setHex(palette.skyTop), 0.2);

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
      anchorY: anchor.yBase,
      status,
    };
  }
}
