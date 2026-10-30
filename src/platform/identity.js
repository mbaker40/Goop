/* Identity adapter: who is playing. Interface: load(profile), name(), setName(n) -> { ok, name, reason },
   snapshot(), avatarStage(state, stats).

   web (today): a local display name, kept in the save. No account, nothing leaves the browser.
   cloud: identity.cloud.js also POSTs /claim to the Worker for a token and a recovery phrase.
   steam: the name could default to the Steam persona name (not wired yet). */
export const DEFAULT_NAME = 'The Scientist';
export const NAME_MIN = 3, NAME_MAX = 16;
// Loading keeps any name an older build saved (up to 24 characters); choosing a new one follows the rules below.
export function cleanName(n) { return String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24); }

// A small local blocklist, checked against a folded copy of the name (lower case, look-alike digits
// turned into letters, everything else removed). The Worker will have the final say once names are
// claimed online; this only keeps the obvious out of a share card.
const BLOCK = ['fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'nigg', 'fagg', 'rape', 'nazi', 'hitler', 'penis', 'pussy', 'cock', 'twat', 'wank', 'admin', 'moderator', 'official'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };
export function foldName(n) { return String(n).toLowerCase().replace(/[0-9@$!]/g, c => LEET[c] || c).replace(/[^a-z]/g, ''); }
// Letters (any script), digits, spaces and . - _ ' only. Runs of spaces collapse.
const ALLOWED = /^[\p{L}\p{N} ._'-]+$/u;
export function validateName(raw) {
  const name = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  const len = [...name].length;
  if (len < NAME_MIN) return { ok: false, name, reason: 'At least ' + NAME_MIN + ' characters, please.' };
  if (len > NAME_MAX) return { ok: false, name, reason: 'At most ' + NAME_MAX + ' characters, please.' };
  if (!ALLOWED.test(name)) return { ok: false, name, reason: 'Letters, numbers, spaces and . - _ \' only.' };
  if (!/[\p{L}\p{N}]/u.test(name)) return { ok: false, name, reason: 'It needs at least one letter or number.' };
  const f = foldName(name);
  if (BLOCK.some(w => f.includes(w))) return { ok: false, name, reason: 'The goop would rather not be called that. Try another.' };
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
