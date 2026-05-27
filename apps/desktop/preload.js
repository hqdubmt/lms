const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Server URL
  getServerUrl:   () => ipcRenderer.invoke('get-server-url'),
  setServerUrl:   (url) => ipcRenderer.invoke('set-server-url', url),
  showSetup:      () => ipcRenderer.invoke('show-setup'),

  // AI
  checkAiHealth:  () => ipcRenderer.invoke('check-ai-health'),

  // Misc
  openExternal:   (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion:  () => ipcRenderer.invoke('get-app-version'),

  // Window controls
  minimize:    () => ipcRenderer.invoke('window-minimize'),
  maximize:    () => ipcRenderer.invoke('window-maximize'),
  close:       () => ipcRenderer.invoke('window-close'),
  reload:      () => ipcRenderer.invoke('window-reload'),
  goBack:      () => ipcRenderer.invoke('window-go-back'),
  goForward:   () => ipcRenderer.invoke('window-go-forward'),
  zoom:        (delta) => ipcRenderer.invoke('window-zoom', delta),
});
