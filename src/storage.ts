import type { DataSource, Message, Mode, ReviewReport, Session, StorageMeta } from './types'
import { makeId, newSession, newStorageMeta } from './seed'

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

function isMode(value: unknown): value is Mode {
  return value === 'chat' || value === 'drill' || value === 'mock'
}

function isDataSource(value: unknown): value is DataSource {
  return value === 'paste' || value === 'pdf' || value === 'repo'
}

function normalizeMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const item = entry as Partial<Message>
      return {
        id: typeof item.id === 'string' ? item.id : makeId('m'),
        role: item.role === 'assistant' ? 'assistant' : 'user',
        text: typeof item.text === 'string' ? item.text : '',
        ts: typeof item.ts === 'number' ? item.ts : Date.now(),
      }
    })
}

function normalizeReviewReport(value: unknown): ReviewReport | null {
  if (!value || typeof value !== 'object') return null
  const report = value as Partial<ReviewReport>
  if (!report.dimensions || typeof report.dimensions !== 'object') return null
  if (!Array.isArray(report.actionableImprovements) || !Array.isArray(report.tomorrowPracticePlan)) return null
  if (typeof report.overall !== 'number') return null
  return report as ReviewReport
}

function normalizeSession(value: unknown): Session {
  const fallback = newSession()
  if (!value || typeof value !== 'object') return fallback

  const session = value as Partial<Session>
  const messages = normalizeMessages(session.messages)
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
    messages: messages.length ? messages : fallback.messages,
    reviewNotes: typeof session.reviewNotes === 'string' ? session.reviewNotes : '',
    mock: session.mock && typeof session.mock === 'object' ? (session.mock as Session['mock']) : null,
    reviewReport: normalizeReviewReport(session.reviewReport),
    lastSavedReportAt: typeof session.lastSavedReportAt === 'number' ? session.lastSavedReportAt : undefined,
  }
}

function normalizeMeta(value: unknown): StorageMeta {
  if (!value || typeof value !== 'object') return newStorageMeta()
  const meta = value as Partial<StorageMeta>
  return {
    backendTopicCursor: typeof meta.backendTopicCursor === 'number' ? Math.max(0, Math.round(meta.backendTopicCursor)) : 0,
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
      return { error: error instanceof Error ? error.message : 'Failed to save report' }
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
