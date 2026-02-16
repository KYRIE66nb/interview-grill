import type {
  AppSettings,
  ContextImportState,
  DailyModeId,
  DailyTask,
  DailyTaskReview,
  DataSource,
  MistakeErrorType,
  MistakeItem,
  MistakeSourceMode,
  MistakeStatus,
  Message,
  Mode,
  ModeProgress,
  ReminderConfig,
  ReminderId,
  ReminderSettings,
  ReviewReport,
  SrsState,
  Session,
  SessionModeConfig,
  StorageMeta,
} from './types'
import { makeId, newSession, newStorageMeta } from './seed'
import { toDateKey } from './core/dailyLesson'

const LOCAL_KEY = 'ig.state.v2'
const LEGACY_KEY = 'ig.sessions.v1'
const VERSION = 2

export type PersistedState = {
  version: number
  sessions: Session[]
  meta: StorageMeta
}

type SaveReportResult = {
  canceled?: boolean
  path?: string
  error?: string
}

type ExportLessonResult = {
  path?: string
  error?: string
}

type ReadMarkdownResult = {
  exists: boolean
  path?: string
  content: string
  error?: string
}

type InspectImportResult = {
  exists: boolean
  fileCount: number
  error?: string
}

function isMode(value: unknown): value is Mode {
  return value === 'chat' || value === 'drill' || value === 'mock' || value === 'luogu' || value === 'lanqiao'
}

function isDataSource(value: unknown): value is DataSource {
  return value === 'paste' || value === 'pdf' || value === 'repo'
}

function normalizeLegacyAssistantText(text: string): string {
  if (
    text ===
    'Choose a mode, paste your resume/project context, then start. Mock mode runs a 15-minute Tencent/ByteDance intern flow.'
  ) {
    return '先选择模式，再粘贴简历/项目上下文，然后开始。模拟面试模式会运行 15 分钟腾讯/字节风格流程。'
  }
  return text
}

function normalizeMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const item = entry as Partial<Message>
      const text = typeof item.text === 'string' ? item.text : ''
      const role = item.role === 'assistant' ? 'assistant' : 'user'
      return {
        id: typeof item.id === 'string' ? item.id : makeId('m'),
        role,
        text: role === 'assistant' ? normalizeLegacyAssistantText(text) : text,
        ts: typeof item.ts === 'number' ? item.ts : Date.now(),
      }
    })
}

function emptyDailyReview(): DailyTaskReview {
  return {
    thinking: '',
    pitfall: '',
    complexity: '',
    template: '',
  }
}

