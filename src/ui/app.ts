/**
 * ui/app.ts — the DOM overlay (PLAN §9 UI layer, M0 "ugly but complete").
 * Reads sim state through the Store and dispatches actions via event delegation, so the
 * whole screen can be re-rendered each frame without breaking rapid clicking.
 */

import type { Store } from '../store';
import { balance } from '../config/balance';
import { PRODUCERS } from '../config/producers';
import { META_UPGRADES } from '../config/upgrades';
import { ZONES } from '../config/zones';
import { displayMeters } from '../config/zones';
import { metaUpgradeCost, canBuyMeta } from '../sim/prestige';
import { format, formatInt, formatHeight, formatTime } from '../sim/numbers';
import type { Decimal } from '../sim/numbers';

export class GoopUI {
  private root: HTMLElement;

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

  // ---- Input (event delegation) ----

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
      case 'bank-win': this.store.bankWin(); break;
      case 'buy-producer': this.store.buyProducer(id, 1); break;
      case 'buy-tier': this.store.buyTierUpgrade(id); break;
      case 'buy-run': this.store.buyRunUpgrade(id); break;
      case 'buy-meta': this.store.buyMeta(id); break;
      case 'toggle-silly': this.store.toggleSilly(); break;
    }
  }

  // ---- Render ----

  private render(): void {
    switch (this.store.screen) {
      case 'menu': this.root.innerHTML = this.renderMenu(); break;
      case 'run': this.root.innerHTML = this.renderRun(); break;
      case 'win': this.root.innerHTML = this.renderWin(); break;
      case 'puddle': this.root.innerHTML = this.renderPuddle(); break;
    }
  }

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
        <div class="panel" style="margin-top:12px" class="center">
          <button data-action="start-run" style="width:100%;font-size:18px;padding:14px">START RUN ▶</button>
          <div class="row" style="margin-top:10px">
            <button data-action="toggle-silly">Silly names: ${this.store.settings.sillyNames ? 'ON' : 'off'}</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  private renderRun(): string {
    const g = this.store.game;
    const r = g.run;
    const zone = g.currentZone();
    const gps = g.gps();
    const buffer = g.bufferSeconds();
    const comboPct = ((r.combo - 1) / (balance.click.comboMaxMult - 1)) * 100;

    return `
    <div class="row" style="justify-content:space-between">
      <h1 style="font-size:20px">🟢 GOOP TOWER</h1>
      <button data-action="to-menu">≡ Menu</button>
    </div>
    ${this.renderMeltBanner(r.status, buffer)}
    <div class="grid">
      <div>
        <div class="tower" data-action="click-tower">
          <div>
            <div class="h">${formatHeight(displayMeters(g.heightRaw()))}</div>
            <div class="z">Zone ${zone.index}: ${zone.name}</div>
            <div class="hint">SLAP THE GOOP — +${this.fmt(g.clickGain())} per slap · ${formatTime(r.runTime)}</div>
          </div>
        </div>
        <div style="margin-top:8px">
          <div class="tag">Goop Momentum ×${r.combo.toFixed(2)}</div>
          <div class="combo"><i style="width:${Math.max(0, comboPct)}%"></i></div>
        </div>
        <div class="panel" style="margin-top:10px">
          <div class="stat"><span>Goop</span><b>${this.fmt(r.goop)}</b></div>
          <div class="stat"><span>Goop / sec</span><b>${this.fmt(gps)}</b></div>
          <div class="stat"><span>Structural buffer</span><b>${this.fmt(r.structuralGoop)} (${buffer === Infinity ? '∞' : Math.floor(buffer) + 's'})</b></div>
        </div>
      </div>
      <div>
        ${this.renderShop()}
      </div>
    </div>`;
  }

  private renderMeltBanner(status: string, buffer: number): string {
    if (status === 'grace') {
      return `<div class="banner grace">🫧 Grace period — your goop is still warming up…</div>`;
    }
    if (status === 'collapsing') {
      return `<div class="banner red">💥 STRUCTURAL FAILURE — the tower is coming down…</div>`;
    }
    if (buffer <= balance.melt.warnRedSec) {
      return `<div class="banner red">🔥 MELTING! ${Math.floor(buffer)}s of buffer left — GOOP FASTER</div>`;
    }
    if (buffer <= balance.melt.warnOrangeSec) {
      return `<div class="banner orange">🌡️ Getting warm — ${Math.floor(buffer)}s of buffer</div>`;
    }
    return `<div class="banner safe">✅ Tower stable — ${buffer === Infinity ? 'no melt' : Math.floor(buffer) + 's buffer'}</div>`;
  }

  private renderShop(): string {
    const g = this.store.game;
    const producers = PRODUCERS.map((p) => {
      const owned = g.run.producersOwned[p.id] ?? 0;
      const cost = g.producerCost(p.id, 1);
      const can = g.canAfford(cost);
      // Hide producers far out of reach to reduce clutter (first-time clarity).
      if (owned === 0 && cost.gt(g.run.goop.mul(1000).add(1000))) return '';
      return `<div class="shopitem">
        <div class="info"><div class="name">${p.name} <span class="tag">×${owned}</span></div>
        <div class="flavor">${p.flavor}</div></div>
        <button data-action="buy-producer" data-id="${p.id}" ${can ? '' : 'disabled'}>
          <span class="cost">${this.fmt(cost)}</span></button>
      </div>`;
    }).join('');

    const tiers = g.availableTierUpgrades().slice(0, 4).map((u) => {
      const can = g.run.goop.gte(u.costGoop);
      return `<div class="shopitem">
        <div class="info"><div class="name">${u.name}</div><div class="flavor">${u.flavor}</div></div>
        <button data-action="buy-tier" data-id="${u.id}" ${can ? '' : 'disabled'}>
          <span class="cost">${this.fmt(u.costGoop)}</span></button>
      </div>`;
    }).join('');

    const runs = g.availableRunUpgrades().filter((u) => g.run.goop.gte(u.costGoop / 20)).map((u) => {
      const can = g.run.goop.gte(u.costGoop);
      return `<div class="shopitem">
        <div class="info"><div class="name">${u.name}</div><div class="flavor">${u.flavor}</div></div>
        <button data-action="buy-run" data-id="${u.id}" ${can ? '' : 'disabled'}>
          <span class="cost">${this.fmt(u.costGoop)}</span></button>
      </div>`;
    }).join('');

    return `
      <div class="panel"><h2>Producers</h2>${producers || '<div class="tag">Slap the goop to afford your first Dripper.</div>'}</div>
      ${tiers ? `<div class="panel" style="margin-top:12px"><h2>Tier Upgrades</h2>${tiers}</div>` : ''}
      ${runs ? `<div class="panel" style="margin-top:12px"><h2>Upgrades</h2>${runs}</div>` : ''}`;
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
    const zone = ZONES.find((z) => z.index === (g.currentZone().index)) ?? ZONES[0]!;
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
