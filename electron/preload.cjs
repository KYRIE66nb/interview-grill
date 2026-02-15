const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('ig', {
  version: '0.0.1',
})
