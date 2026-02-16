import type { ModeDefinition, ModeRuntimeState } from './types'
import {
  InterviewEntryView,
  InterviewMainView,
  LanqiaoEntryView,
  LanqiaoMainView,
  LuoguEntryView,
  LuoguMainView,
} from './views'

async function exportInterview(runtime: ModeRuntimeState) {
  await runtime.exporters.interview()
}

async function exportLuogu(runtime: ModeRuntimeState) {
  await runtime.exporters.luogu()
}

async function exportLanqiao(runtime: ModeRuntimeState) {
  await runtime.exporters.lanqiao()
}

export const MODES: ModeDefinition[] = [
  {
    id: 'mock',
    title: '模拟面试（腾讯/字节风格）',
    shortDesc: '15 分钟结构化流程，逐阶段推进。',
    icon: '🎯',
    layout: 'interview',
    entryComponent: InterviewEntryView,
    mainComponent: InterviewMainView,
    exportHandler: exportInterview,
    defaultHotkeys: ['Cmd/Ctrl+Enter', 'Shift+Cmd/Ctrl+Enter', 'Cmd/Ctrl+S'],
  },
  {
    id: 'drill',
    title: '专项快练',
    shortDesc: '按强度持续追问，聚焦短板。',
    icon: '⚡',
    layout: 'interview',
    entryComponent: InterviewEntryView,
    mainComponent: InterviewMainView,
    exportHandler: exportInterview,
    defaultHotkeys: ['Cmd/Ctrl+Enter', 'Cmd/Ctrl+S'],
  },
  {
    id: 'chat',
    title: '自由问答',
    shortDesc: '开放式打磨答案与表达。',
    icon: '💬',
    layout: 'interview',
    entryComponent: InterviewEntryView,
    mainComponent: InterviewMainView,
    exportHandler: exportInterview,
    defaultHotkeys: ['Cmd/Ctrl+S'],
  },
  {
    id: 'luogu',
    title: '洛谷每日题单',
    shortDesc: '每日固定抽题，勾选完成并导出。',
    icon: '📚',
    layout: 'daily',
    entryComponent: LuoguEntryView,
    mainComponent: LuoguMainView,
    exportHandler: exportLuogu,
    defaultHotkeys: ['Cmd/Ctrl+Enter', 'Cmd/Ctrl+S'],
  },
  {
    id: 'lanqiao',
    title: '蓝桥杯刷题',
    shortDesc: '每日/专题训练 + 复盘卡导出。',
    icon: '🏁',
    layout: 'daily',
    entryComponent: LanqiaoEntryView,
    mainComponent: LanqiaoMainView,
    exportHandler: exportLanqiao,
    defaultHotkeys: ['Cmd/Ctrl+Enter', 'Cmd/Ctrl+S'],
  },
]

export const MODE_MAP = Object.fromEntries(MODES.map((mode) => [mode.id, mode])) as Record<ModeDefinition['id'], ModeDefinition>
