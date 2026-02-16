import { makeId } from '../seed'
import type { MistakeErrorType, MistakeItem, MistakeSourceMode } from '../types'
import { toDateKey } from './dailyLesson'

export const ERROR_TYPE_LABELS: Record<MistakeErrorType, string> = {
  concept: '概念不清',
  boundary: '边界条件',
  complexity: '复杂度判断',
  implementation: '实现细节',
  careless: '粗心失误',
  unknown: '不会做',
  expression: '表达不清',
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00+08:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return toDateKey(date)
}

export function createMistakeItem(input: {
  sourceMode: MistakeSourceMode
  topic: string
  prompt: string
  tags?: string[]
  myAnswer?: string
  expected?: string
  errorType?: MistakeErrorType
  severity?: number
  notes?: string
  dateKey?: string
}): MistakeItem {
  const now = Date.now()
  const dateKey = input.dateKey ?? toDateKey(new Date())

  return {
    id: makeId('mistake'),
    createdAt: now,
    updatedAt: now,
    date: dateKey,
    sourceMode: input.sourceMode,
    topic: input.topic.trim() || '未分类',
    tags: (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    prompt: input.prompt.trim(),
    myAnswer: input.myAnswer?.trim() || undefined,
    expected: input.expected?.trim() || undefined,
    errorType: input.errorType ?? 'unknown',
    severity: Math.max(1, Math.min(5, Math.round(input.severity ?? 3))) as MistakeItem['severity'],
    notes: input.notes?.trim() ?? '',
    status: 'open',
    srs: {
      intervalDays: 1,
      ease: 2.5,
      dueDate: addDays(dateKey, 1),
      reviewCount: 0,
    },
  }
}

function clampEase(value: number): number {
  return Math.max(1.3, Math.min(3.5, value))
}

export function applySrsReview(item: MistakeItem, rating: ReviewRating, todayDateKey: string): MistakeItem {
  const now = Date.now()
  let interval = item.srs.intervalDays
  let ease = item.srs.ease

  if (rating === 'again') {
    interval = 1
    ease = clampEase(ease - 0.2)
  } else if (rating === 'hard') {
    interval = Math.max(1, Math.round(interval * 1.2))
    ease = clampEase(ease - 0.15)
  } else if (rating === 'good') {
    interval = Math.max(1, Math.round(interval * ease))
  } else {
    interval = Math.max(2, Math.round(interval * (ease + 0.3)))
    ease = clampEase(ease + 0.15)
  }

  return {
    ...item,
    updatedAt: now,
    status: rating === 'again' ? 'open' : 'reviewed',
    srs: {
      intervalDays: interval,
      ease,
      dueDate: addDays(todayDateKey, interval),
      lastReviewedAt: now,
      reviewCount: item.srs.reviewCount + 1,
    },
  }
}

export function buildWeaknessProfile(mistakes: MistakeItem[], todayDateKey: string): {
  topTopics: string[]
  topErrorTypes: MistakeErrorType[]
} {
  const since = addDays(todayDateKey, -6)
  const recent = mistakes.filter((item) => item.date >= since && item.date <= todayDateKey)

  const topicCounter = new Map<string, number>()
  const typeCounter = new Map<MistakeErrorType, number>()

  recent.forEach((item) => {
    const topic = item.topic.trim() || '未分类'
    topicCounter.set(topic, (topicCounter.get(topic) ?? 0) + 1)
    typeCounter.set(item.errorType, (typeCounter.get(item.errorType) ?? 0) + 1)
  })

  const topTopics = [...topicCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic)

  const topErrorTypes = [...typeCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type)

  return {
    topTopics,
    topErrorTypes,
  }
}

export function aggregateMistakeTop(mistakes: MistakeItem[], dateKey: string, limit: number = 3): string[] {
  const today = mistakes.filter((item) => item.date === dateKey)
  const pool = today.length > 0 ? today : mistakes

  const scoreByTopic = new Map<string, number>()
  pool.forEach((item) => {
    const topic = item.topic.trim() || '未分类'
    const weight = item.severity + (item.status === 'fixed' ? 0 : 1)
    scoreByTopic.set(topic, (scoreByTopic.get(topic) ?? 0) + weight)
  })

  return [...scoreByTopic.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic, score], index) => `${index + 1}. ${topic}（风险分 ${score}）`)
}

export function filterMistakes(
  mistakes: MistakeItem[],
  filters: {
    sourceMode?: MistakeSourceMode | 'all'
    errorType?: MistakeErrorType | 'all'
    minSeverity?: number
    tag?: string
    fromDate?: string
    toDate?: string
    status?: MistakeItem['status'] | 'all'
  },
): MistakeItem[] {
  return mistakes.filter((item) => {
    if (filters.sourceMode && filters.sourceMode !== 'all' && item.sourceMode !== filters.sourceMode) return false
    if (filters.errorType && filters.errorType !== 'all' && item.errorType !== filters.errorType) return false
    if (filters.status && filters.status !== 'all' && item.status !== filters.status) return false
    if (typeof filters.minSeverity === 'number' && item.severity < filters.minSeverity) return false
    if (filters.tag && filters.tag.trim()) {
      const query = filters.tag.trim().toLowerCase()
      const matchTag = item.tags.some((tag) => tag.toLowerCase().includes(query))
      const matchTopic = item.topic.toLowerCase().includes(query)
      if (!matchTag && !matchTopic) return false
    }
    if (filters.fromDate && item.date < filters.fromDate) return false
    if (filters.toDate && item.date > filters.toDate) return false
    return true
  })
}

export function summarizeReviewPressure(mistakes: MistakeItem[], todayDateKey: string): { dueToday: number; dueNext7Days: number } {
  const next7 = addDays(todayDateKey, 7)
  let dueToday = 0
  let dueNext7Days = 0

  mistakes.forEach((item) => {
    if (item.status === 'fixed') return
    if (item.srs.dueDate <= todayDateKey) dueToday += 1
    if (item.srs.dueDate > todayDateKey && item.srs.dueDate <= next7) dueNext7Days += 1
  })

  return { dueToday, dueNext7Days }
}
