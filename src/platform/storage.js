/* Storage adapter: where the save lives. Interface: get(key) -> string|null, set(key, string) -> bool,
   remove(key). Values are strings; save.js does the JSON.

   web (today): localStorage, falling back to memory in a private window so the game still plays.
   steam: storage.steam.js, one file per key through the desktop bridge (desktop/); Steam Auto-Cloud
   syncs that folder with no code. */
export function createLocalStorage() {
  const mem = new Map();
  let ls = null;
  try { ls = window.localStorage; const k = '__goop_probe__'; ls.setItem(k, '1'); ls.removeItem(k); } catch (e) { ls = null; }
  return {
    kind: ls ? 'localStorage' : 'memory',
    get(key) { try { return ls ? ls.getItem(key) : (mem.has(key) ? mem.get(key) : null); } catch (e) { return mem.has(key) ? mem.get(key) : null; } },
    set(key, value) { try { if (ls) ls.setItem(key, value); else mem.set(key, value); return true; } catch (e) { mem.set(key, value); return false; } },
    remove(key) { try { if (ls) ls.removeItem(key); } catch (e) { /* nothing to do */ } mem.delete(key); },
  };
}

// For tests and headless tools.
export function createMemoryStorage(seed = {}) {
  const mem = new Map(Object.entries(seed));
  return {
    kind: 'memory',
    get: key => (mem.has(key) ? mem.get(key) : null),
    set: (key, value) => { mem.set(key, String(value)); return true; },
    remove: key => { mem.delete(key); },
    dump: () => Object.fromEntries(mem),
  };
}
