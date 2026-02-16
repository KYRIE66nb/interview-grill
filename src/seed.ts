import type { Mode, Session, StorageMeta } from './types'

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function newStorageMeta(): StorageMeta {
  return {
    backendTopicCursor: 0,
    dailyLesson: {
      topicOverride: '',
      level: 'L0',
      completedByDate: {},
    },
    dailyProgress: {
      luogu: {},
      lanqiao: {},
    },
    mistakes: [],
    reminders: {
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
    },
    appSettings: {
      autoJumpTodayTask: true,
    },
  }
}

function modeLabel(mode: Mode) {
  if (mode === 'mock') return '模拟面试'
  if (mode === 'drill') return '专项快练'
  if (mode === 'luogu') return '洛谷每日题单'
  if (mode === 'lanqiao') return '蓝桥杯刷题'
  return '自由问答'
}

function defaultSessionIntro(mode: Mode): string {
  if (mode === 'luogu') {
    return '洛谷每日题单模式已就绪。点击“生成今日题单”开始，完成后可导出 Markdown。'
  }
  if (mode === 'lanqiao') {
    return '蓝桥杯刷题模式已就绪。先选每日/专题训练，再生成今日题目并填写复盘卡。'
  }
  return '先选择模式，再粘贴简历/项目上下文，然后开始。模拟面试模式会运行 15 分钟腾讯/字节风格流程。'
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
    contextImport: null,
    modeConfig: {
      luoguSourceId: 'luogu-default',
      lanqiaoPlanType: 'daily',
      lanqiaoTopic: '数组与前缀和',
      lanqiaoDifficulty: 'all',
    },
    messages: [
      {
        id: makeId('m'),
        role: 'assistant',
        text: defaultSessionIntro(mode),
        ts: now,
      },
    ],
    reviewNotes: '',
    mock: null,
    reviewReport: null,
  }
}
