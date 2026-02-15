const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ig', {
  version: '0.1.0',
  storage: {
    loadState: () => ipcRenderer.invoke('ig:load-state'),
    saveState: (state) => ipcRenderer.invoke('ig:save-state', state),
    saveReport: (input) => ipcRenderer.invoke('ig:save-report', input),
  },
})
