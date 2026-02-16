import { Notification, app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
const STATE_FILE = 'ig-state.json'
const DAILY_LESSON_EXPORT_DIR =
  process.env.IG_DAILY_LESSON_EXPORT_DIR || '/Users/zhishixuebao/.openclaw/workspace/notes/daily-github-learning'

const DEFAULT_REMINDERS: ReminderSettings = {
  lesson408: {
    id: 'lesson408',
    title: '408 每日小课',
    enabled: true,
    time: '09:00',
  },
  luogu: {
    id: 'luogu',
    title: '洛谷题单',
    enabled: true,
    time: '14:00',
  },
  lanqiao: {
    id: 'lanqiao',
    title: '蓝桥刷题',
    enabled: true,
    time: '20:00',
  },
}

let reminderSettings: ReminderSettings = DEFAULT_REMINDERS
let reminderTimer: NodeJS.Timeout | null = null
const reminderFireHistory: Record<ReminderId, string> = {
  lesson408: '',
  luogu: '',
  lanqiao: '',
}

type SaveReportInput = {
  defaultFileName?: string
  payload: unknown
}

type DailyLessonExportInput = {
  dateKey?: string
  markdown?: string
}

type ExportMarkdownInput = {
  fileName?: string
  markdown?: string
}

type ReadMarkdownInput = {
  fileName?: string
}

type InspectPathInput = {
  source?: 'pdf' | 'repo'
  targetPath?: string
}

type ReminderId = 'lesson408' | 'luogu' | 'lanqiao'
type ReminderTarget = 'lesson408' | 'luogu' | 'lanqiao'

type ReminderConfig = {
  id: ReminderId
  title: string
  enabled: boolean
  time: string
}

type ReminderSettings = {
  lesson408: ReminderConfig
  luogu: ReminderConfig
  lanqiao: ReminderConfig
}

function shanghaiDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function sanitizeMarkdownFileName(fileName: string): string {
  const trimmed = fileName.trim() || `${shanghaiDateKey(new Date())}.md`
  const withExt = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
  const safe = withExt.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
  return safe || `${shanghaiDateKey(new Date())}.md`
}

function shanghaiTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function normalizeReminderTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? value : fallback
}

function normalizeReminderSettings(input: unknown): ReminderSettings {
  if (!input || typeof input !== 'object') return DEFAULT_REMINDERS
  const value = input as Partial<ReminderSettings>

  function normalizeOne(id: ReminderId): ReminderConfig {
    const fallback = DEFAULT_REMINDERS[id]
    const entry = value[id]
    if (!entry || typeof entry !== 'object') return fallback
    const raw = entry as Partial<ReminderConfig>
    return {
      id,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : fallback.title,
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
      time: normalizeReminderTime(raw.time, fallback.time),
    }
  }

  return {
    lesson408: normalizeOne('lesson408'),
    luogu: normalizeOne('luogu'),
    lanqiao: normalizeOne('lanqiao'),
  }
}

function reminderTargetLabel(target: ReminderTarget): string {
  if (target === 'lesson408') return '408 每日小课'
  if (target === 'luogu') return '洛谷题单'
  return '蓝桥刷题'
}

function notifyReminder(target: ReminderTarget) {
  const title = reminderTargetLabel(target)
  const notification = new Notification({
    title: `Interview Grill 提醒：${title}`,
    body: '点击即可跳转到对应页面继续今天任务。',
    silent: false,
  })
  notification.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('ig:reminder-navigate', { target })
  })
  notification.show()
}

function checkReminderTick() {
  const now = new Date()
  const dateKey = shanghaiDateKey(now)
  const hhmm = shanghaiTime(now)

  ;(['lesson408', 'luogu', 'lanqiao'] as ReminderId[]).forEach((id) => {
    const config = reminderSettings[id]
    if (!config.enabled) return
    if (config.time !== hhmm) return
    const historyKey = `${dateKey}-${hhmm}`
    if (reminderFireHistory[id] === historyKey) return
    reminderFireHistory[id] = historyKey
    notifyReminder(id)
  })
}

function startReminderScheduler() {
  if (reminderTimer) {
    clearInterval(reminderTimer)
  }
  reminderTimer = setInterval(checkReminderTick, 30_000)
  checkReminderTick()
}

async function countRepoFiles(rootPath: string, maxFiles: number = 8000): Promise<number> {
  type DirentLite = { name: string; isFile: () => boolean; isDirectory: () => boolean }
  const queue: string[] = [rootPath]
  let count = 0

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) continue

    let entries: DirentLite[]
    try {
      entries = (await fs.readdir(current, { withFileTypes: true })) as unknown as DirentLite[]
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isFile()) {
        count += 1
        if (count >= maxFiles) return count
        continue
      }

      if (!entry.isDirectory()) continue
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'release') continue
      queue.push(fullPath)
    }
  }

  return count
}

