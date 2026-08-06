const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tmAPI', {
  getPlanUsage: () => ipcRenderer.invoke('get-plan-usage'),
  setAlwaysOnTop: (val) => ipcRenderer.invoke('set-always-on-top', val),
  winMove: (dx, dy) => ipcRenderer.send('win-move', { dx, dy }),
  winHide: () => ipcRenderer.send('win-hide'),
  
  // 설정 모달 창 크기/위치 제어
  setupOpen: () => ipcRenderer.send('setup-open'),
  setupClose: () => ipcRenderer.send('setup-close'),

  // Store API
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, val) => ipcRenderer.invoke('store-set', key, val),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
})
