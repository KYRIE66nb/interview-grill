import type { DailyTask, ModeProgress } from '../types'

export type LanqiaoPlanType = 'daily' | 'topic'
export type LanqiaoDifficulty = 'all' | 'easy' | 'medium' | 'hard'

type LanqiaoBankItem = {
  taskId: string
  title: string
  topic: string
  difficulty: Exclude<LanqiaoDifficulty, 'all'>
  keyPoint: string
  source: string
  url?: string
}

const LANQIAO_TOPICS = [
  '数组与前缀和',
  '枚举与模拟',
  '贪心',
  '动态规划',
  '图论基础',
  '字符串',
] as const

export const LANQIAO_TOPIC_OPTIONS = [...LANQIAO_TOPICS]

const BANK: LanqiaoBankItem[] = [
  { taskId: 'LQ-001', title: '连续区间统计', topic: '数组与前缀和', difficulty: 'easy', keyPoint: '前缀和 + 双指针', source: '蓝桥杯真题改编', url: 'https://www.lanqiao.cn/problems/19709/learning/' },
  { taskId: 'LQ-002', title: '区间最值差', topic: '数组与前缀和', difficulty: 'medium', keyPoint: '单调队列', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/7936/learning/' },
  { taskId: 'LQ-003', title: '子数组和为 K', topic: '数组与前缀和', difficulty: 'medium', keyPoint: '前缀和 + 哈希计数', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/12043/learning/' },
  { taskId: 'LQ-004', title: '数字翻转模拟', topic: '枚举与模拟', difficulty: 'easy', keyPoint: '按位处理边界', source: '蓝桥杯真题改编', url: 'https://www.lanqiao.cn/problems/8147/learning/' },
  { taskId: 'LQ-005', title: '路径枚举校验', topic: '枚举与模拟', difficulty: 'medium', keyPoint: '状态压缩 + 剪枝', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/4177/learning/' },
  { taskId: 'LQ-006', title: '日期递推', topic: '枚举与模拟', difficulty: 'easy', keyPoint: '闰年与月天数判断', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/1452/learning/' },
  { taskId: 'LQ-007', title: '最少加油次数', topic: '贪心', difficulty: 'hard', keyPoint: '优先队列 + 贪心决策', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/4389/learning/' },
  { taskId: 'LQ-008', title: '区间覆盖最少点', topic: '贪心', difficulty: 'medium', keyPoint: '按右端点排序', source: '蓝桥杯真题改编', url: 'https://www.lanqiao.cn/problems/18427/learning/' },
  { taskId: 'LQ-009', title: '任务调度收益', topic: '贪心', difficulty: 'hard', keyPoint: '截止时间排序 + 小根堆', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/4510/learning/' },
  { taskId: 'LQ-010', title: '楼梯方案数', topic: '动态规划', difficulty: 'easy', keyPoint: '一维 DP 递推', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/806/learning/' },
  { taskId: 'LQ-011', title: '背包价值最大化', topic: '动态规划', difficulty: 'medium', keyPoint: '01 背包状态转移', source: '蓝桥杯真题改编', url: 'https://www.lanqiao.cn/problems/3929/learning/' },
  { taskId: 'LQ-012', title: '区间 DP 合并石子', topic: '动态规划', difficulty: 'hard', keyPoint: '区间划分 + 枚举断点', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/4437/learning/' },
  { taskId: 'LQ-013', title: '最短路模板题', topic: '图论基础', difficulty: 'easy', keyPoint: 'Dijkstra 模板', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/1135/learning/' },
  { taskId: 'LQ-014', title: '最小生成树', topic: '图论基础', difficulty: 'medium', keyPoint: 'Kruskal 并查集', source: '蓝桥杯真题改编', url: 'https://www.lanqiao.cn/problems/98/learning/' },
  { taskId: 'LQ-015', title: '拓扑排序判环', topic: '图论基础', difficulty: 'medium', keyPoint: '入度队列', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/5724/learning/' },
  { taskId: 'LQ-016', title: '子串匹配计数', topic: '字符串', difficulty: 'easy', keyPoint: '滑动窗口', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/2406/learning/' },
  { taskId: 'LQ-017', title: '最短回文补全', topic: '字符串', difficulty: 'medium', keyPoint: 'KMP 前缀函数', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/3901/learning/' },
  { taskId: 'LQ-018', title: '最小表示法', topic: '字符串', difficulty: 'hard', keyPoint: '双指针最小循环同构', source: '蓝桥杯真题改编', url: 'https://www.lanqiao.cn/problems/3918/learning/' },
  { taskId: 'LQ-019', title: '矩阵路径计数', topic: '动态规划', difficulty: 'easy', keyPoint: '二维 DP', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/3902/learning/' },
  { taskId: 'LQ-020', title: '区间贪心选点', topic: '贪心', difficulty: 'easy', keyPoint: '排序 + 末端选择', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/4765/learning/' },
  { taskId: 'LQ-021', title: '模拟排队系统', topic: '枚举与模拟', difficulty: 'medium', keyPoint: '事件驱动模拟', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/3758/learning/' },
  { taskId: 'LQ-022', title: '树上最远点', topic: '图论基础', difficulty: 'hard', keyPoint: '树形 DP / 两次 BFS', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/3845/learning/' },
  { taskId: 'LQ-023', title: '字符串压缩还原', topic: '字符串', difficulty: 'medium', keyPoint: '栈 + 解析', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/3897/learning/' },
  { taskId: 'LQ-024', title: '子序列最优值', topic: '动态规划', difficulty: 'hard', keyPoint: '状态设计与滚动数组', source: '蓝桥杯训练', url: 'https://www.lanqiao.cn/problems/4180/learning/' },
]

function buildLanqiaoSearchUrl(item: LanqiaoBankItem): string {
  return `https://www.lanqiao.cn/problems/?keyword=${encodeURIComponent(item.title)}`
}

const URL_BY_TASK_ID = Object.fromEntries(
  BANK.map((item) => [item.taskId, item.url ?? buildLanqiaoSearchUrl(item)]),
) as Record<string, string>

export function getLanqiaoTaskUrl(task: { taskId: string; title: string; url?: string }): string {
  if (task.url && task.url.trim()) return task.url
  if (URL_BY_TASK_ID[task.taskId]) return URL_BY_TASK_ID[task.taskId]
  return `https://www.lanqiao.cn/problems/?keyword=${encodeURIComponent(task.title)}`
}

function hashText(input: string): number {
  let hash = 5381
  for (const ch of input) {
    hash = (hash * 33) ^ ch.charCodeAt(0)
  }
  return Math.abs(hash >>> 0)
}

function pickDeterministic<T>(items: T[], count: number, seedText: string): T[] {
  if (items.length === 0) return []
  const seed = hashText(seedText)
  const step = Math.max(1, (seed % (items.length - 1 || 1)) + 1)
  let cursor = seed % items.length
  const used = new Set<number>()
  const picked: T[] = []

  while (picked.length < Math.min(count, items.length)) {
    if (!used.has(cursor)) {
      used.add(cursor)
      picked.push(items[cursor])
    }
    cursor = (cursor + step) % items.length
  }

  return picked
}

function passDifficulty(item: LanqiaoBankItem, difficulty: LanqiaoDifficulty): boolean {
  if (difficulty === 'all') return true
  return item.difficulty === difficulty
}

function toTask(item: LanqiaoBankItem, previousTask?: DailyTask): DailyTask {
  return {
    taskId: item.taskId,
    title: item.title,
    difficulty: item.difficulty,
    topic: item.topic,
    url: item.url ?? getLanqiaoTaskUrl({ taskId: item.taskId, title: item.title }),
    status: previousTask?.status ?? 'todo',
    note: previousTask?.note ?? `关键点：${item.keyPoint}；来源：${item.source}`,
    review: previousTask?.review ?? {
      thinking: '',
      pitfall: '',
      complexity: '',
      template: '',
    },
  }
}

export function generateLanqiaoDailyProgress(params: {
  dateKey: string
  planType: LanqiaoPlanType
  topic: string
  difficulty: LanqiaoDifficulty
  existing?: ModeProgress | null
}): ModeProgress {
  const filtered = BANK.filter((item) => passDifficulty(item, params.difficulty))
  const scoped = params.planType === 'topic' ? filtered.filter((item) => item.topic === params.topic) : filtered
  const finalPool = scoped.length > 0 ? scoped : filtered
  const taskCount = params.planType === 'topic' ? 3 : 2
  const picked = pickDeterministic(finalPool, taskCount, `${params.dateKey}:${params.planType}:${params.topic}:${params.difficulty}`)
  const previousById = new Map((params.existing?.tasks ?? []).map((task) => [task.taskId, task]))
  const tasks = picked.map((item) => toTask(item, previousById.get(item.taskId)))
  const doneCount = tasks.filter((task) => task.status === 'done').length

  return {
    modeId: 'lanqiao',
    dateKey: params.dateKey,
    sourceId: 'lanqiao-built-in',
    sourceTitle: '蓝桥杯内置题库',
    generatedAt: Date.now(),
    updatedAt: Date.now(),
    totalCount: tasks.length,
    doneCount,
    notes: params.existing?.notes ?? '',
    planType: params.planType,
    topic: params.topic,
    difficulty: params.difficulty,
    tasks,
  }
}

function buildTomorrowPlan(progress: ModeProgress): string[] {
  const doneAll = progress.doneCount >= progress.totalCount && progress.totalCount > 0
  if (doneAll) {
    return [
      '明天保持同主题再刷 1 题，专注把代码写得更短更稳。',
      '把今天的模板提炼成 10 行以内伪代码。',
      '限时 35 分钟重做最有价值的一题。',
    ]
  }
  return [
    '先补完今日未完成题，再做 1 题同标签变体。',
    '每题完成后写出复杂度与边界条件，形成固定答题模板。',
    '将最易错步骤做成 3 条检查清单，提交前逐条确认。',
  ]
}

export function renderLanqiaoMarkdown(progress: ModeProgress): string {
  const lines: string[] = []
  const tomorrowPlan = buildTomorrowPlan(progress)

  lines.push(`# 蓝桥杯刷题 ${progress.dateKey}`)
  lines.push('')
  lines.push('## 今日题目清单')
  lines.push(`- 训练模式：${progress.planType === 'topic' ? '专题训练' : '每日 1-2 题'}`)
  lines.push(`- 主题：${progress.topic ?? '综合'}`)
  lines.push(`- 难度：${progress.difficulty ?? 'all'}`)
  lines.push(`- 完成：${progress.doneCount}/${progress.totalCount}`)
  if (progress.notes.trim()) {
    lines.push(`- 备注：${progress.notes.trim()}`)
  }
  lines.push('')

  progress.tasks.forEach((task, index) => {
    lines.push(`${index + 1}. ${task.taskId} ${task.title}（${task.topic ?? '综合'} / ${task.difficulty}）`)
    lines.push(`   - 链接：${getLanqiaoTaskUrl(task)}`)
    lines.push(`   - 状态：${task.status === 'done' ? '已完成' : '未完成'}`)
    lines.push(`   - 题目备注：${task.note.trim() || '无'}`)
  })

  lines.push('')
  lines.push('## 每题复盘卡')
  progress.tasks.forEach((task, index) => {
    lines.push(`### ${index + 1}. ${task.taskId} ${task.title}`)
    lines.push(`- 思路：${task.review.thinking.trim() || '待补充'}`)
    lines.push(`- 坑点：${task.review.pitfall.trim() || '待补充'}`)
    lines.push(`- 复杂度：${task.review.complexity.trim() || '待补充'}`)
    lines.push(`- 可复用模板：${task.review.template.trim() || '待补充'}`)
    lines.push('')
  })

  lines.push('## 明日计划')
  tomorrowPlan.slice(0, 3).forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`)
  })

  return lines.join('\n')
}
