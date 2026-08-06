const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tmAPI', {
  getPlanUsage: () => ipcRenderer.invoke('get-plan-usage'),
  setAlwaysOnTop: (val) => ipcRenderer.invoke('set-always-on-top', val),
  winMove: (dx, dy) => ipcRenderer.send('win-move', { dx, dy }),
  winHide: () => ipcRenderer.send('win-hide'),

  // Store API
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, val) => ipcRenderer.invoke('store-set', key, val),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
})
