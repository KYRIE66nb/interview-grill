import type { DailyModeId, DailyTask, MistakeItem, ReminderId, ModeProgress, StorageMeta } from '../types'
import {
  appendProgressNote,
  getDueMistakes,
  getModeProgress,
  removeMistake,
  setAutoJumpTodayTask,
  setModeProgress,
  updateMistake,
  updateReminder,
  updateTaskInProgress,
  upsertMistake,
} from './schemas'

export function getDailyProgress(meta: StorageMeta, modeId: DailyModeId, dateKey: string): ModeProgress | null {
  return getModeProgress(meta, modeId, dateKey)
}

export function saveDailyProgress(meta: StorageMeta, progress: ModeProgress): StorageMeta {
  return setModeProgress(meta, progress)
}

export function patchDailyTask(
  meta: StorageMeta,
  modeId: DailyModeId,
  dateKey: string,
  taskId: string,
  updater: (task: DailyTask) => DailyTask,
): StorageMeta {
  return updateTaskInProgress(meta, modeId, dateKey, taskId, updater)
}

export function saveDailyNote(meta: StorageMeta, modeId: DailyModeId, dateKey: string, note: string): StorageMeta {
  return appendProgressNote(meta, modeId, dateKey, note)
}

export function addOrUpdateMistake(meta: StorageMeta, item: MistakeItem): StorageMeta {
  return upsertMistake(meta, item)
}

export function patchMistake(meta: StorageMeta, id: string, updater: (item: MistakeItem) => MistakeItem): StorageMeta {
  return updateMistake(meta, id, updater)
}

export function deleteMistake(meta: StorageMeta, id: string): StorageMeta {
  return removeMistake(meta, id)
}

export function listDueMistakes(meta: StorageMeta, dateKey: string): MistakeItem[] {
  return getDueMistakes(meta, dateKey)
}

export function patchReminder(
  meta: StorageMeta,
  reminderId: ReminderId,
  updater: (current: StorageMeta['reminders'][ReminderId]) => StorageMeta['reminders'][ReminderId],
): StorageMeta {
  return updateReminder(meta, reminderId, updater)
}

export function setAutoJump(meta: StorageMeta, enabled: boolean): StorageMeta {
  return setAutoJumpTodayTask(meta, enabled)
}
