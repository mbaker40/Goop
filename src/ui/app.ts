/**
 * ui/app.ts — the DOM overlay (PLAN §9 UI layer).
 * Reads sim state through the Store and dispatches actions via event delegation on #app.
 *
 * The run screen ticks at ~10 Hz. Rebuilding its innerHTML every tick destroys/recreates every
 * button — that flickers and makes the shop reflow out from under the cursor. So the run screen is
 * built ONCE (a stable skeleton) and only its values/attributes are patched in place each tick.
 * The static screens (menu/win/puddle) only render on explicit actions, so they stay string-based.
 */

import type { Store, Screen } from '../store';
import { balance } from '../config/balance';
import { PRODUCERS } from '../config/producers';
import { META_UPGRADES } from '../config/upgrades';
import { ZONES, displayMeters } from '../config/zones';
import { metaUpgradeCost, canBuyMeta } from '../sim/prestige';
import { format, formatInt, formatHeight, formatTime } from '../sim/numbers';
import type { Decimal } from '../sim/numbers';

export class GoopUI {
  private root: HTMLElement;
  private lastScreen: Screen | null = null;
  /** Producers revealed so far this run (latch — once shown, never hidden, to avoid reflow). */
  private revealed = new Set<string>();
  /** Signature of the currently-rendered tier/run upgrade lists; rebuilt only when it changes. */
  private shopSig = '';
  /** Shop panel open state (landscape: expanded/collapsed body; portrait: sheet up/down). */
  private shopOpen = true;

  constructor(private store: Store, mount: HTMLElement) {
    this.root = mount;
    this.root.addEventListener('pointerdown', (e) => this.onPointer(e));
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.store.subscribe(() => this.render());
    this.render();
  }

  private fmt(v: Decimal | number): string {
    return format(v, { silly: this.store.settings.sillyNames });
  }

  // ---- Input (event delegation on the stable #app root) ----

  private onPointer(e: Event): void {
    const el = (e.target as HTMLElement).closest('[data-action="click-tower"]');
    if (el) {
      e.preventDefault();
      this.store.click();
    }
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
      case 'buy-producer': this.store.buyProducer(id, 1); break;
      case 'buy-tier': this.store.buyTierUpgrade(id); break;
      case 'buy-run': this.store.buyRunUpgrade(id); break;
      case 'buy-meta': this.store.buyMeta(id); break;
      case 'toggle-silly': this.store.toggleSilly(); break;
      case 'toggle-shop': this.toggleShop(); break;
    }
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
    const screen = this.store.screen;
    // Drives the iOS GPU-layer promotion (see styles.ts): #app itself is composited ONLY on
    // normal-flow screens (menu/win/puddle). On run/paused it must NOT carry a transform, or it
    // becomes the containing block for the fixed HUD children and collapses their layout.
    this.root.setAttribute('data-screen', screen);
    if (screen === 'run' || screen === 'paused') {
      // Paused keeps the run DOM intact (so Resume is instant); just show the overlay.
      if (this.lastScreen !== 'run' && this.lastScreen !== 'paused') this.buildRunSkeleton();
      this.updateRun();
      const ov = this.el('pause-overlay');
      if (ov) ov.style.display = screen === 'paused' ? 'flex' : 'none';
    } else {
      // Normal-flow screens (menu/win/puddle) go inside a FIXED, composited, scrollable layer.
      // On iOS a plain-flow container (even with will-change on #app) still gets painted UNDER the
      // WebGL canvas's auto-promoted layer; a position:fixed layer is always composited and stacks
      // above it — the same pattern that makes the run-screen HUD show. See styles.ts .screen-layer.
      const body =
        screen === 'menu' ? this.renderMenu() : screen === 'win' ? this.renderWin() : this.renderPuddle();
      this.root.innerHTML = `<div class="screen-layer"><div class="screen-inner">${body}</div></div>`;
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
    const producerRows = PRODUCERS.map(
      (p) => `
      <div class="shopitem" id="prow-${p.id}" style="display:none">
        <div class="info"><div class="name">${p.name} <span class="tag" id="pcount-${p.id}">×0</span></div>
        <div class="flavor">${p.flavor}</div></div>
        <button data-action="buy-producer" data-id="${p.id}" id="pbtn-${p.id}" disabled>
          <span class="cost" id="pcost-${p.id}">—</span></button>
      </div>`,
    ).join('');

    // Default the shop open in landscape, closed (drawer/sheet away) in portrait.
    this.shopOpen = !window.matchMedia('(orientation: portrait)').matches;

    // Flattened HUD (direct children of #app) — nested position:fixed + backdrop-filter cards
    // render blank on iOS Safari, which stranded the whole overlay. Solid cards, no nesting.
    this.root.innerHTML = `
    <div id="stage" data-action="click-tower"></div>
    <div id="meltvig"></div>

    <div id="hud-stats" class="hud-card">
      <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:nowrap">
        <span class="title">🟢 GOOP TOWER</span>
        <button data-action="pause" class="mini" aria-label="Pause">❚❚</button>
      </div>
      <div class="stat"><span>Goop</span><b id="sr-goop">0</b></div>
      <div class="stat"><span>Goop / sec</span><b id="sr-gps">0</b></div>
      <div class="stat"><span>Buffer</span><b id="sr-buffer">0</b></div>
    </div>

    <div class="banner grace" id="sr-banner">…</div>

    <div id="hud-readout">
      <div class="h" id="sr-height">0 m</div>
      <div class="z" id="sr-zone">Zone 1</div>
      <div id="sr-combo-label">Goop Momentum ×1.00</div>
      <div class="combo"><i id="sr-combo-fill" style="width:0%"></i></div>
      <div class="hint" id="sr-hint">SLAP THE GOOP</div>
    </div>

    <button id="shop-fab" data-action="toggle-shop">🛒 Shop</button>
    <div id="hud-shop" class="hud-card ${this.shopOpen ? '' : 'collapsed'}">
      <button id="shop-toggle" data-action="toggle-shop">${this.shopOpen ? 'Shop ▾' : 'Close ✕'}</button>
      <div id="shop-body">
        <div class="panel"><h2>Producers</h2>
          <div id="sr-producer-hint" class="tag">Slap the goop to afford your first Dripper.</div>
          ${producerRows}
        </div>
        <div class="panel" style="display:none" id="tier-panel"><h2>Tier Upgrades</h2><div id="tier-list"></div></div>
        <div class="panel" style="display:none" id="run-panel"><h2>Upgrades</h2><div id="run-list"></div></div>
      </div>
    </div>

    <div id="pause-overlay" style="display:none">
      <div class="pause-card hud-card">
        <h1 style="margin-top:0">⏸ Paused</h1>
        <button data-action="resume" class="primary" style="width:100%">Resume ▶</button>
        <button data-action="to-menu" style="width:100%;margin-top:10px">Quit to Menu</button>
        <div class="tag" style="margin-top:10px">Quitting abandons this run (no Essence banked).</div>
      </div>
    </div>`;

    this.applyShopState();
  }

