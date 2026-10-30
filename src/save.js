/* Save format, versioning, migration, export and import. Pure: storage is passed in (see
   src/platform/storage.js), so tests and a future Worker can use this file as is.

   Version 1 (the single-file game) wrote { state, prefs, at } to 'feed-the-goop-v1'.
   Version 2 writes { v: 2, at, prefs, state, stats, badges, bests, profile } to 'feed-the-goop-v2'.
   Version 3 (Act 2: twenty stages) has the same shape and the same key; the state gains `miles` and
   `ate` and grows thirteen feeders. A v2 save is migrated in place on first load: stages are recomputed
   from lifetime slop, so a goop already past the Sun lands on the right new stage with nothing lost.
   Version 4 (phase 3) has the same shape and key again. The state gains `bangs` (Big Bangs so far,
   taken from stats.bigBangs on migration) and the Act 2 perks; prefs gain haptics, number style and a
   reduced-motion override; bests gain weekly and daily records ('week:…', 'daily:…'). The daily goop
   has a slot of its own (src/daily.js), outside this save.
   A v1 save is migrated on first load and the v1 key is left untouched as a backup for one release.
   TODO(a later release): stop reading LEGACY_KEY's backup once players have moved over. Kept in phase 3
   on purpose: phases 1 to 3 all shipped within days, so a v1 player may not have loaded the game since,
   and dropping the key now would lose their goop. */
import { FEEDERS, UPGRADES, SUN_AT, FRENZY_MULT, newState, stageOf } from './econ.js';
import { PERKS, DUST_AT_SUN } from './prestige.js';
import { newStats, adoptStats, SUN } from './stats.js';
import { MILESTONE_BY_ID, seedMilestones } from './milestones.js';

export const SAVE_VERSION = 4;
export const SAVE_KEY = 'feed-the-goop-v2';
// A copy of every save under a key no older build writes. If an old tab (or an old cached page) saves
// over SAVE_KEY in an older shape, it silently drops what it does not know (the Act 2 feeders for the
// six-stage build; the Act 2 perks and the Big Bang count for the twenty-stage one); loadSave then
// recovers from this copy. The shadow is also the fallback when SAVE_KEY is missing or corrupt.
// Each schema bump moves the shadow to a new key, because the previous build writes the previous one.
export const SHADOW_KEY = 'feed-the-goop-v4';
export const OLD_SHADOW_KEYS = ['feed-the-goop-v3'];       // read as a last resort, never written
export const CORRUPT_KEY = 'feed-the-goop-corrupt';        // a main save that could not be read, kept aside
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
  s.bangs = Math.floor(num(o.bangs));
  s.startStage = Math.min(s.stage, Math.floor(num(o.startStage)));
  if (Number.isFinite(o.costMult) && o.costMult >= 1 && o.costMult <= 10) s.costMult = o.costMult;
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
  if (!(raw.v >= 4)) state.bangs = Math.floor(stats.bigBangs);   // v4 keeps the count on the state, where perks can read it
  return {
    v: SAVE_VERSION,
    schema: Number.isFinite(raw.v) && raw.v >= 2 ? raw.v : 1,   // the schema this save was written in, before migration (not saved: serialize drops it)
    at: Number.isFinite(d.at) ? d.at : 0,
    prefs: adoptPrefs(d.prefs),
    state, stats,
    badges: idMap(d.badges, k => k.length < 40),
    bests: idMap(d.bests, k => k.length < 40),
    profile: adoptProfile(d.profile),
  };
}

// The identity adapter's profile: a display name, plus the Worker's token once names are claimed online
// (cloud builds only; a local build never has one).
export function adoptProfile(p) {
  const out = { name: p && typeof p.name === 'string' ? p.name.slice(0, 24) : '' };
  if (p && typeof p.token === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(p.token)) out.token = p.token;
  if (p && typeof p.claimed === 'string' && p.claimed.length <= 24) out.claimed = p.claimed;
  return out;
}

