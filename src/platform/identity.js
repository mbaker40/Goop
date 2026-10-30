/* Identity adapter: who is playing. Interface: load(profile), name(), setName(n), snapshot().

   web (today): a local display name, kept in the save. No account, nothing leaves the browser.
   TODO(cloud): POST /claim on the Worker to reserve a username and receive a token (stored beside the
   save) and a recovery phrase. TODO(steam): default the name to the Steam persona name. */
export const DEFAULT_NAME = 'The Scientist';
export function cleanName(n) { return String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24); }
export function createLocalIdentity() {
  let profile = { name: '' };
  return {
    kind: 'local',
    load(p) { profile = { name: cleanName(p && p.name) }; },
    name() { return profile.name || DEFAULT_NAME; },
    setName(n) { profile.name = cleanName(n); return this.name(); },
    snapshot() { return { ...profile }; },
  };
}