function getIndexUrl() {
  if (app.isPackaged) {
    const indexPath = path.join(__dirname, '../index.html')
    return pathToFileURL(indexPath).toString()
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

async function hydrateRemindersFromState() {
  const state = await readStateFromDisk()
  if (!state || typeof state !== 'object') {
    reminderSettings = DEFAULT_REMINDERS
    return
  }
  const meta = (state as { meta?: unknown }).meta
  if (!meta || typeof meta !== 'object') {
    reminderSettings = DEFAULT_REMINDERS
    return
  }
  const reminders = (meta as { reminders?: unknown }).reminders
  reminderSettings = normalizeReminderSettings(reminders)
}

function registerIpcHandlers() {
  ipcMain.handle('ig:load-state', async () => {
    return readStateFromDisk()
  })

  ipcMain.handle('ig:save-state', async (_event, state: unknown) => {
    await writeStateToDisk(state)
    if (state && typeof state === 'object') {
      const reminders = (state as { meta?: { reminders?: unknown } }).meta?.reminders
      if (reminders) {
        reminderSettings = normalizeReminderSettings(reminders)
      }
    }
  })

  ipcMain.handle('ig:save-report', async (_event, input: SaveReportInput) => {
    const defaultName = input?.defaultFileName || `interview-grill-report-${Date.now()}.json`
    const options = {
      title: '保存 Interview Grill 报告',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    }

    const targetWindow = mainWindow ?? BrowserWindow.getFocusedWindow()
    const result = targetWindow ? await dialog.showSaveDialog(targetWindow, options) : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) return { canceled: true }

    await fs.writeFile(result.filePath, JSON.stringify(input.payload, null, 2), 'utf8')
    return { path: result.filePath }
  })

  ipcMain.handle('ig:export-daily-lesson', async (_event, input: DailyLessonExportInput) => {
    const dateKey = typeof input?.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)
      ? input.dateKey
      : shanghaiDateKey(new Date())

    const markdown = typeof input?.markdown === 'string' ? input.markdown : ''
    const targetPath = path.join(DAILY_LESSON_EXPORT_DIR, `${dateKey}.md`)

    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, markdown, 'utf8')

    return { path: targetPath }
  })

  ipcMain.handle('ig:export-markdown', async (_event, input: ExportMarkdownInput) => {
    const fileName = sanitizeMarkdownFileName(typeof input?.fileName === 'string' ? input.fileName : '')
    const markdown = typeof input?.markdown === 'string' ? input.markdown : ''
    const targetPath = path.join(DAILY_LESSON_EXPORT_DIR, fileName)

    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, markdown, 'utf8')

    return { path: targetPath }
  })

  ipcMain.handle('ig:read-markdown', async (_event, input: ReadMarkdownInput) => {
    const fileName = sanitizeMarkdownFileName(typeof input?.fileName === 'string' ? input.fileName : '')
    const targetPath = path.join(DAILY_LESSON_EXPORT_DIR, fileName)
    try {
      const content = await fs.readFile(targetPath, 'utf8')
      return { exists: true, path: targetPath, content }
    } catch {
      return { exists: false, path: targetPath, content: '' }
    }
  })

  ipcMain.handle('ig:update-reminders', async (_event, input: { reminders?: unknown }) => {
    reminderSettings = normalizeReminderSettings(input?.reminders)
    return { ok: true }
  })

  ipcMain.handle('ig:inspect-path', async (_event, input: InspectPathInput) => {
    const source = input?.source
    const targetPath = typeof input?.targetPath === 'string' ? input.targetPath.trim() : ''
    if (!targetPath || (source !== 'pdf' && source !== 'repo')) {
      return { exists: false, fileCount: 0, error: '路径或来源无效' }
    }

    try {
      const stat = await fs.stat(targetPath)
      if (source === 'pdf') {
        return { exists: stat.isFile(), fileCount: stat.isFile() ? 1 : 0 }
      }
      if (!stat.isDirectory()) {
        return { exists: false, fileCount: 0, error: '仓库路径不是目录' }
      }

      const fileCount = await countRepoFiles(targetPath)
      return { exists: true, fileCount }
    } catch (error) {
      return {
        exists: false,
        fileCount: 0,
        error: error instanceof Error ? error.message : '路径检查失败',
      }
    }
  })
}

async function createWindow() {
  const preloadPath = app.isPackaged
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, '../../electron/preload.cjs')

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0b0f14',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: preloadPath,
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
  void hydrateRemindersFromState().then(() => {
    startReminderScheduler()
  })
  void createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (reminderTimer) {
    clearInterval(reminderTimer)
    reminderTimer = null
  }
})