function isDailyModeId(value: unknown): value is DailyModeId {
  return value === 'luogu' || value === 'lanqiao'
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isReminderId(value: unknown): value is ReminderId {
  return value === 'lesson408' || value === 'luogu' || value === 'lanqiao'
}

function isMistakeSourceMode(value: unknown): value is MistakeSourceMode {
  return value === '408' || value === 'luogu' || value === 'lanqiao' || value === 'interview'
}

function isMistakeErrorType(value: unknown): value is MistakeErrorType {
  return (
    value === 'concept' ||
    value === 'boundary' ||
    value === 'complexity' ||
    value === 'implementation' ||
    value === 'careless' ||
    value === 'unknown' ||
    value === 'expression'
  )
}

function isMistakeStatus(value: unknown): value is MistakeStatus {
  return value === 'open' || value === 'reviewed' || value === 'fixed'
}

function normalizeModeConfig(value: unknown, fallback: SessionModeConfig): SessionModeConfig {
  if (!value || typeof value !== 'object') return fallback
  const config = value as Partial<SessionModeConfig>
  const planType = config.lanqiaoPlanType === 'topic' ? 'topic' : 'daily'
  const difficulty =
    config.lanqiaoDifficulty === 'easy' ||
    config.lanqiaoDifficulty === 'medium' ||
    config.lanqiaoDifficulty === 'hard' ||
    config.lanqiaoDifficulty === 'all'
      ? config.lanqiaoDifficulty
      : 'all'

  return {
    luoguSourceId: typeof config.luoguSourceId === 'string' && config.luoguSourceId.trim() ? config.luoguSourceId : fallback.luoguSourceId,
    lanqiaoPlanType: planType,
    lanqiaoTopic: typeof config.lanqiaoTopic === 'string' && config.lanqiaoTopic.trim() ? config.lanqiaoTopic : fallback.lanqiaoTopic,
    lanqiaoDifficulty: difficulty,
  }
}

function normalizeDailyReview(value: unknown): DailyTaskReview {
  if (!value || typeof value !== 'object') return emptyDailyReview()
  const review = value as Partial<DailyTaskReview>
  return {
    thinking: typeof review.thinking === 'string' ? review.thinking : '',
    pitfall: typeof review.pitfall === 'string' ? review.pitfall : '',
    complexity: typeof review.complexity === 'string' ? review.complexity : '',
    template: typeof review.template === 'string' ? review.template : '',
  }
}

function normalizeDailyTask(value: unknown): DailyTask | null {
  if (!value || typeof value !== 'object') return null
  const task = value as Partial<DailyTask>
  if (typeof task.taskId !== 'string' || !task.taskId.trim()) return null
  if (typeof task.title !== 'string' || !task.title.trim()) return null
  if (typeof task.difficulty !== 'string' || !task.difficulty.trim()) return null
  return {
    taskId: task.taskId,
    title: task.title,
    difficulty: task.difficulty,
    url: typeof task.url === 'string' ? task.url : undefined,
    topic: typeof task.topic === 'string' ? task.topic : undefined,
    status: task.status === 'done' ? 'done' : 'todo',
    note: typeof task.note === 'string' ? task.note : '',
    review: normalizeDailyReview(task.review),
  }
}

function normalizeModeProgress(value: unknown, modeId: DailyModeId, dateKey: string): ModeProgress | null {
  if (!value || typeof value !== 'object') return null
  const progress = value as Partial<ModeProgress>
  const tasks = Array.isArray(progress.tasks) ? progress.tasks.map((task) => normalizeDailyTask(task)).filter(Boolean) as DailyTask[] : []
  if (tasks.length === 0) return null
  const totalCount = tasks.length
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const difficulty =
    progress.difficulty === 'all' || progress.difficulty === 'easy' || progress.difficulty === 'medium' || progress.difficulty === 'hard'
      ? progress.difficulty
      : undefined

  return {
    modeId,
    dateKey,
    sourceId: typeof progress.sourceId === 'string' && progress.sourceId.trim() ? progress.sourceId : `${modeId}-default`,
    sourceTitle: typeof progress.sourceTitle === 'string' && progress.sourceTitle.trim() ? progress.sourceTitle : '内置题单',
    generatedAt: typeof progress.generatedAt === 'number' && Number.isFinite(progress.generatedAt) ? progress.generatedAt : Date.now(),
    updatedAt: typeof progress.updatedAt === 'number' && Number.isFinite(progress.updatedAt) ? progress.updatedAt : Date.now(),
    totalCount: typeof progress.totalCount === 'number' && Number.isFinite(progress.totalCount) ? progress.totalCount : totalCount,
    doneCount: typeof progress.doneCount === 'number' && Number.isFinite(progress.doneCount) ? progress.doneCount : doneCount,
    notes: typeof progress.notes === 'string' ? progress.notes : '',
    planType: progress.planType === 'topic' ? 'topic' : progress.planType === 'daily' ? 'daily' : undefined,
    topic: typeof progress.topic === 'string' ? progress.topic : undefined,
    difficulty,
    tasks,
  }
}

function createEmptyDailyProgress(): StorageMeta['dailyProgress'] {
  return {
    luogu: {},
    lanqiao: {},
  }
}

function normalizeSrs(value: unknown, fallbackDateKey: string): SrsState {
  if (!value || typeof value !== 'object') {
    return {
      intervalDays: 1,
      ease: 2.5,
      dueDate: fallbackDateKey,
      reviewCount: 0,
    }
  }

  const srs = value as Partial<SrsState>
  const intervalDays =
    typeof srs.intervalDays === 'number' && Number.isFinite(srs.intervalDays) ? Math.max(1, Math.round(srs.intervalDays)) : 1
  const ease = typeof srs.ease === 'number' && Number.isFinite(srs.ease) ? Math.max(1.3, Math.min(3.5, srs.ease)) : 2.5
  const dueDate = isDateKey(srs.dueDate) ? srs.dueDate : fallbackDateKey
  const reviewCount = typeof srs.reviewCount === 'number' && Number.isFinite(srs.reviewCount) ? Math.max(0, Math.round(srs.reviewCount)) : 0

  return {
    intervalDays,
    ease,
    dueDate,
    reviewCount,
    lastReviewedAt: typeof srs.lastReviewedAt === 'number' && Number.isFinite(srs.lastReviewedAt) ? srs.lastReviewedAt : undefined,
  }
}

function normalizeMistakeItem(value: unknown): MistakeItem | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<MistakeItem>
  if (typeof item.id !== 'string' || !item.id.trim()) return null
  if (!isMistakeSourceMode(item.sourceMode)) return null
  if (typeof item.prompt !== 'string' || !item.prompt.trim()) return null

  const date = isDateKey(item.date) ? item.date : toDateKey(new Date(typeof item.createdAt === 'number' ? item.createdAt : Date.now()))
  const createdAt = typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : Date.now()
  const updatedAt = typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : createdAt
  const tags = Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0) : []
  const severityRaw = typeof item.severity === 'number' && Number.isFinite(item.severity) ? Math.round(item.severity) : 3
  const severity = Math.max(1, Math.min(5, severityRaw)) as MistakeItem['severity']

  return {
    id: item.id,
    createdAt,
    updatedAt,
    date,
    sourceMode: item.sourceMode,
    topic: typeof item.topic === 'string' ? item.topic : '未分类',
    tags,
    prompt: item.prompt,
    myAnswer: typeof item.myAnswer === 'string' ? item.myAnswer : undefined,
    expected: typeof item.expected === 'string' ? item.expected : undefined,
    errorType: isMistakeErrorType(item.errorType) ? item.errorType : 'unknown',
    severity,
    notes: typeof item.notes === 'string' ? item.notes : '',
    status: isMistakeStatus(item.status) ? item.status : 'open',
    srs: normalizeSrs(item.srs, date),
  }
}

function normalizeReminderTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? value : fallback
}

function normalizeReminderConfig(value: unknown, fallback: ReminderConfig): ReminderConfig {
  if (!value || typeof value !== 'object') return fallback
  const config = value as Partial<ReminderConfig>
  return {
    id: isReminderId(config.id) ? config.id : fallback.id,
    title: typeof config.title === 'string' && config.title.trim() ? config.title : fallback.title,
    enabled: typeof config.enabled === 'boolean' ? config.enabled : fallback.enabled,
    time: normalizeReminderTime(config.time, fallback.time),
  }
}

function normalizeReminderSettings(value: unknown, fallback: ReminderSettings): ReminderSettings {
  if (!value || typeof value !== 'object') return fallback
  const settings = value as Partial<ReminderSettings>
  return {
    lesson408: normalizeReminderConfig(settings.lesson408, fallback.lesson408),
    luogu: normalizeReminderConfig(settings.luogu, fallback.luogu),
    lanqiao: normalizeReminderConfig(settings.lanqiao, fallback.lanqiao),
  }
}

function normalizeAppSettings(value: unknown, fallback: AppSettings): AppSettings {
  if (!value || typeof value !== 'object') return fallback
  const settings = value as Partial<AppSettings>
  return {
    autoJumpTodayTask: typeof settings.autoJumpTodayTask === 'boolean' ? settings.autoJumpTodayTask : fallback.autoJumpTodayTask,
  }
}

