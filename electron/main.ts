import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

let mainWindow: BrowserWindow | null = null
const STATE_FILE = 'ig-state.json'

type SaveReportInput = {
  defaultFileName?: string
  payload: unknown
}

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

function statePath() {
  return path.join(app.getPath('userData'), STATE_FILE)
}

async function readStateFromDisk() {
  try {
    const raw = await fs.readFile(statePath(), 'utf8')
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

async function writeStateToDisk(state: unknown) {
  const target = statePath()
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, JSON.stringify(state, null, 2), 'utf8')
}

function registerIpcHandlers() {
  ipcMain.handle('ig:load-state', async () => {
    return readStateFromDisk()
  })

  ipcMain.handle('ig:save-state', async (_event, state: unknown) => {
    await writeStateToDisk(state)
  })

  ipcMain.handle('ig:save-report', async (_event, input: SaveReportInput) => {
    const defaultName = input?.defaultFileName || `interview-grill-report-${Date.now()}.json`
    const options = {
      title: 'Save Interview Grill report',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    }

    const targetWindow = mainWindow ?? BrowserWindow.getFocusedWindow()
    const result = targetWindow ? await dialog.showSaveDialog(targetWindow, options) : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) return { canceled: true }

    await fs.writeFile(result.filePath, JSON.stringify(input.payload, null, 2), 'utf8')
    return { path: result.filePath }
  })
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
  registerIpcHandlers()
  void createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
