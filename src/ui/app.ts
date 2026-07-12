/**
 * ui/app.ts — the DOM overlay (PLAN §9 UI layer).
 * Reads sim state through the Store and dispatches actions via event delegation on #app.
 *
 * The run screen ticks at ~10 Hz. Rebuilding its innerHTML every tick destroys/recreates every
 * button — that flickers and makes the shop reflow out from under the cursor. So the run screen is
 * built ONCE (a stable skeleton) and only its values/attributes are patched in place each tick.
 * The static screens (menu/win/puddle) only render on explicit actions, so they stay string-based.
 *
 * Mobile feel: taps report their screen position (splats land under the finger), buzz the haptics,
 * float a "+N" gain, and squelch (audio/). Purchases flash their row. Zone changes toast + sting.
 */

import type { Store, Screen } from '../store';
import { balance } from '../config/balance';
import { PRODUCERS } from '../config/producers';
import { META_UPGRADES } from '../config/upgrades';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../config/achievements';
import { ZONES, displayMeters } from '../config/zones';
import { metaUpgradeCost, canBuyMeta } from '../sim/prestige';
import { format, formatInt, formatHeight, formatTime } from '../sim/numbers';
import type { Decimal } from '../sim/numbers';
import * as audio from '../audio';

type BuyAmount = 1 | 10 | 'max';

export class GoopUI {
  private root: HTMLElement;
  private lastScreen: Screen | null = null;
  /** Producers revealed so far this run (latch — once shown, never hidden, to avoid reflow). */
  private revealed = new Set<string>();
  /** Signature of the currently-rendered tier/run upgrade lists; rebuilt only when it changes. */
  private shopSig = '';
  /** Shop panel open state (landscape: expanded/collapsed body; portrait: sheet up/down). */
  private shopOpen = true;
  /** Producer purchase quantity (×1 / ×10 / MAX). */
  private buyAmt: BuyAmount = 1;
  /** Zone index last shown, to fire the zone-transition toast exactly on changes. */
  private lastZoneIdx = 0;
  /** Run status last seen (fires collapse audio once). */
  private lastStatus = '';
  private floaters = 0;
  /** Achievement-toast queue (unlocks are detected by diffing meta.achievements growth). */
  private lastAchCount = 0;
  private achQueue: string[] = [];
  private achShowing = false;

  constructor(private store: Store, mount: HTMLElement) {
    this.root = mount;
    this.root.addEventListener('pointerdown', (e) => this.onPointer(e as PointerEvent));
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('keydown', (e) => this.onKey(e as KeyboardEvent));
    // Re-assert the drawer transform when the device rotates (the portrait/landscape shop styles
    // differ; without this a drawer opened in one orientation strands mis-transformed in the other).
    window.matchMedia('(orientation: portrait)').addEventListener('change', () => this.applyShopState());
    audio.setMuted(this.store.settings.muted);
    this.lastAchCount = this.store.meta.achievements.length;
    this.store.subscribe(() => this.render());
    this.render();
  }

  // ---- Achievement toasts (queued; the toast node lives on <body> so screen rebuilds never
  // wipe it — unlocks can land on any screen, e.g. puddle-count achievements at run end) ----

  private pumpAchievements(): void {
    const achs = this.store.meta.achievements;
    if (achs.length > this.lastAchCount) {
      for (let i = this.lastAchCount; i < achs.length; i++) this.achQueue.push(achs[i]!);
      this.lastAchCount = achs.length;
      this.showNextAchievement();
    }
  }

