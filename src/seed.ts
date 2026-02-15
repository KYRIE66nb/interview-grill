import type { Mode, Session, StorageMeta } from './types'

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function newStorageMeta(): StorageMeta {
  return { backendTopicCursor: 0 }
}

function modeLabel(mode: Mode) {
  if (mode === 'mock') return 'Mock Interview'
  if (mode === 'drill') return 'Drill'
  return 'Chat'
}

export function newSession(mode: Mode = 'mock'): Session {
  const now = Date.now()
  return {
    id: makeId('s'),
    title: `${modeLabel(mode)} ${new Date(now).toLocaleDateString()}`,
    createdAt: now,
    updatedAt: now,
    mode,
    intensity: 6,
    dataSource: 'paste',
    resumeText: '',
    messages: [
      {
        id: makeId('m'),
        role: 'assistant',
        text: "Choose a mode, paste your resume/project context, then start. Mock mode runs a 15-minute Tencent/ByteDance intern flow.",
        ts: now,
      },
    ],
    reviewNotes: '',
    mock: null,
    reviewReport: null,
  }
}
