const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tmAPI', {
  getPlanUsage: () => ipcRenderer.invoke('get-plan-usage'),
  setAlwaysOnTop: (val) => ipcRenderer.invoke('set-always-on-top', val),
  winMove: (dx, dy) => ipcRenderer.send('win-move', { dx, dy }),
  winHide: () => ipcRenderer.send('win-hide'),
  setupOpen: () => ipcRenderer.send('setup-open'),
  setupClose: () => ipcRenderer.send('setup-close'),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, val) => ipcRenderer.invoke('store-set', key, val),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
})