function normalizeReviewReport(value: unknown): ReviewReport | null {
  if (!value || typeof value !== 'object') return null
  const report = value as Partial<ReviewReport>
  if (!report.dimensions || typeof report.dimensions !== 'object') return null
  if (!Array.isArray(report.actionableImprovements) || !Array.isArray(report.tomorrowPracticePlan)) return null
  if (typeof report.overall !== 'number') return null
  return report as ReviewReport
}

function normalizeContextImport(value: unknown): ContextImportState | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<ContextImportState>
  if (!isDataSource(item.source)) return null
  if (typeof item.importedAt !== 'number' || !Number.isFinite(item.importedAt)) return null

  const wordCount = typeof item.wordCount === 'number' && Number.isFinite(item.wordCount) ? Math.max(0, Math.round(item.wordCount)) : 0
  const fileCount = typeof item.fileCount === 'number' && Number.isFinite(item.fileCount) ? Math.max(0, Math.round(item.fileCount)) : 0

  return {
    source: item.source,
    importedAt: item.importedAt,
    wordCount,
    fileCount,
    path: typeof item.path === 'string' ? item.path : undefined,
  }
}

function normalizeSession(value: unknown): Session {
  const fallback = newSession()
  if (!value || typeof value !== 'object') return fallback

  const session = value as Partial<Session>
  const messages = normalizeMessages(session.messages)
  const modeConfig = normalizeModeConfig(session.modeConfig, fallback.modeConfig)
  return {
    id: typeof session.id === 'string' ? session.id : fallback.id,
    title: typeof session.title === 'string' && session.title.trim() ? session.title : fallback.title,
    createdAt: typeof session.createdAt === 'number' ? session.createdAt : fallback.createdAt,
    updatedAt: typeof session.updatedAt === 'number' ? session.updatedAt : fallback.updatedAt,
    mode: isMode(session.mode) ? session.mode : fallback.mode,
    intensity:
      typeof session.intensity === 'number' ? Math.max(1, Math.min(10, Math.round(session.intensity))) : fallback.intensity,
    dataSource: isDataSource(session.dataSource) ? session.dataSource : fallback.dataSource,
    resumeText: typeof session.resumeText === 'string' ? session.resumeText : '',
    pdfPath: typeof session.pdfPath === 'string' ? session.pdfPath : undefined,
    repoPath: typeof session.repoPath === 'string' ? session.repoPath : undefined,
    contextImport: normalizeContextImport(session.contextImport),
    modeConfig,
    messages: messages.length ? messages : fallback.messages,
    reviewNotes: typeof session.reviewNotes === 'string' ? session.reviewNotes : '',
    mock: session.mock && typeof session.mock === 'object' ? (session.mock as Session['mock']) : null,
    reviewReport: normalizeReviewReport(session.reviewReport),
    lastSavedReportAt: typeof session.lastSavedReportAt === 'number' ? session.lastSavedReportAt : undefined,
  }
}

