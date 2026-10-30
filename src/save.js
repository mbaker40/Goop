/* Save format, versioning, migration, export and import. Pure: storage is passed in (see
   src/platform/storage.js), so tests and a future Worker can use this file as is.

   Version 1 (the single-file game) wrote { state, prefs, at } to 'feed-the-goop-v1'.
   Version 2 writes { v: 2, at, prefs, state, stats, badges, bests, profile } to 'feed-the-goop-v2'.
   Version 3 (Act 2: twenty stages) has the same shape and the same key; the state gains `miles` and
   `ate` and grows thirteen feeders. A v2 save is migrated in place on first load: stages are recomputed
   from lifetime slop, so a goop already past the Sun lands on the right new stage with nothing lost.
   A v1 save is migrated on first load and the v1 key is left untouched as a backup for one release.
   TODO(next release): stop reading LEGACY_KEY's backup and remove it once players have moved over. */
import { FEEDERS, UPGRADES, SUN_AT, FRENZY_MULT, newState, stageOf } from './econ.js';
import { PERKS, DUST_AT_SUN } from './prestige.js';
import { newStats, adoptStats, SUN } from './stats.js';
import { MILESTONE_BY_ID, seedMilestones } from './milestones.js';

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'feed-the-goop-v2';
export const LEGACY_KEY = 'feed-the-goop-v1';
export const EXPORT_PREFIX = 'GOOP2:';

const num = v => (Number.isFinite(v) && v >= 0 ? v : 0);

// Rebuild a game state from anything. Same rules the v1 game used, plus the v2 fields.
export function adoptState(o) {
  const s = newState();
  if (!o || typeof o !== 'object') return s;
  for (const k of ['slop', 'life', 'feeds', 'asc', 'played', 'dust', 'frenzy', 'freeze']) s[k] = num(o[k]);
  s.asc = Math.floor(s.asc); s.dust = Math.floor(s.dust);
  if (Number.isFinite(o.fmult) && o.fmult >= 1 && o.fmult <= 100) s.fmult = o.fmult; else s.fmult = FRENZY_MULT;
  if (Array.isArray(o.own)) s.own = s.own.map((_, i) => Math.max(0, Math.floor(+o.own[i] || 0)));
  if (o.ups && typeof o.ups === 'object') for (const u of UPGRADES) if (o.ups[u.id]) s.ups[u.id] = true;
  if (o.perks && typeof o.perks === 'object') for (const p of PERKS) {
    const lv = Math.floor(+o.perks[p.id] || 0);
    if (lv > 0) s.perks[p.id] = Math.min(lv, p.cost.length);
  }
  s.winSeen = !!o.winSeen; s.stage = stageOf(s.life); s.won = s.life >= SUN_AT;
  s.ate = !!o.ate;
  if (o.miles && typeof o.miles === 'object') {
    for (const id of Object.keys(o.miles)) if (MILESTONE_BY_ID[id] && o.miles[id]) s.miles[id] = true;
  } else seedMilestones(s);          // a save from before milestones: everything behind the goop counts as done, quietly
  return s;
}

const idMap = (o, ok) => {
  const m = {};
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (ok(k) && Number.isFinite(v)) m[k] = v;
  return m;
};

// Any version in, a clean current-version object out (or null if there is nothing usable).
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || !raw.state || typeof raw.state !== 'object') return null;
  let d = raw;
  if (!Number.isFinite(d.v) || d.v < 2) d = fromV1(d);
  const state = adoptState(d.state);
  const stats = adoptStats(d.stats);
  return {
    v: SAVE_VERSION,
    schema: Number.isFinite(raw.v) && raw.v >= 2 ? raw.v : 1,   // the schema this save was written in, before migration (not saved: serialize drops it)
    at: Number.isFinite(d.at) ? d.at : 0,
    prefs: { sound: !(d.prefs && d.prefs.sound === false) },
    state, stats,
    badges: idMap(d.badges, k => k.length < 40),
    bests: idMap(d.bests, k => k.length < 40),
    profile: { name: d.profile && typeof d.profile.name === 'string' ? d.profile.name.slice(0, 24) : '' },
  };
}

// v1 -> v2. Past hops each needed a Sun run, so they are paid the Star Dust a Sun run earns now.
export function fromV1(d) {
  const o = d.state, st = newStats();
  st.feeds = st.clicks = num(o.feeds); st.paidClicks = st.feeds;
  st.playSecs = num(o.played);
  st.lifetimeSlop = num(o.life);
  st.hops = Math.floor(num(o.asc)); st.wins = st.hops + (num(o.life) >= SUN_AT ? 1 : 0);
  st.runStageAt = [0];
  return {
    v: 2, at: d.at, prefs: d.prefs,
    state: { ...o, dust: Math.floor(num(o.asc)) * DUST_AT_SUN, perks: {} },
    stats: st, badges: {}, bests: {}, profile: {}, migratedFrom: 1,
  };
}

export function serialize(d) { const { schema, ...rest } = d; return JSON.stringify({ ...rest, v: SAVE_VERSION }); }

// Read the save through a storage adapter. Returns { data, from } where from names the key it came
// from ('v2' or 'v1', or null); data.schema says which version that save was written in (1, 2 or 3).
// TODO(follow-up): a v2 save that exists but is corrupt currently falls back to the v1 backup silently;
// keep the corrupt string aside and tell the player instead.
export function loadSave(storage) {
  for (const [key, from] of [[SAVE_KEY, 'v2'], [LEGACY_KEY, 'v1']]) {
    let raw = null;
    try { raw = JSON.parse(storage.get(key) || 'null'); } catch (e) { raw = null; }
    const data = migrate(raw);
    if (data) return { data, from };
  }
  return { data: null, from: null };
}
export function writeSave(storage, d) { return storage.set(SAVE_KEY, serialize(d)); }

/* ---------- export and import: a copyable string ---------- */
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
export function exportString(d) { return EXPORT_PREFIX + toBase64(serialize(d)); }
// Accepts an exported string, or raw save JSON (v1 or v2). Throws with a friendly message if unusable.
export function importString(str) {
  const t = String(str || '').trim();
  if (!t) throw new Error('That save is empty.');
  let raw;
  try { raw = JSON.parse(t.startsWith(EXPORT_PREFIX) ? fromBase64(t.slice(EXPORT_PREFIX.length).replace(/\s+/g, '')) : t); }
  catch (e) { throw new Error('That does not look like a Feed the Goop save.'); }
  const d = migrate(raw);
  if (!d) throw new Error('That does not look like a Feed the Goop save.');
  return d;
}
export { SUN };
