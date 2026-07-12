/**
 * numbers.ts - break_infinity.js wrappers + formatting (PLAN §9, §13).
 * ALL goop quantities go through Decimal; never raw JS numbers for goop.
 * (Height stays a plain JS number - it never exceeds the double range, PLAN §5.1.)
 */

import Decimal from 'break_infinity.js';
import { balance } from '../config/balance';

export { Decimal };
export type Num = Decimal;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function D(v: Decimal | number | string): Decimal {
  return v instanceof Decimal ? v : new Decimal(v);
}

/** Short-scale suffix names (PLAN §13). "silly names" toggle swaps a few in. */
const SUFFIXES = [
  '', 'K', 'M', 'B', 'T',
  'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc',
  'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg',
];

const SILLY: Record<string, string> = {
  Qa: 'Goopillion',
  Qi: 'Squelchillion',
  Sx: 'Splatillion',
};

export interface FormatOpts {
  /** Show the "silly names" variant of suffixes (PLAN §13 toggle). */
  silly?: boolean;
  /** Decimal places for the mantissa. */
  places?: number;
}

/** Format a goop quantity: 1234 -> "1.23K", scientific past 1e33 (PLAN §13). */
export function format(value: Decimal | number, opts: FormatOpts = {}): string {
  const d = D(value);
  const places = opts.places ?? 2;

  if (d.lt(1000)) {
    const n = d.toNumber();
    return Number.isInteger(n) ? String(n) : n.toFixed(places);
  }

  if (d.gte(balance.format.scientificAbove)) {
    // e.g. "1.23e45"
    const exp = Math.floor(d.log10());
    const mant = d.div(Decimal.pow(10, exp)).toNumber();
    return `${mant.toFixed(places)}e${exp}`;
  }

  const exp = Math.floor(d.log10());
  const group = Math.floor(exp / 3);
  const mant = d.div(Decimal.pow(10, group * 3)).toNumber();
  let suffix = SUFFIXES[group] ?? `e${group * 3}`;
  const silly = opts.silly ? SILLY[suffix] : undefined;
  if (silly) suffix = silly;
  return `${mant.toFixed(places)}${suffix}`;
}

/** Format an integer count (producers owned, clicks) with grouping but no suffix churn. */
export function formatInt(value: number): string {
  if (value < 1e6) return Math.floor(value).toLocaleString('en-US');
  return format(value, { places: 2 });
}

/** Format a duration in seconds as m:ss or h:mm:ss. */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Format a flavor "meters" height (PLAN §3): m, km, then scientific. */
export function formatHeight(meters: number): string {
  if (meters < 1000) return `${meters.toFixed(meters < 10 ? 2 : 0)} m`;
  if (meters < 1e6) return `${(meters / 1000).toFixed(2)} km`;
  if (meters < 1.496e11) return `${(meters / 1000).toExponential(2)} km`;
  return `${(meters / 1.496e11).toExponential(2)} AU`;
}
