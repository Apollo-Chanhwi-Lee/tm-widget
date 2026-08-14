const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tmAPI', {
  // Claude
  getPlanUsage: () => ipcRenderer.invoke('get-plan-usage'),
  onRefreshPlanUsage: (cb) => ipcRenderer.on('refresh-plan-usage', cb),
  // 창 제어
  setAlwaysOnTop: (val) => ipcRenderer.invoke('set-always-on-top', val),
  winMove: (dx, dy) => ipcRenderer.send('win-move', { dx, dy }),
  winMoveTopRight: () => ipcRenderer.send('win-move-top-right'),
  winHide: () => ipcRenderer.send('win-hide'),
  quitApp: () => ipcRenderer.send('quit-app'),
  // SetupModal
  setupOpen: () => ipcRenderer.send('setup-open'),
  setupClose: () => ipcRenderer.send('setup-close'),
  // Store
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, val) => ipcRenderer.invoke('store-set', key, val),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  // 외부 링크 (시스템 브라우저)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  // API 호출 (main process에서 실행 — 프록시/CORS 우회)
  fetchChatGPTUsage: () => ipcRenderer.invoke('fetch-chatgpt-usage'),
  fetchGeminiStatus: () => ipcRenderer.invoke('fetch-gemini-status'),
})
