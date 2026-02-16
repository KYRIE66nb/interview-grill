import type { Message, MockInterviewState, MockStage, Session } from '../types'
import { makeId } from '../seed'
import { extractProfileFromFreeform } from './profile'

type BackendTopic = {
  name: string
  prompt: string
}

const BACKEND_TOPICS: BackendTopic[] = [
  {
    name: '订单接口幂等设计',
    prompt:
      '请为创建订单接口设计幂等方案，说明幂等键生成方式、落库策略、并发重复请求处理以及 TTL 清理策略。',
  },
  {
    name: 'MySQL 索引与慢查询诊断',
    prompt:
      '某关键查询从 20ms 退化到 800ms。请完整描述你的排查流程，以及具体索引/SQL 优化动作。',
  },
  {
    name: 'Redis 缓存一致性',
    prompt:
      '请设计高读流量下的缓存 + 数据库一致性方案，并说明脏数据风险、失效时机和兜底策略。',
  },
  {
    name: '并发与锁竞争',
    prompt:
      '服务在高峰期出现锁竞争，请说明你会先看哪些指标，以及会尝试哪些架构调整。',
  },
]

const ALGO_WARMUPS: string[] = [
  '给定数组，返回出现频率最高的前 K 个元素，并说明复杂度与边界条件。',
  '实现 LRU 缓存，并讨论“实现简单度”与“吞吐能力”的取舍。',
  '求和至少为 target 的最短子数组，并解释滑动窗口为何可行（或不可行）。',
  '判断有向图是否存在环，并说明面试中答错时你的排错思路。',
]

function deriveProject(session: Session): { name: string; tech: string[] } {
  const importedSource = session.contextImport?.source
  const seedInput =
    importedSource === 'paste'
      ? session.resumeText.trim()
      : importedSource === 'pdf'
        ? session.contextImport?.path?.trim() || session.pdfPath?.trim() || ''
        : importedSource === 'repo'
          ? session.contextImport?.path?.trim() || session.repoPath?.trim() || ''
          : session.dataSource === 'paste'
            ? session.resumeText.trim()
            : session.dataSource === 'pdf'
              ? session.pdfPath?.trim() ?? ''
              : session.repoPath?.trim() ?? ''

  const profile = extractProfileFromFreeform(seedInput)
  return profile.projects[0] ?? { name: '订单系统', tech: ['Spring Boot', 'MySQL'] }
}

function buildStagePrompts(session: Session, backendTopicIndex: number): { stages: MockStage[]; backendTopic: string } {
  const project = deriveProject(session)
  const backendTopic = BACKEND_TOPICS[backendTopicIndex % BACKEND_TOPICS.length]
  const algoQuestion = ALGO_WARMUPS[(backendTopicIndex + 1) % ALGO_WARMUPS.length]
  const projectTech = project.tech.length ? project.tech.join(', ') : '无'
  const intensity = session.intensity
  const stageTimeHint = intensity >= 8 ? '每题建议 45-60 秒回答。' : intensity <= 3 ? '每题可用 90-120 秒回答。' : '每题建议 60-90 秒回答。'
  const followupHint = intensity >= 8 ? '会追问 2-3 轮并要求量化证据。' : intensity <= 3 ? '追问 1 轮，必要时可先给提示。' : '通常追问 1-2 轮。'

  return {
    stages: [
      {
        id: 'project-deep-dive',
        title: '项目深挖',
        durationMinutes: 6,
        prompt: `请选择你最熟的项目（${project.name}，技术栈：${projectTech}），说明业务目标、架构设计、你的职责、一次棘手故障以及可量化结果。${stageTimeHint}${followupHint}`,
      },
      {
        id: 'backend-fundamentals',
        title: '后端基础',
        durationMinutes: 5,
        prompt: `${backendTopic.prompt}${stageTimeHint}${followupHint}`,
      },
      {
        id: 'algorithm-warmup',
        title: '算法热身',
        durationMinutes: 4,
        prompt: `${algoQuestion}${stageTimeHint}`,
      },
    ],
    backendTopic: backendTopic.name,
  }
}

export function createMockInterview(session: Session, backendTopicCursor: number): { mock: MockInterviewState; nextCursor: number } {
  const { stages, backendTopic } = buildStagePrompts(session, backendTopicCursor)

  return {
    mock: {
      active: true,
      startedAt: Date.now(),
      stageIndex: 0,
      backendTopic,
      stages,
    },
    nextCursor: (backendTopicCursor + 1) % BACKEND_TOPICS.length,
  }
}

export function renderMockIntro(mock: MockInterviewState): string {
  return [
    '模拟面试已开始（腾讯/字节风格）。',
    '总时长：15 分钟，共 3 个阶段。',
    `流程：1) ${mock.stages[0].title}（${mock.stages[0].durationMinutes} 分钟） -> 2) ${mock.stages[1].title}（${mock.stages[1].durationMinutes} 分钟，轮换主题：${mock.backendTopic}） -> 3) ${mock.stages[2].title}（${mock.stages[2].durationMinutes} 分钟）。`,
    '每答完一轮，按 Cmd/Ctrl+Enter 继续。',
  ].join('\n')
}

export function renderStagePrompt(mock: MockInterviewState, stageIndex: number): string {
  const stage = mock.stages[stageIndex]
  if (!stage) return '当前无可用阶段。'
  return [`[阶段 ${stageIndex + 1}/${mock.stages.length}] ${stage.title}（${stage.durationMinutes} 分钟）`, stage.prompt].join('\n')
}

export function createMockKickoffMessages(mock: MockInterviewState): Message[] {
  const now = Date.now()
  return [
    { id: makeId('m'), role: 'assistant', text: renderMockIntro(mock), ts: now },
    { id: makeId('m'), role: 'assistant', text: renderStagePrompt(mock, 0), ts: now + 1 },
  ]
}

export function advanceMockInterview(mock: MockInterviewState): { mock: MockInterviewState; message: Message; completed: boolean } {
  const now = Date.now()
  const nextStage = mock.stageIndex + 1

  if (nextStage >= mock.stages.length) {
    return {
      mock: { ...mock, active: false, stageIndex: mock.stages.length, completedAt: now },
      message: {
        id: makeId('m'),
        role: 'assistant',
        text: '模拟面试已完成。请生成复盘，查看评分、改进项和明日练习计划。',
        ts: now,
      },
      completed: true,
    }
  }

  return {
    mock: { ...mock, stageIndex: nextStage },
    message: {
      id: makeId('m'),
      role: 'assistant',
      text: renderStagePrompt(mock, nextStage),
      ts: now,
    },
    completed: false,
  }
}

export function isMockRunning(session: Session): boolean {
  return Boolean(session.mode === 'mock' && session.mock?.active)
}
