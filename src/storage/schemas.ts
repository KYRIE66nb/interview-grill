import type { DailyModeId, MistakeItem, ReminderId, StorageMeta, DailyTask, ModeProgress } from '../types'

export function calcDoneCount(tasks: DailyTask[]): number {
  return tasks.filter((task) => task.status === 'done').length
}

export function withProgressCounts(progress: ModeProgress): ModeProgress {
  const totalCount = progress.tasks.length
  const doneCount = calcDoneCount(progress.tasks)
  return {
    ...progress,
    totalCount,
    doneCount,
    updatedAt: Date.now(),
  }
}

export function getModeProgress(meta: StorageMeta, modeId: DailyModeId, dateKey: string): ModeProgress | null {
  return meta.dailyProgress[modeId][dateKey] ?? null
}

export function setModeProgress(meta: StorageMeta, progress: ModeProgress): StorageMeta {
  const next = withProgressCounts(progress)
  return {
    ...meta,
    dailyProgress: {
      ...meta.dailyProgress,
      [progress.modeId]: {
        ...meta.dailyProgress[progress.modeId],
        [progress.dateKey]: next,
      },
    },
  }
}

export function updateModeProgress(
  meta: StorageMeta,
  modeId: DailyModeId,
  dateKey: string,
  updater: (progress: ModeProgress) => ModeProgress,
): StorageMeta {
  const current = getModeProgress(meta, modeId, dateKey)
  if (!current) return meta
  return setModeProgress(meta, updater(current))
}

export function updateTaskInProgress(
  meta: StorageMeta,
  modeId: DailyModeId,
  dateKey: string,
  taskId: string,
  updater: (task: DailyTask) => DailyTask,
): StorageMeta {
  return updateModeProgress(meta, modeId, dateKey, (progress) => ({
    ...progress,
    tasks: progress.tasks.map((task) => (task.taskId === taskId ? updater(task) : task)),
  }))
}

export function appendProgressNote(meta: StorageMeta, modeId: DailyModeId, dateKey: string, note: string): StorageMeta {
  return updateModeProgress(meta, modeId, dateKey, (progress) => ({
    ...progress,
    notes: note,
  }))
}

export function upsertMistake(meta: StorageMeta, item: MistakeItem): StorageMeta {
  const exists = meta.mistakes.some((entry) => entry.id === item.id)
  return {
    ...meta,
    mistakes: exists
      ? meta.mistakes.map((entry) => (entry.id === item.id ? item : entry))
      : [item, ...meta.mistakes],
  }
}

export function updateMistake(
  meta: StorageMeta,
  id: string,
  updater: (item: MistakeItem) => MistakeItem,
): StorageMeta {
  return {
    ...meta,
    mistakes: meta.mistakes.map((item) => (item.id === id ? updater(item) : item)),
  }
}

export function removeMistake(meta: StorageMeta, id: string): StorageMeta {
  return {
    ...meta,
    mistakes: meta.mistakes.filter((item) => item.id !== id),
  }
}

export function getDueMistakes(meta: StorageMeta, dateKey: string): MistakeItem[] {
  return meta.mistakes
    .filter((item) => item.status !== 'fixed' && item.srs.dueDate <= dateKey)
    .sort((a, b) => {
      if (a.srs.dueDate !== b.srs.dueDate) return a.srs.dueDate.localeCompare(b.srs.dueDate)
      return b.severity - a.severity
    })
}

export function updateReminder(
  meta: StorageMeta,
  reminderId: ReminderId,
  updater: (current: StorageMeta['reminders'][ReminderId]) => StorageMeta['reminders'][ReminderId],
): StorageMeta {
  return {
    ...meta,
    reminders: {
      ...meta.reminders,
      [reminderId]: updater(meta.reminders[reminderId]),
    },
  }
}

export function setAutoJumpTodayTask(meta: StorageMeta, enabled: boolean): StorageMeta {
  return {
    ...meta,
    appSettings: {
      ...meta.appSettings,
      autoJumpTodayTask: enabled,
    },
  }
}
