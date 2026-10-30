/* Feed the Goop desktop: an Electron shell around the same built game (../dist/index.html, built with
   `npm run build` at the repo root). Not built by CI, not shipped yet: see README.md.

   The page talks to this process only through the preload's goopDesktop bridge:
     saves         one file per storage key in <userData>/saves, written atomically (temp file + rename);
                   Steam Auto-Cloud syncs that folder with no code (configured in the Steamworks partner site)
     achievements  badge ids map one to one onto Steam achievement API names
     leaderboards  personal bests posted to Steam boards (the Worker stays the source of truth later)
   Every Steam call is a no-op when steamworks.js is not installed or Steam is not running. */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const STEAM_APP_ID = Number(process.env.GOOP_STEAM_APP_ID || 480);   // 480 is Valve's test app (Spacewar)
let steam = null;
function initSteam() {
  if (!process.env.GOOP_STEAM) return null;
  try {
    // steamworks.js plugs in here. init() needs Steam running and steam_appid.txt (or the app id).
    const sw = require('steamworks.js');
    const client = sw.init(STEAM_APP_ID);
    sw.electronEnableSteamOverlay();          // the overlay is unreliable in Electron for some users; nothing depends on it
    return client;
  } catch (e) { console.warn('Steam is not available; playing without it.', e.message); return null; }
}

const saveDir = () => path.join(app.getPath('userData'), 'saves');
const keyFile = key => path.join(saveDir(), String(key).replace(/[^a-z0-9._-]/gi, '_') + '.json');
ipcMain.on('goop:read', (e, key) => { try { e.returnValue = fs.readFileSync(keyFile(key), 'utf8'); } catch (err) { e.returnValue = null; } });
ipcMain.on('goop:write', (e, key, value) => {
  try {
    fs.mkdirSync(saveDir(), { recursive: true });
    const file = keyFile(key), tmp = file + '.tmp';
    fs.writeFileSync(tmp, String(value), 'utf8'); fs.renameSync(tmp, file);
    e.returnValue = true;
  } catch (err) { e.returnValue = false; }
});
ipcMain.on('goop:remove', (e, key) => { try { fs.unlinkSync(keyFile(key)); } catch (err) { /* nothing to remove */ } e.returnValue = true; });
ipcMain.handle('goop:achievement', (e, id) => { try { return steam ? steam.achievement.activate(String(id)) : false; } catch (err) { return false; } });
ipcMain.handle('goop:score', async (e, board, value) => {
  // steamworks.js leaderboards: find or create `board`, then upload `value` (keep best). Wire up when the
  // Steam boards exist in the partner site; until then this reports that nothing was posted.
  return { posted: false, board, value, steam: !!steam };
});
ipcMain.handle('goop:info', () => ({ steam: !!steam, name: steam ? steam.localplayer.getName() : null }));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 720, minHeight: 600, backgroundColor: '#2b2150', title: 'Feed the Goop',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
app.whenReady().then(() => { steam = initSteam(); createWindow(); });
app.on('window-all-closed', () => app.quit());