function normalizeMeta(value: unknown): StorageMeta {
  const fallback = newStorageMeta()
  if (!value || typeof value !== 'object') return fallback
  const meta = value as Partial<StorageMeta>
  const dailyLesson = meta.dailyLesson
  const dailyProgress = meta.dailyProgress
  let topicOverride = ''
  let level: StorageMeta['dailyLesson']['level'] = fallback.dailyLesson.level
  const completedByDate: Record<string, number> = {}
  const normalizedDailyProgress = createEmptyDailyProgress()

  if (dailyLesson && typeof dailyLesson === 'object') {
    const dailyLessonState = dailyLesson as Partial<StorageMeta['dailyLesson']>
    if (typeof dailyLessonState.topicOverride === 'string') {
      topicOverride = dailyLessonState.topicOverride
    }
    if (dailyLessonState.completedByDate && typeof dailyLessonState.completedByDate === 'object') {
      for (const [dateKey, timestamp] of Object.entries(dailyLessonState.completedByDate)) {
        if (isDateKey(dateKey) && typeof timestamp === 'number' && Number.isFinite(timestamp)) {
          completedByDate[dateKey] = timestamp
        }
      }
    }
    if (
      dailyLessonState.level === 'L0' ||
      dailyLessonState.level === 'L1' ||
      dailyLessonState.level === 'L2' ||
      dailyLessonState.level === 'L3'
    ) {
      level = dailyLessonState.level
    }
  }

  if (dailyProgress && typeof dailyProgress === 'object') {
    for (const [modeId, byDate] of Object.entries(dailyProgress)) {
      if (!isDailyModeId(modeId) || !byDate || typeof byDate !== 'object') continue
      for (const [dateKey, progress] of Object.entries(byDate as Record<string, unknown>)) {
        if (!isDateKey(dateKey)) continue
        const normalized = normalizeModeProgress(progress, modeId, dateKey)
        if (normalized) {
          normalizedDailyProgress[modeId][dateKey] = normalized
        }
      }
    }
  }

  const mistakes = Array.isArray(meta.mistakes)
    ? meta.mistakes.map((item) => normalizeMistakeItem(item)).filter((item): item is MistakeItem => Boolean(item))
    : []

  const reminders = normalizeReminderSettings(meta.reminders, fallback.reminders)
  const appSettings = normalizeAppSettings(meta.appSettings, fallback.appSettings)

  return {
    backendTopicCursor: typeof meta.backendTopicCursor === 'number' ? Math.max(0, Math.round(meta.backendTopicCursor)) : 0,
    dailyLesson: {
      topicOverride,
      level,
      completedByDate,
    },
    dailyProgress: normalizedDailyProgress,
    mistakes,
    reminders,
    appSettings,
  }
}

function normalizeState(value: unknown): PersistedState {
  if (Array.isArray(value)) {
    const sessions = value.map((entry) => normalizeSession(entry))
    return { version: VERSION, sessions, meta: newStorageMeta() }
  }

  if (!value || typeof value !== 'object') {
    return { version: VERSION, sessions: [newSession()], meta: newStorageMeta() }
  }

  const state = value as Partial<PersistedState>
  const sessions = Array.isArray(state.sessions) ? state.sessions.map((entry) => normalizeSession(entry)) : [newSession()]
  return {
    version: typeof state.version === 'number' ? state.version : VERSION,
    sessions: sessions.length ? sessions : [newSession()],
    meta: normalizeMeta(state.meta),
  }
}

function readLocalState(): PersistedState {
  try {
    const current = localStorage.getItem(LOCAL_KEY)
    if (current) return normalizeState(JSON.parse(current))

    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) return normalizeState(JSON.parse(legacy))
  } catch {
    // Ignore parse errors and continue with default state.
  }
  return { version: VERSION, sessions: [newSession()], meta: newStorageMeta() }
}

function writeLocalState(state: PersistedState) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
}

function desktopStorage() {
  if (typeof window === 'undefined') return undefined
  return window.ig?.storage
}

export function loadCachedState(): PersistedState {
  return readLocalState()
}

export async function loadState(): Promise<PersistedState> {
  const localState = readLocalState()
  const bridge = desktopStorage()
  if (!bridge) return localState

  try {
    const remote = await bridge.loadState()
    if (!remote) return localState
    const normalized = normalizeState(remote)
    writeLocalState(normalized)
    return normalized
  } catch {
    return localState
  }
}

export async function saveState(state: PersistedState) {
  writeLocalState(state)
  const bridge = desktopStorage()
  if (!bridge) return
  try {
    await bridge.saveState(state)
  } catch {
    // Keep local browser persistence even if desktop write fails.
  }
}