  // ---- Run screen: patch values in place ----

  private updateRun(): void {
    const g = this.store.game;
    const r = g.run;
    const zone = g.currentZone();
    const buffer = g.bufferSeconds();

    // Tower + stats.
    this.setText('sr-height', formatHeight(displayMeters(g.heightRaw())));
    this.setText('sr-zone', `Zone ${zone.index}: ${zone.name}`);
    this.setText('sr-hint', `SLAP THE GOOP — +${this.fmt(g.clickGain())} per slap · ${formatTime(r.runTime)}`);
    this.setText('sr-goop', this.fmt(r.goop));
    this.setText('sr-gps', this.fmt(g.gps()));
    this.setText(
      'sr-buffer',
      `${this.fmt(r.structuralGoop)} (${buffer === Infinity ? '∞' : Math.floor(buffer) + 's'})`,
    );

    // Combo bar.
    const comboPct = Math.max(0, ((r.combo - 1) / (balance.click.comboMaxMult - 1)) * 100);
    this.setText('sr-combo-label', `Goop Momentum ×${r.combo.toFixed(2)}`);
    const fill = this.el('sr-combo-fill');
    if (fill) fill.style.width = `${comboPct}%`;

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
    for (const p of PRODUCERS) {
      const owned = g.run.producersOwned[p.id] ?? 0;
      const cost = g.producerCost(p.id, 1);
      // Progressive reveal: show once owned or roughly within reach, then keep it shown (latch).
      if (!this.revealed.has(p.id) && (owned > 0 || g.run.goop.mul(1000).add(1000).gte(cost))) {
        this.revealed.add(p.id);
        const row = this.el('prow-' + p.id);
        if (row) row.style.display = '';
      }
      if (this.revealed.has(p.id)) {
        anyShown = true;
        this.setText('pcount-' + p.id, `×${owned}`);
        this.setText('pcost-' + p.id, this.fmt(cost));
        this.setDisabled('pbtn-' + p.id, !g.canAfford(cost));
      }
    }
    const hint = this.el('sr-producer-hint');
    if (hint) hint.style.display = anyShown ? 'none' : '';
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
          .map(
            (u) => `<div class="shopitem">
              <div class="info"><div class="name">${u.name}</div><div class="flavor">${u.flavor}</div></div>
              <button data-action="buy-tier" data-id="${u.id}" id="tbtn-${u.id}"><span class="cost">${this.fmt(u.costGoop)}</span></button>
            </div>`,
          )
          .join('');
      }
      if (runList) {
        runList.innerHTML = runs
          .map(
            (u) => `<div class="shopitem">
              <div class="info"><div class="name">${u.name}</div><div class="flavor">${u.flavor}</div></div>
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
        <div class="info"><div class="name">${u.name} <span class="tag">Lv ${lvl}/${u.maxLevel}</span></div>
        <div class="flavor">${u.flavor}</div></div>
        <button data-action="buy-meta" data-id="${u.id}" ${!can || maxed ? 'disabled' : ''}>
          ${maxed ? 'MAX' : `${cost} GE`}</button>
      </div>`;
    }).join('');

    return `
    <h1>🟢 GOOP TOWER</h1>
    <div class="tag">Milestone 0 — playable ugly. Slap goop, climb 7 zones, don't melt.</div>
    <div class="grid">
      <div>
        <div class="panel">
          <h2>Meta — spend Goop Essence</h2>
          ${meta}
        </div>
      </div>
      <div>
        <div class="panel">
          <h2>Show-off Room</h2>
          <div class="stat"><span>Goop Essence</span><b>${m.ge} GE</b></div>
          <div class="stat"><span>Goobers</span><b>${m.goobers}</b></div>
          <div class="stat"><span>Wins</span><b>${m.wins}</b></div>
          <div class="stat"><span>Lifetime clicks</span><b>${formatInt(m.totalClicks)}</b></div>
          <div class="stat"><span>Best height</span><b>${formatHeight(displayMeters(m.bestHeightRaw))}</b></div>
        </div>
        <div class="panel center" style="margin-top:12px">
          <button data-action="start-run" style="width:100%;font-size:18px;padding:14px">START RUN ▶</button>
          <div class="row" style="margin-top:10px">
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
        <button data-action="bank-win" style="font-size:18px;padding:12px">Bank it (×3 GE) ▶</button>
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
      <button data-action="to-menu" style="font-size:18px;padding:12px">Continue ▶</button>
    </div>`;
  }
}
