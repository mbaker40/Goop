/**
 * save/index.ts - versioned localStorage persistence (PLAN §12).
 * The storage backend is isolated here so a later platform wrapper (Steam/iOS) can swap
 * it without touching the rest of the game. Decimals serialize as strings.
 */

import { Decimal, D } from '../sim/numbers';
import { balance } from '../config/balance';
import { createMetaState, type MetaState, type RunState } from '../sim/game';
import { defaultSettings, type Settings } from '../store';

export const SAVE_VERSION = 1;
const KEY = `goopTower.save.v${SAVE_VERSION}`;

export interface SaveData {
  version: number;
  savedAt: number;
  meta: MetaState;
  run: SerializedRun | null;
  settings: Settings;
}

interface SerializedRun extends Omit<RunState, 'goop' | 'lifetimeGoop' | 'structuralGoop' | 'emaIncome'> {
  goop: string;
  lifetimeGoop: string;
  structuralGoop: string;
  emaIncome: string;
}

// ---- Run (de)serialization: Decimals <-> strings ----

export function serializeRun(run: RunState): SerializedRun {
  return {
    ...run,
    goop: run.goop.toString(),
    lifetimeGoop: run.lifetimeGoop.toString(),
    structuralGoop: run.structuralGoop.toString(),
    emaIncome: run.emaIncome.toString(),
  };
}

export function deserializeRun(s: SerializedRun): RunState {
  return {
    ...s,
    goop: D(new Decimal(s.goop)),
    lifetimeGoop: D(new Decimal(s.lifetimeGoop)),
    structuralGoop: D(new Decimal(s.structuralGoop)),
    emaIncome: D(new Decimal(s.emaIncome)),
    // Chaos-event fields arrived mid-M3 - default them for older mid-run saves.
    eventCooldown: s.eventCooldown ?? 120,
    activeEvent: s.activeEvent ?? null,
    eventEffects: s.eventEffects ?? [],
  };
}

// ---- Load / save ----

export function loadSave(): SaveData | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SaveData;
    return migrate(parsed);
  } catch {
    // Never destroy an unparseable save - stash it and start fresh (PLAN §12).
    try {
      localStorage.setItem(`goopTower.save.corrupt.${Date.now()}`, raw);
    } catch {
      /* quota - nothing more we can do */
    }
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* localStorage quota / private mode - fail silently for M0 */
  }
}

export function buildSave(meta: MetaState, run: RunState | null, settings: Settings, runActive: boolean): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    meta,
    run: run && runActive ? serializeRun(run) : null,
    settings,
  };
}

/** Migration chain scaffold (PLAN §12). Currently a single version; extend as versions grow. */
function migrate(data: SaveData): SaveData {
  let d = data;
  // Fill any missing fields defensively - meta merges over defaults so fields added in updates
  // (puddles, lifetimeGe, achievements, …) exist on older saves.
  d = { ...d, meta: { ...createMetaState(), ...(d.meta ?? {}) } };
  // Tutorial arrived mid-M3: anyone with recorded play predates it and must NEVER see it.
  const legacy = d.meta as { tutorialStep?: number };
  if (!('tutorialStep' in (data.meta ?? {})) && (d.meta.totalClicks > 0 || d.meta.lifetimeGe > 0)) {
    legacy.tutorialStep = 999;
    d.meta.puddleTipShown = true;
  }
  if (!d.settings) d = { ...d, settings: defaultSettings() };
  // Future: while (d.version < SAVE_VERSION) { ...bump... }
  d.version = SAVE_VERSION;
  return d;
}

// ---- Export / import as base64 (streamer machine-swapping, PLAN §12) ----

export function exportSave(data: SaveData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function importSave(b64: string): SaveData | null {
  try {
    const json = decodeURIComponent(escape(atob(b64.trim())));
    return migrate(JSON.parse(json) as SaveData);
  } catch {
    return null;
  }
}

// ---- Offline progress: capped GPS credit, melt paused (PLAN §12) ----

export interface OfflineResult {
  seconds: number;
  goopGained: Decimal;
}

/** Credit capped offline GPS to a restored run. Returns the credit for a toast ("your goop napped"). */
export function applyOfflineProgress(gpsPerSec: Decimal, savedAt: number, now: number): OfflineResult {
  const elapsed = Math.max(0, (now - savedAt) / 1000);
  const credited = Math.min(elapsed, balance.offline.maxCreditSeconds);
  return { seconds: credited, goopGained: gpsPerSec.mul(credited) };
}