// Settings. sound and haptics default on; numbers 'names' or 'sci'; motion 'system' (follow the device),
// 'reduce' or 'full'.
export const MOTION = ['system', 'reduce', 'full'];
export function adoptPrefs(p) {
  p = p && typeof p === 'object' ? p : {};
  return {
    sound: p.sound !== false,
    haptics: p.haptics !== false,
    numbers: p.numbers === 'sci' ? 'sci' : 'names',
    motion: MOTION.includes(p.motion) ? p.motion : 'system',
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

// Read the save through a storage adapter. Returns { data, from, corrupt } where from names where it came
// from ('v2' for the main key, 'shadow', or 'v1'; null for nothing) and data.schema says which version
// that save was written in (1 to 4). corrupt is true when the main key held something unreadable: that
// string is kept aside under CORRUPT_KEY (the latest corrupt string wins)
// and the game tells the player which copy it loaded instead. Order:
//   1. An older build wrote over the main key after this build saved: if a shadow copy is a newer schema
//      and has at least as much play time, it is the real save. Restore it and put it back under the main key.
//   2. The main key, if it reads.
//   3. Main key missing or corrupt: the shadow copy with the most play time.
//   4. The v1 backup. When the main key was corrupt this is never silent (see corrupt).
const parse = str => { if (str == null || str === '') return null; try { return JSON.parse(str); } catch (e) { return undefined; } };
const playSecs = raw => (raw && raw.stats && Number.isFinite(raw.stats.playSecs) ? raw.stats.playSecs : 0);
function shadows(storage) {
  const out = [];
  for (const key of [SHADOW_KEY, ...OLD_SHADOW_KEYS]) { const raw = parse(storage.get(key)); const data = raw ? migrate(raw) : null; if (data) out.push({ key, raw, data }); }
  return out.sort((a, b) => playSecs(b.raw) - playSecs(a.raw) || b.raw.v - a.raw.v);
}
export function loadSave(storage) {
  const mainStr = storage.get(SAVE_KEY), main = parse(mainStr), mainData = main ? migrate(main) : null;
  const corrupt = mainStr != null && mainStr !== '' && !mainData;
  const sh = shadows(storage);
  if (mainData && Number.isFinite(main.v)) {
    const newer = sh.find(c => c.raw.v >= 3 && c.raw.v > main.v && playSecs(c.raw) >= playSecs(main));
    if (newer) { writeSave(storage, newer.data); return { data: newer.data, from: 'shadow', corrupt: false }; }
  }
  if (mainData) return { data: mainData, from: 'v2', corrupt: false };
  if (corrupt && storage.get(CORRUPT_KEY) !== mainStr) storage.set(CORRUPT_KEY, mainStr);
  if (sh.length) return { data: sh[0].data, from: 'shadow', corrupt };
  const legacy = parse(storage.get(LEGACY_KEY)), legacyData = legacy ? migrate(legacy) : null;
  if (legacyData) return { data: legacyData, from: 'v1', corrupt };
  return { data: null, from: null, corrupt };
}
export function writeSave(storage, d) {
  const str = serialize(d);
  storage.set(SHADOW_KEY, str);
  return storage.set(SAVE_KEY, str);
}
// For the settings drawer: the schema on disk and whether the shadow copy matches it.
// shadow: 'in step' (same as the main save), 'behind' (an older copy), 'missing'; corrupt: a damaged
// save is kept aside under CORRUPT_KEY.
export function saveHealth(storage) {
  const main = storage.get(SAVE_KEY), shadow = storage.get(SHADOW_KEY), raw = parse(main);
  return {
    schema: raw && Number.isFinite(raw.v) ? raw.v : null,
    shadow: shadow == null ? 'missing' : shadow === main ? 'in step' : 'behind',
    corrupt: storage.get(CORRUPT_KEY) != null,
  };
}

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