export async function inspectImportPath(source: 'pdf' | 'repo', targetPath: string): Promise<InspectImportResult> {
  const path = targetPath.trim()
  if (!path) return { exists: false, fileCount: 0, error: '路径为空' }

  const bridge = desktopStorage()
  if (bridge?.inspectPath) {
    try {
      return await bridge.inspectPath({ source, targetPath: path })
    } catch (error) {
      return { exists: false, fileCount: 0, error: error instanceof Error ? error.message : '路径检查失败' }
    }
  }

  return { exists: source === 'pdf', fileCount: source === 'pdf' ? 1 : 0 }
}

export async function exportDailyLessonMarkdown(dateKey: string, markdown: string): Promise<ExportLessonResult> {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : toDateKey(new Date())
  const bridge = desktopStorage()

  if (bridge?.exportDailyLesson) {
    try {
      return await bridge.exportDailyLesson({ dateKey: safeDate, markdown })
    } catch (error) {
      return { error: error instanceof Error ? error.message : '导出每日小课失败' }
    }
  }

  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeDate}.md`
  anchor.click()
  URL.revokeObjectURL(url)
  return { path: anchor.download }
}

function sanitizeMarkdownFileName(fileName: string): string {
  const trimmed = fileName.trim() || `${toDateKey(new Date())}.md`
  const raw = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
  const safe = raw.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
  return safe || `${toDateKey(new Date())}.md`
}

export async function exportMarkdownFile(fileName: string, markdown: string): Promise<ExportLessonResult> {
  const safeFileName = sanitizeMarkdownFileName(fileName)
  const bridge = desktopStorage()

  if (bridge?.exportMarkdown) {
    try {
      return await bridge.exportMarkdown({ fileName: safeFileName, markdown })
    } catch (error) {
      return { error: error instanceof Error ? error.message : '导出 Markdown 失败' }
    }
  }

  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeFileName
  anchor.click()
  URL.revokeObjectURL(url)
  return { path: anchor.download }
}

export async function readMarkdownFile(fileName: string): Promise<ReadMarkdownResult> {
  const safeFileName = sanitizeMarkdownFileName(fileName)
  const bridge = desktopStorage()
  if (!bridge?.readMarkdown) {
    return { exists: false, content: '' }
  }

  try {
    return await bridge.readMarkdown({ fileName: safeFileName })
  } catch (error) {
    return { exists: false, content: '', error: error instanceof Error ? error.message : '读取 Markdown 失败' }
  }
}

export async function syncReminderSettings(reminders: unknown): Promise<{ ok: boolean; error?: string }> {
  const bridge = desktopStorage()
  if (!bridge?.updateReminders) return { ok: true }
  try {
    return await bridge.updateReminders({ reminders })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '同步提醒失败' }
  }
}

export function subscribeReminderNavigation(
  callback: (payload: { target: 'lesson408' | 'luogu' | 'lanqiao' }) => void,
): () => void {
  const bridge = desktopStorage()
  if (!bridge?.onReminderNavigate) return () => {}
  return bridge.onReminderNavigate(callback)
}

function reportFileName(session: Session): string {
  const stamp = new Date(session.updatedAt).toISOString().replace(/[:.]/g, '-')
  const safeTitle = session.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
  return `interview-grill-${safeTitle || session.id}-${stamp}.json`
}

export async function saveSessionReport(session: Session): Promise<SaveReportResult> {
  const payload = {
    sessionId: session.id,
    title: session.title,
    mode: session.mode,
    generatedAt: Date.now(),
    reviewNotes: session.reviewNotes,
    reviewReport: session.reviewReport,
    mock: session.mock,
    messages: session.messages,
  }

  const bridge = desktopStorage()
  if (bridge) {
    try {
      return await bridge.saveReport({
        defaultFileName: reportFileName(session),
        payload,
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : '保存报告失败' }
    }
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = reportFileName(session)
  anchor.click()
  URL.revokeObjectURL(url)
  return { path: anchor.download }
}
