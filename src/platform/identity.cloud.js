/* Cloud identity: the local name rules and profile, plus POST /claim on the Worker, which reserves the
   name (adding a number if it is taken) and returns a token, kept in the profile beside the save, and a
   recovery phrase shown once. Offline, the name is still set locally and claimed on a later try.
   Selected only when cloud is enabled (see config.js). */
import { createLocalIdentity } from './identity.js';
import { fetchJson } from './net.js';

export function createCloudIdentity(api, { local = createLocalIdentity(), fetchImpl } = {}) {
  let extra = {};
  return {
    ...local,
    kind: 'cloud',
    load(p) { local.load(p); extra = p && p.token ? { token: p.token, claimed: p.claimed || '' } : {}; },
    token: () => extra.token || null,
    snapshot() { return { ...local.snapshot(), ...extra }; },
    // Set the name locally, then try to claim it. Resolves { ok, name, reason, claimed, recovery }.
    async claim(n) {
      const r = local.setName(n);
      if (!r.ok) return r;
      const json = await fetchJson(api, '/claim', { method: 'POST', token: extra.token, body: { name: r.name }, fetchImpl });
      if (!json || typeof json.name !== 'string') return { ...r, claimed: false };
      if (typeof json.token === 'string') extra.token = json.token;
      extra.claimed = json.name;
      return { ...r, claimed: true, name: json.name, recovery: json.recovery || null };
    },
  };
}