  private showNextAchievement(): void {
    if (this.achShowing) return;
    const id = this.achQueue.shift();
    if (!id) return;
    const a = ACHIEVEMENT_BY_ID[id];
    if (!a) return this.showNextAchievement();
    this.achShowing = true;
    audio.purchaseBlip();
    this.buzz(20);
    const el = document.createElement('div');
    el.id = 'ach-toast';
    el.innerHTML = `<span class="i">${a.icon}</span><span class="t"><b>Achievement!</b> ${a.name}<i>+0.5% goop/sec</i></span>`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => {
      el.remove();
      this.achShowing = false;
      this.showNextAchievement();
    });
  }

  private fmt(v: Decimal | number): string {
    return format(v, { silly: this.store.settings.sillyNames });
  }

  /** Haptic tap (no-op where unsupported, e.g. iOS Safari; feature-gated by settings). */
  private buzz(ms: number): void {
    if (!this.store.settings.haptics) return;
    (navigator as Navigator & { vibrate?: (ms: number) => boolean }).vibrate?.(ms);
  }

  // ---- Input (event delegation on the stable #app root) ----

  private onPointer(e: PointerEvent): void {
    const el = (e.target as HTMLElement).closest('[data-action="click-tower"]');
    if (el) {
      e.preventDefault();
      const gainText = '+' + this.fmt(this.store.game.clickGain());
      this.store.click(e.clientX, e.clientY);
      this.buzz(8);
      const heat = (this.store.game.run.combo - 1) / Math.max(1, balance.click.comboMaxMult - 1);
      audio.squelch(heat);
      this.spawnFloater(e.clientX, e.clientY, gainText);
    }
  }

  /** Keyboard path for the tower (Space/Enter on the focused #stage). */
  private onKey(e: KeyboardEvent): void {
    if ((e.key !== ' ' && e.key !== 'Enter') || (e.target as HTMLElement).id !== 'stage') return;
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const gainText = '+' + this.fmt(this.store.game.clickGain());
    this.store.click(rect.left + rect.width / 2, rect.top + rect.height / 2);
    audio.squelch((this.store.game.run.combo - 1) / Math.max(1, balance.click.comboMaxMult - 1));
    this.spawnFloater(rect.left + rect.width / 2, rect.top + rect.height * 0.4, gainText);
  }

  private onClick(e: Event): void {
    const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.id ?? '';
    switch (action) {
      case 'start-run': this.store.startRun(); break;
      case 'to-menu': this.store.toMenu(); break;
      case 'pause': this.store.pause(); break;
      case 'resume': this.store.resume(); break;
      case 'bank-win': this.store.bankWin(); break;
      case 'buy-producer': {
        const n = this.buyAmt === 'max' ? Math.max(1, this.store.game.maxAffordableProducer(id)) : this.buyAmt;
        if (this.store.buyProducer(id, n)) this.purchased('prow-' + id);
        break;
      }
      case 'buy-tier': if (this.store.buyTierUpgrade(id)) this.purchased('titem-' + id); break;
      case 'buy-run': if (this.store.buyRunUpgrade(id)) this.purchased('ritem-' + id); break;
      case 'buy-meta': if (this.store.buyMeta(id)) this.purchased(''); break;
      case 'buy-amt': {
        this.buyAmt = id === 'max' ? 'max' : id === '10' ? 10 : 1;
        this.updateBuyAmtButtons();
        break;
      }
      case 'toggle-silly': this.store.toggleSilly(); break;
      case 'ach-info': {
        const a = ACHIEVEMENT_BY_ID[id];
        const detail = this.el('ach-detail');
        if (a && detail) {
          const on = this.store.meta.achievements.includes(a.id);
          detail.textContent = `${a.icon} ${a.name} — ${on ? a.flavor : '🔒 locked'}`;
        }
        break;
      }
      case 'toggle-sound':
        this.store.toggleMuted();
        audio.setMuted(this.store.settings.muted);
        if (!this.store.settings.muted) audio.purchaseBlip(); // audible confirmation
        this.syncSoundButtons();
        break;
      case 'toggle-haptics': this.store.toggleHaptics(); break;
      case 'toggle-shop': this.toggleShop(); break;
    }
  }

  /** Shared purchase feedback: flash the row, buzz, blip. */
  private purchased(rowId: string): void {
    this.buzz(15);
    audio.purchaseBlip();
    if (!rowId) return;
    const row = this.el(rowId);
    if (row) {
      row.classList.remove('bought');
      // Force a reflow so re-adding the class restarts the animation on rapid buys.
      void (row as HTMLElement).offsetWidth;
      row.classList.add('bought');
    }
  }

  /** Floating "+N" gain readout at the tap point. */
  private spawnFloater(x: number, y: number, text: string): void {
    if (this.floaters >= 8) return; // cap concurrent DOM nodes under spam
    this.floaters++;
    const f = document.createElement('div');
    f.className = 'floater';
    f.textContent = text;
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    document.body.appendChild(f);
    f.addEventListener('animationend', () => {
      f.remove();
      this.floaters--;
    });
  }

  private toggleShop(): void {
    this.shopOpen = !this.shopOpen;
    this.applyShopState();
  }

  private applyShopState(): void {
    const el = this.el('hud-shop');
    if (el) {
      el.classList.toggle('collapsed', !this.shopOpen);
      // Portrait: slide the side-drawer via an inline transform (authoritative over CSS).
      // Landscape: no transform (the drawer is docked; `collapsed` just hides its body).
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      el.style.transform = portrait ? (this.shopOpen ? 'translateX(0)' : 'translateX(101%)') : '';
    }
    const t = this.el('shop-toggle');
    if (t) t.textContent = this.shopOpen ? 'Shop ▾' : 'Close ✕';
    // The floating open-button shows only when the drawer is closed (portrait; CSS hides it in landscape).
    const fab = this.el('shop-fab');
    if (fab) fab.style.display = this.shopOpen ? 'none' : '';
  }

  // ---- Render dispatch ----

  private render(): void {
    this.pumpAchievements();
    const screen = this.store.screen;
    // Drives the iOS GPU-layer promotion (see styles.ts): #app itself is composited ONLY on
    // normal-flow screens (menu/win/puddle). On run/paused it must NOT carry a transform, or it
    // becomes the containing block for the fixed HUD children and collapses their layout.
    this.root.setAttribute('data-screen', screen);
    // Gate the WebGL canvas by screen (styles.ts): it's shown ONLY on run/paused. On iOS a WebGL
    // canvas composites above the DOM and no fixed/scrolling overlay reliably beats it, so on the
    // normal-flow screens (menu/win/puddle) we hide the canvas entirely and render plain scrolling
    // DOM — bulletproof, no compositing fight. (The menu tower was only decorative.)
    document.body.setAttribute('data-screen', screen);
    if (screen === 'run' || screen === 'paused') {
      // Paused keeps the run DOM intact (so Resume is instant); just show the overlay.
      if (this.lastScreen !== 'run' && this.lastScreen !== 'paused') this.buildRunSkeleton();
      this.updateRun();
      const ov = this.el('pause-overlay');
      if (ov) ov.style.display = screen === 'paused' ? 'flex' : 'none';
    } else {
      // Canvas is hidden on these screens (see above), so plain normal-flow DOM renders reliably and
      // the page scrolls natively — no WebGL compositing to fight.
      this.root.innerHTML =
        screen === 'menu' ? this.renderMenu() : screen === 'win' ? this.renderWin() : this.renderPuddle();
    }
    this.lastScreen = screen;
  }

  // ---- DOM helpers ----

  private el(id: string): HTMLElement | null {
    return this.root.querySelector('#' + id);
  }
  private setText(id: string, text: string): void {
    const e = this.el(id);
    if (e && e.textContent !== text) e.textContent = text;
  }
  private setDisabled(id: string, disabled: boolean): void {
    const e = this.el(id) as HTMLButtonElement | null;
    if (e && e.disabled !== disabled) e.disabled = disabled;
  }

  // ---- Run screen: build once ----

  private buildRunSkeleton(): void {
    this.revealed.clear();
    this.shopSig = '';
    this.lastZoneIdx = this.store.game.currentZone().index;
    this.lastStatus = this.store.game.run.status;
    const producerRows = PRODUCERS.map(
      (p) => `
      <div class="shopitem" id="prow-${p.id}" style="display:none">
        <div class="info"><div class="name"><span class="icon">${p.icon}</span>${p.name} <span class="tag" id="pcount-${p.id}">×0</span></div>
        <div class="flavor">${p.flavor}</div>
        <div class="tag" id="prate-${p.id}"></div></div>
        <button data-action="buy-producer" data-id="${p.id}" id="pbtn-${p.id}" disabled>
          <span class="amt" id="pamt-${p.id}"></span><span class="cost" id="pcost-${p.id}">—</span></button>
      </div>`,
    ).join('');

    // Default the shop open in landscape, closed (drawer/sheet away) in portrait.
    this.shopOpen = !window.matchMedia('(orientation: portrait)').matches;

    // Flattened HUD (direct children of #app) — nested position:fixed + backdrop-filter cards
    // render blank on iOS Safari, which stranded the whole overlay. Solid cards, no nesting.
    this.root.innerHTML = `
    <div id="stage" data-action="click-tower" role="button" tabindex="0" aria-label="Slap the goop tower"></div>
    <div id="meltvig"></div>
    <div id="zone-toast" aria-live="polite"></div>

    <div id="hud-stats" class="hud-card">
      <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:nowrap">
        <span class="title">🟢 GOOP TOWER</span>
        <span class="row" style="gap:6px;flex-wrap:nowrap">
          <button data-action="toggle-sound" class="mini" id="sound-btn-run" aria-label="Toggle sound">${this.store.settings.muted ? '🔇' : '🔊'}</button>
          <button data-action="pause" class="mini" aria-label="Pause">❚❚</button>
        </span>
      </div>
      <div class="stat"><span>🟢 Goop</span><b id="sr-goop">0</b></div>
      <div class="stat"><span>⏱ Goop/sec</span><b id="sr-gps">0</b></div>
      <div class="stat"><span>🛡️ Melt shield</span><b id="sr-buffer">∞</b></div>
    </div>

    <div class="banner grace" id="sr-banner" aria-live="polite">…</div>

    <div id="hud-readout">
      <div class="h" id="sr-height">0 m</div>
      <div class="z" id="sr-zone">Zone 1</div>
      <div id="sr-combo-label">Slap Combo ×1.00</div>
      <div class="combo" id="sr-combo-track"><i id="sr-combo-fill" style="width:0%"></i></div>
      <div class="hint" id="sr-hint">SLAP THE GOOP</div>
    </div>

    <button id="shop-fab" data-action="toggle-shop">🛒 Shop</button>
    <div id="hud-shop" class="hud-card ${this.shopOpen ? '' : 'collapsed'}">
      <button id="shop-toggle" data-action="toggle-shop">${this.shopOpen ? 'Shop ▾' : 'Close ✕'}</button>
      <div id="shop-body">
        <div class="panel"><h2>Goop Makers</h2>
          <div class="tag subtitle">They make goop every second — even while your hand rests.</div>
          <div class="buyamt row" id="buyamt-row">
            <span class="tag">Buy</span>
            <button data-action="buy-amt" data-id="1" id="amt-1" class="mini on">×1</button>
            <button data-action="buy-amt" data-id="10" id="amt-10" class="mini">×10</button>
            <button data-action="buy-amt" data-id="max" id="amt-max" class="mini">MAX</button>
          </div>
          <div id="sr-producer-hint" class="tag">Slap the goop to afford your first Dripper.</div>
          ${producerRows}
        </div>
        <div class="panel" style="display:none" id="tier-panel"><h2>×2 Boosts</h2>
          <div class="tag subtitle">Double what a maker produces. Forever (this run).</div>
          <div id="tier-list"></div></div>
        <div class="panel" style="display:none" id="run-panel"><h2>Upgrades</h2>
          <div class="tag subtitle">One-time powers for this run.</div>
          <div id="run-list"></div></div>
      </div>
    </div>

    <div id="pause-overlay" style="display:none">
      <div class="pause-card hud-card">
        <h1 style="margin-top:0">⏸ Paused</h1>
        <button data-action="resume" class="primary" style="width:100%">Resume ▶</button>
        <div class="row" style="margin-top:10px;justify-content:center">
          <button data-action="toggle-sound">Sound: ${this.store.settings.muted ? 'off 🔇' : 'ON 🔊'}</button>
          <button data-action="toggle-haptics">Haptics: ${this.store.settings.haptics ? 'ON' : 'off'}</button>
        </div>
        <button data-action="to-menu" style="width:100%;margin-top:10px">Quit to Menu</button>
        <div class="tag" style="margin-top:10px">Quitting abandons this run (no Essence banked).</div>
      </div>
    </div>`;

    this.applyShopState();
  }

  private updateBuyAmtButtons(): void {
    for (const a of ['1', '10', 'max']) {
      const b = this.el('amt-' + a);
      if (b) b.classList.toggle('on', String(this.buyAmt) === a);
    }
  }

  private syncSoundButtons(): void {
    const muted = this.store.settings.muted;
    const runBtn = this.el('sound-btn-run');
    if (runBtn) runBtn.textContent = muted ? '🔇' : '🔊';
    // Pause overlay + menu buttons re-render via innerHTML; patch if present.
    this.root.querySelectorAll('[data-action="toggle-sound"]').forEach((b) => {
      if (b.id !== 'sound-btn-run') b.textContent = `Sound: ${muted ? 'off 🔇' : 'ON 🔊'}`;
    });
  }

  // ---- Run screen: patch values in place ----

  private updateRun(): void {
    const g = this.store.game;
    const r = g.run;
    const zone = g.currentZone();
    const buffer = g.bufferSeconds();

    // Zone transition toast + sting (the run's biggest beat — PLAN §3).
    if (zone.index !== this.lastZoneIdx) {
      if (zone.index > this.lastZoneIdx) {
        const toast = this.el('zone-toast');
        if (toast) {
          toast.innerHTML = `<b>ZONE ${zone.index}</b><span>${zone.name}</span>`;
          toast.classList.remove('show');
          void toast.offsetWidth; // restart animation
          toast.classList.add('show');
        }
        audio.zoneSting();
        this.buzz(30);
      }
      this.lastZoneIdx = zone.index;
    }

    // Collapse groan, once, on the transition into 'collapsing'.
    if (r.status !== this.lastStatus) {
      if (r.status === 'collapsing') {
        audio.collapseGroan();
        this.buzz(60);
      }
      this.lastStatus = r.status;
    }

    // Tower + stats.
    this.setText('sr-height', formatHeight(displayMeters(g.heightRaw())));
    this.setText('sr-zone', `Zone ${zone.index}: ${zone.name}`);
    this.setText('sr-hint', `SLAP THE GOOP — +${this.fmt(g.clickGain())} goop per slap · ${formatTime(r.runTime)}`);
    this.setText('sr-goop', this.fmt(r.goop));
    this.setText('sr-gps', this.fmt(g.gps()));
    // Melt shield: seconds until collapse if income stalls — the ONE number melt survival hangs
    // on, so show it plainly instead of the raw structural-goop figure.
    this.setText('sr-buffer', buffer === Infinity ? '∞ (warming up)' : `${Math.floor(buffer)}s`);

    // Combo bar (glows at max).
    const comboPct = Math.max(0, ((r.combo - 1) / (balance.click.comboMaxMult - 1)) * 100);
    this.setText('sr-combo-label', `Slap Combo ×${r.combo.toFixed(2)}`);
    const fill = this.el('sr-combo-fill');
    if (fill) fill.style.width = `${comboPct}%`;
    const track = this.el('sr-combo-track');
    if (track) track.classList.toggle('maxed', r.combo >= balance.click.comboMaxMult - 0.01);

    // Melt banner.
    const banner = this.el('sr-banner');
    if (banner) {
      const b = this.meltBanner(r.status, buffer);
      if (banner.className !== `banner ${b.cls}`) banner.className = `banner ${b.cls}`;
      if (banner.textContent !== b.text) banner.textContent = b.text;
    }

    // Melt-warning screen vignette: fades in as the buffer runs low; pulses red on collapse.
    const vig = this.el('meltvig');
    if (vig) {
      const collapse = r.status === 'collapsing' || r.status === 'dead';
      let level = 0;
      let red = false;
      if (collapse) {
        level = 1;
        red = true;
      } else if (Number.isFinite(buffer) && r.status !== 'grace') {
        if (buffer <= balance.melt.warnRedSec) {
          level = 1;
          red = true;
        } else if (buffer <= balance.melt.warnOrangeSec) {
          const t = (balance.melt.warnOrangeSec - buffer) / (balance.melt.warnOrangeSec - balance.melt.warnRedSec);
          level = 0.25 + t * 0.5;
        }
      }
      vig.style.opacity = level.toFixed(2);
      if (vig.classList.contains('red') !== red) vig.classList.toggle('red', red);
      if (vig.classList.contains('collapse') !== collapse) vig.classList.toggle('collapse', collapse);
    }

    this.updateProducers();
    this.updateUpgradePanels();
  }

  private meltBanner(status: string, buffer: number): { cls: string; text: string } {
    if (status === 'grace') return { cls: 'grace', text: '🫧 Grace period — your goop is still warming up…' };
    if (status === 'collapsing') return { cls: 'red', text: '💥 STRUCTURAL FAILURE — the tower is coming down…' };
    if (buffer <= balance.melt.warnRedSec) return { cls: 'red', text: `🔥 MELTING! ${Math.floor(buffer)}s of buffer left — GOOP FASTER` };
    if (buffer <= balance.melt.warnOrangeSec) return { cls: 'orange', text: `🌡️ Getting warm — ${Math.floor(buffer)}s of buffer` };
    return { cls: 'safe', text: `✅ Tower stable — ${buffer === Infinity ? 'no melt' : Math.floor(buffer) + 's buffer'}` };
  }

  private updateProducers(): void {
    const g = this.store.game;
    let anyShown = false;
    let anyAffordable = false;
    for (const p of PRODUCERS) {
      const owned = g.run.producersOwned[p.id] ?? 0;
      // Progressive reveal: show once owned or roughly within reach, then keep it shown (latch).
      if (!this.revealed.has(p.id) && (owned > 0 || g.run.goop.mul(1000).add(1000).gte(g.producerCost(p.id, 1)))) {
        this.revealed.add(p.id);
        const row = this.el('prow-' + p.id);
        if (row) row.style.display = '';
      }
      if (this.revealed.has(p.id)) {
        anyShown = true;
        // Price the selected quantity (×1 / ×10 / MAX-affordable, min 1 so the price never blanks).
        const n = this.buyAmt === 'max' ? Math.max(1, g.maxAffordableProducer(p.id)) : this.buyAmt;
        const cost = g.producerCost(p.id, n);
        const afford = g.canAfford(cost);
        if (afford) anyAffordable = true;
        this.setText('pcount-' + p.id, `×${owned}`);
        this.setText('pamt-' + p.id, n > 1 ? `×${n} ` : '');
        this.setText('pcost-' + p.id, this.fmt(cost));
        this.setText('prate-' + p.id, `each makes ${this.fmt(p.baseGps)} goop/sec`);
        this.setDisabled('pbtn-' + p.id, !afford);
      }
    }
    const hint = this.el('sr-producer-hint');
    if (hint) hint.style.display = anyShown ? 'none' : '';
    // Nudge the closed portrait drawer when something in the shop is buyable.
    const fab = this.el('shop-fab');
    if (fab) fab.classList.toggle('attn', !this.shopOpen && anyAffordable);
  }

  private updateUpgradePanels(): void {
    const g = this.store.game;
    const tiers = g.availableTierUpgrades().slice(0, 4);
    const runs = g.availableRunUpgrades().filter((u) => g.run.goop.gte(u.costGoop / 20));

    // Only rebuild the lists when their membership changes (rare); patch disabled states every tick.
    const sig = tiers.map((t) => t.id).join(',') + '|' + runs.map((u) => u.id).join(',');
    if (sig !== this.shopSig) {
      this.shopSig = sig;
      const tierList = this.el('tier-list');
      const runList = this.el('run-list');
      if (tierList) {
        tierList.innerHTML = tiers
          .map((u) => {
            const p = PRODUCERS.find((x) => x.id === u.producerId);
            return `<div class="shopitem" id="titem-${u.id}">
              <div class="info"><div class="name"><span class="icon">${p?.icon ?? '📈'}</span>${u.name}</div><div class="flavor">${u.flavor}</div></div>
              <button data-action="buy-tier" data-id="${u.id}" id="tbtn-${u.id}"><span class="cost">${this.fmt(u.costGoop)}</span></button>
            </div>`;
          })
          .join('');
      }
      if (runList) {
        runList.innerHTML = runs
          .map(
            (u) => `<div class="shopitem" id="ritem-${u.id}">
              <div class="info"><div class="name"><span class="icon">${u.icon}</span>${u.name}</div><div class="flavor">${u.flavor}</div></div>
              <button data-action="buy-run" data-id="${u.id}" id="rbtn-${u.id}"><span class="cost">${this.fmt(u.costGoop)}</span></button>
            </div>`,
          )
          .join('');
      }
      const tierPanel = this.el('tier-panel');
      if (tierPanel) tierPanel.style.display = tiers.length ? '' : 'none';
      const runPanel = this.el('run-panel');
      if (runPanel) runPanel.style.display = runs.length ? '' : 'none';
    }

    for (const u of tiers) this.setDisabled('tbtn-' + u.id, !g.run.goop.gte(u.costGoop));
    for (const u of runs) this.setDisabled('rbtn-' + u.id, !g.run.goop.gte(u.costGoop));
  }

  // ---- Static screens (rendered only on actions) ----

  private renderMenu(): string {
    const m = this.store.meta;
    const meta = META_UPGRADES.map((u) => {
      const lvl = m.metaLevels[u.id] ?? 0;
      const maxed = lvl >= u.maxLevel;
      const cost = metaUpgradeCost(u, lvl);
      const can = canBuyMeta(m, u.id);
      return `<div class="shopitem">
        <div class="info"><div class="name"><span class="icon">${u.icon}</span>${u.name} <span class="tag">Lv ${lvl}/${u.maxLevel}</span></div>
        <div class="flavor">${u.flavor}</div></div>
        <button data-action="buy-meta" data-id="${u.id}" ${!can || maxed ? 'disabled' : ''}>
          ${maxed ? 'MAX' : `${cost} GE`}</button>
      </div>`;
    }).join('');

    const unlockedSet = new Set(m.achievements);
    const achTiles = ACHIEVEMENTS.map((a) => {
      const on = unlockedSet.has(a.id);
      return `<span class="ach ${on ? 'on' : ''}" data-action="ach-info" data-id="${a.id}" title="${a.name}">${a.icon}</span>`;
    }).join('');

    return `
    <h1>🟢 GOOP TOWER</h1>
    <div class="tag">Slap goop, climb 7 zones, don't melt. Every puddle makes you stronger.</div>
    <div class="grid">
      <div>
        <div class="panel">
          <h2>Permanent Upgrades</h2>
          <div class="tag subtitle">Bought with Goop Essence (GE) — the stuff every ended run pays out. These survive melting.</div>
          ${meta}
        </div>
        <div class="panel" style="margin-top:12px">
          <h2>Achievements <span class="tag">${m.achievements.length}/${ACHIEVEMENTS.length}</span></h2>
          <div class="tag subtitle">Each unlock permanently adds +0.5% goop/sec. Tap a tile to inspect.</div>
          <div class="ach-grid">${achTiles}</div>
          <div class="tag" id="ach-detail" style="margin-top:8px">Tap any tile…</div>
        </div>
      </div>
      <div>
        <div class="panel">
          <h2>Show-off Room</h2>
          <div class="stat"><span>Goop Essence</span><b>${m.ge} GE</b></div>
          <div class="stat"><span>Wins</span><b>${m.wins}</b></div>
          <div class="stat"><span>Puddles</span><b>${m.puddles}</b></div>
          <div class="stat"><span>Lifetime slaps</span><b>${formatInt(m.totalClicks)}</b></div>
          <div class="stat"><span>Best height</span><b>${formatHeight(displayMeters(m.bestHeightRaw))}</b></div>
          <div class="stat"><span>Achievements</span><b>${m.achievements.length}/${ACHIEVEMENTS.length}</b></div>
        </div>
        <div class="panel center" style="margin-top:12px">
          <button data-action="start-run" class="primary" style="width:100%;font-size:18px;padding:14px">START RUN ▶</button>
          <div class="row" style="margin-top:10px;justify-content:center">
            <button data-action="toggle-sound">Sound: ${this.store.settings.muted ? 'off 🔇' : 'ON 🔊'}</button>
            <button data-action="toggle-haptics">Haptics: ${this.store.settings.haptics ? 'ON' : 'off'}</button>
            <button data-action="toggle-silly">Silly names: ${this.store.settings.sillyNames ? 'ON' : 'off'}</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  private renderWin(): string {
    const g = this.store.game;
    return `
    <div class="panel center">
      <h1>🏆 PAST GOD</h1>
      <div class="big">YOU WON</div>
      <p>The tower pierced the skybox. A giant marble hand gives you a slow thumbs-up.</p>
      <p>Peak height: <b>${formatHeight(displayMeters(g.run.peakHeightRaw))}</b> · Time: <b>${formatTime(g.run.runTime)}</b></p>
      <p>Bank this run for <b>${this.store.lastGe} GE</b> (×${balance.prestige.winMultiplier} win bonus).</p>
      <div class="row" style="justify-content:center">
        <button data-action="bank-win" class="primary" style="font-size:18px;padding:12px">Bank it (×3 GE) ▶</button>
        <button disabled title="Milestone 4">Enter Endless (coming soon)</button>
      </div>
    </div>`;
  }

  private renderPuddle(): string {
    const g = this.store.game;
    const zone = ZONES.find((z) => z.index === g.currentZone().index) ?? ZONES[0]!;
    return `
    <div class="panel center">
      <h1>🫠 PUDDLE</h1>
      <p>Your tower melted in <b>${zone.name}</b>. It happens. It happens a lot.</p>
      <p>Peak height: <b>${formatHeight(displayMeters(g.run.peakHeightRaw))}</b> · Time: <b>${formatTime(g.run.runTime)}</b></p>
      <div class="big">+${this.store.lastGe} GE</div>
      <p class="tag">Every puddle makes you stronger. Spend it in the meta shop.</p>
      <button data-action="to-menu" class="primary" style="font-size:18px;padding:12px">Continue ▶</button>
    </div>`;
  }
}
