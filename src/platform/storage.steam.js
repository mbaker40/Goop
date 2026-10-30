/* Steam storage: one file per key in the desktop build's save folder, through the goopDesktop bridge
   (desktop/preload.js). The main process writes atomically (temp file, then rename), and Steam Auto-Cloud
   syncs the folder with no code. Same interface as storage.js; without a bridge it behaves like memory. */
export function createSteamStorage(bridge) {
  const mem = new Map();
  const ok = !!(bridge && typeof bridge.readSave === 'function' && typeof bridge.writeSave === 'function');
  return {
    kind: ok ? 'steam-file' : 'memory',
    get(key) { if (!ok) return mem.has(key) ? mem.get(key) : null; try { const v = bridge.readSave(key); return typeof v === 'string' ? v : null; } catch (e) { return null; } },
    set(key, value) { if (!ok) { mem.set(key, String(value)); return true; } try { return bridge.writeSave(key, String(value)) !== false; } catch (e) { return false; } },
    remove(key) { mem.delete(key); if (ok && typeof bridge.removeSave === 'function') try { bridge.removeSave(key); } catch (e) { /* nothing to do */ } },
  };
}
