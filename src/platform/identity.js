/* Identity adapter: who is playing. Interface: load(profile), name(), setName(n) -> { ok, name, reason },
   snapshot(), avatarStage(state, stats).

   web (today): a local display name, kept in the save. No account, nothing leaves the browser.
   cloud: identity.cloud.js also POSTs /claim to the Worker for a token and a recovery phrase.
   steam: the name could default to the Steam persona name (not wired yet). */
export const DEFAULT_NAME = 'The Scientist';
export const NAME_MIN = 3, NAME_MAX = 16;
// Loading keeps any name an older build saved (up to 24 characters); choosing a new one follows the rules below.
export function cleanName(n) { return String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24); }

// A small local blocklist, matched against whole words so Scunthorpe, Cockpit and Grape pass. Each word
// is folded (lower case, look-alike digits turned into letters, the rest removed); camelCase splits into
// words, spelled-out letters (B.i.t.c.h) join back into one, and a word may carry a plain ending (s, er,
// ing...). A few strings are blocked anywhere in a name, because no ordinary word contains them. The
// Worker will have the final say once names are claimed online; this only keeps the obvious off a share card.
const BLOCK = ['fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'fag', 'rape', 'rapist', 'nazi', 'hitler', 'penis', 'pussy', 'cock', 'dick', 'twat', 'wank', 'admin', 'moderator', 'official'];
const BLOCK_ANYWHERE = ['fuck', 'nigger', 'nigga', 'faggot', 'motherf'];
const ENDINGS = ['', 's', 'es', 'er', 'ers', 'ing', 'ed', 'y', 'ty', 'z', 'face', 'head'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };
export function foldName(n) { return String(n).toLowerCase().replace(/[0-9@$!]/g, c => LEET[c] || c).replace(/[^a-z]/g, ''); }
// The words of a name, folded: split on spaces and . _ ' -, and at camelCase; runs of single letters joined.
export function nameWords(n) {
  const raw = String(n).replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2').split(/[\s._'-]+/).filter(Boolean);
  const out = [];
  let run = '';
  for (const w of raw) {
    if ([...w].length === 1) { run += w; continue; }
    if (run) { out.push(run); run = ''; }
    out.push(w, w.replace(/\d+$/, ''));            // "Shit99" is "shit", not "shitgg"
  }
  if (run) out.push(run);
  return [...new Set(out.map(foldName).filter(Boolean))];
}
export function blockedName(n) {
  const all = foldName(n);
  if (BLOCK_ANYWHERE.some(w => all.includes(w))) return true;
  return nameWords(n).some(w => BLOCK.some(b => w.startsWith(b) && ENDINGS.includes(w.slice(b.length))));
}
// Letters (any script), digits, spaces and . - _ ' only. Runs of spaces collapse.
const ALLOWED = /^[\p{L}\p{N} ._'-]+$/u;
export function validateName(raw) {
  const name = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  const len = [...name].length;
  if (len < NAME_MIN) return { ok: false, name, reason: 'At least ' + NAME_MIN + ' characters, please.' };
  if (len > NAME_MAX) return { ok: false, name, reason: 'At most ' + NAME_MAX + ' characters, please.' };
  if (!ALLOWED.test(name)) return { ok: false, name, reason: 'Letters, numbers, spaces and . - _ \' only.' };
  if (!/[\p{L}\p{N}]/u.test(name)) return { ok: false, name, reason: 'It needs at least one letter or number.' };
  if (blockedName(name)) return { ok: false, name, reason: 'The goop would rather not be called that. Try another.' };
  return { ok: true, name, reason: '' };
}

export function createLocalIdentity() {
  let profile = { name: '' };
  return {
    kind: 'local',
    load(p) { profile = { ...(p && typeof p === 'object' ? p : {}), name: cleanName(p && p.name) }; },
    name() { return profile.name || DEFAULT_NAME; },
    hasName() { return !!profile.name; },
    setName(n) { const r = validateName(n); if (r.ok) profile.name = r.name; return { ...r, name: r.ok ? r.name : this.name() }; },
    snapshot() { return { ...profile }; },
  };
}
