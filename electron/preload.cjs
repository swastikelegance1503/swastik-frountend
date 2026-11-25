const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // App version
  getVersion: () => ipcRenderer.invoke('app:version'),

  // Open external links safely in system default browser (e.g. Google Drive / Sheets links)
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),

  // Direct printer trigger
  print: (options) => ipcRenderer.invoke('app:print', options),

  // Get installed printers
  getPrinters: () => ipcRenderer.invoke('app:get-printers'),

  // Direct Google Drive / Sheet delete via Node.js
  deleteFromDrive: (payload) => ipcRenderer.invoke('drive:delete-challan', payload),

  // Window control helpers
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close')
});

