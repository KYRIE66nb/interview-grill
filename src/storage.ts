import type { Session } from './types'

const KEY = 'ig.sessions.v1'

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Session[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveSessions(sessions: Session[]) {
  localStorage.setItem(KEY, JSON.stringify(sessions))
}
