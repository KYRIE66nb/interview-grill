const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ig', {
  version: '0.1.0',
  storage: {
    loadState: () => ipcRenderer.invoke('ig:load-state'),
    saveState: (state) => ipcRenderer.invoke('ig:save-state', state),
    saveReport: (input) => ipcRenderer.invoke('ig:save-report', input),
    exportDailyLesson: (input) => ipcRenderer.invoke('ig:export-daily-lesson', input),
    exportMarkdown: (input) => ipcRenderer.invoke('ig:export-markdown', input),
    readMarkdown: (input) => ipcRenderer.invoke('ig:read-markdown', input),
    inspectPath: (input) => ipcRenderer.invoke('ig:inspect-path', input),
    updateReminders: (input) => ipcRenderer.invoke('ig:update-reminders', input),
    onReminderNavigate: (callback) => {
      const handler = (_event, payload) => callback(payload)
      ipcRenderer.on('ig:reminder-navigate', handler)
      return () => ipcRenderer.removeListener('ig:reminder-navigate', handler)
    },
  },
})
