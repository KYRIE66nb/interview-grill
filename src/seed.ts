import type { Session } from './types'

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function newSession(): Session {
  const now = Date.now()
  return {
    id: makeId('s'),
    title: 'Untitled Session',
    createdAt: now,
    updatedAt: now,
    mode: 'drill',
    intensity: 6,
    dataSource: 'paste',
    resumeText: '',
    messages: [
      {
        id: makeId('m'),
        role: 'assistant',
        text: "Paste your resume or choose a source, then hit 'Start Drill'.",
        ts: now,
      },
    ],
    reviewNotes: '',
  }
}
