import type { DailyTask, ModeProgress } from '../types'

type LuoguBankItem = {
  taskId: string
  title: string
  difficulty: string
  url: string
}

export type LuoguSource = {
  id: string
  title: string
  description: string
  items: LuoguBankItem[]
}

const LUOGU_DEFAULT_ITEMS: LuoguBankItem[] = [
  { taskId: 'P1001', title: 'A+B Problem', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P1001' },
  { taskId: 'P1008', title: '三连击', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P1008' },
  { taskId: 'P1014', title: 'Cantor 表', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P1014' },
  { taskId: 'P1035', title: '级数求和', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P1035' },
  { taskId: 'P1046', title: '陶陶摘苹果', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P1046' },
  { taskId: 'P1055', title: 'ISBN 号码', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P1055' },
  { taskId: 'P1089', title: '津津的储蓄计划', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P1089' },
  { taskId: 'P1102', title: 'A-B 数对', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P1102' },
  { taskId: 'P1125', title: '笨小猴', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P1125' },
  { taskId: 'P1428', title: '小鱼比可爱', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P1428' },
  { taskId: 'P1614', title: '爱与愁的心痛', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P1614' },
  { taskId: 'P1909', title: '买铅笔', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P1909' },
  { taskId: 'P2141', title: '珠心算测验', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P2141' },
  { taskId: 'P2415', title: '集合求和', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P2415' },
  { taskId: 'P2670', title: '扫雷游戏', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P2670' },
  { taskId: 'P2911', title: 'Bovine Bones G', difficulty: '普及-', url: 'https://www.luogu.com.cn/problem/P2911' },
  { taskId: 'P5733', title: '自动修正', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P5733' },
  { taskId: 'P5727', title: '冰雹猜想', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P5727' },
  { taskId: 'P5743', title: '猴子吃桃', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P5743' },
  { taskId: 'P1307', title: '数字反转', difficulty: '入门', url: 'https://www.luogu.com.cn/problem/P1307' },
]

export const LUOGU_SOURCES: LuoguSource[] = [
  {
    id: 'luogu-default',
    title: '洛谷经典入门题单（内置）',
    description: '内置 20 道常见入门/普及题，每天固定抽取 5 题。',
    items: LUOGU_DEFAULT_ITEMS,
  },
]

function hashText(input: string): number {
  let hash = 2166136261
  for (const ch of input) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

function pickDeterministic<T>(items: T[], count: number, seedText: string): T[] {
  if (items.length === 0) return []
  const seed = hashText(seedText)
  const step = Math.max(1, (seed % (items.length - 1 || 1)) + 1)
  let cursor = seed % items.length
  const picked: T[] = []
  const used = new Set<number>()

  while (picked.length < Math.min(count, items.length)) {
    if (!used.has(cursor)) {
      used.add(cursor)
      picked.push(items[cursor])
    }
    cursor = (cursor + step) % items.length
  }

  return picked
}

function toTask(item: LuoguBankItem, previousTask?: DailyTask): DailyTask {
  return {
    taskId: item.taskId,
    title: item.title,
    difficulty: item.difficulty,
    url: item.url,
    status: previousTask?.status ?? 'todo',
    note: previousTask?.note ?? '',
    review: previousTask?.review ?? {
      thinking: '',
      pitfall: '',
      complexity: '',
      template: '',
    },
  }
}

export function generateLuoguDailyProgress(params: {
  dateKey: string
  sourceId: string
  existing?: ModeProgress | null
  taskCount?: number
}): ModeProgress {
  const source = LUOGU_SOURCES.find((entry) => entry.id === params.sourceId) ?? LUOGU_SOURCES[0]
  const selected = pickDeterministic(source.items, params.taskCount ?? 5, `${params.dateKey}:${source.id}`)
  const previousById = new Map((params.existing?.tasks ?? []).map((task) => [task.taskId, task]))
  const tasks = selected.map((item) => toTask(item, previousById.get(item.taskId)))
  const doneCount = tasks.filter((task) => task.status === 'done').length

  return {
    modeId: 'luogu',
    dateKey: params.dateKey,
    sourceId: source.id,
    sourceTitle: source.title,
    generatedAt: Date.now(),
    updatedAt: Date.now(),
    totalCount: tasks.length,
    doneCount,
    notes: params.existing?.notes ?? '',
    tasks,
  }
}

function buildTomorrowPlan(progress: ModeProgress): string[] {
  const remain = progress.totalCount - progress.doneCount
  if (remain <= 0) {
    return [
      '继续保持 5 题节奏，优先选择一道稍高难度题做突破。',
      '复盘今天最慢的一题，提炼一个可复用模板。',
      '用 10 分钟回顾易错边界（空输入/大数据范围/重复元素）。',
    ]
  }
  if (progress.doneCount === 0) {
    return [
      '明天先做 2 题入门，目标是在 45 分钟内写完并过样例。',
      '每题先写 3 行思路，再动手编码，避免卡在实现细节。',
      '完成后至少写 1 条“为什么超时/WA”的错因。',
    ]
  }
  return [
    `优先完成今天剩余 ${remain} 题，并用 20 分钟补一题同标签练习。`,
    '每题提交后记录一句“最容易错在哪”，形成个人错题清单。',
    '复盘一题 AC 代码，尝试写出更简洁的实现版本。',
  ]
}

export function renderLuoguMarkdown(progress: ModeProgress): string {
  const lines: string[] = []
  const tomorrowPlan = buildTomorrowPlan(progress)

  lines.push(`# 洛谷每日题单 ${progress.dateKey}`)
  lines.push('')
  lines.push('## 今日目标')
  lines.push(`- 来源：${progress.sourceTitle}`)
  lines.push(`- 目标题数：${progress.totalCount} 题`)
  lines.push(`- 完成情况：完成 ${progress.doneCount}/${progress.totalCount}`)
  if (progress.notes.trim()) {
    lines.push(`- 今日备注：${progress.notes.trim()}`)
  }
  lines.push('')
  lines.push('## 每日题目')

  progress.tasks.forEach((task, index) => {
    const state = task.status === 'done' ? '已完成' : '未完成'
    const link = task.url ? `[${task.taskId}](${task.url})` : task.taskId
    lines.push(`${index + 1}. ${link} ${task.title}（${task.difficulty}）`)
    lines.push(`   - 状态：${state}`)
    lines.push(`   - 备注：${task.note.trim() || '无'}`)
  })

  lines.push('')
  lines.push('## 明日计划')
  tomorrowPlan.slice(0, 3).forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`)
  })

  return lines.join('\n')
}
