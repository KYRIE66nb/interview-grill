import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'

let mainWindow: BrowserWindow | null = null

function getIndexUrl() {
  if (app.isPackaged) {
    // When packaged, Vite output is copied to `dist/renderer`.
    return `file://${path.join(__dirname, '../renderer/index.html')}`
  }

  // Dev server
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (!devServerUrl) {
    throw new Error('Missing VITE_DEV_SERVER_URL')
  }
  return devServerUrl
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0b0f14',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../../electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  await mainWindow.loadURL(getIndexUrl())
}

app.whenReady().then(() => {
  void createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
