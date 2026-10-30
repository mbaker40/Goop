/* The bridge between the game page and the desktop shell. Exposes window.goopDesktop and sets
   window.goopHost = 'steam', which makes src/platform/index.js pick the Steam providers
   (storage.steam.js, achievements.steam.js, scores.steam.js). Minimal on purpose: read and write a save
   by key, unlock an achievement, post a score. Without Steam the last two are no-ops in main.js. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goopDesktop', {
  readSave: key => ipcRenderer.sendSync('goop:read', String(key)),             // string or null; sync, like localStorage
  writeSave: (key, value) => ipcRenderer.sendSync('goop:write', String(key), String(value)),
  removeSave: key => ipcRenderer.sendSync('goop:remove', String(key)),
  unlockAchievement: id => { ipcRenderer.invoke('goop:achievement', String(id)); },
  postScore: (board, value) => { ipcRenderer.invoke('goop:score', String(board), Number(value)); },
  info: () => ipcRenderer.invoke('goop:info'),
});
contextBridge.exposeInMainWorld('goopHost', 'steam');
